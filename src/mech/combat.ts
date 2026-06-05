// Mech Combat — tactical battle simulation (v2).
//
// REWRITE NOTES (v1.10.79): the v1 AI was literally "fire on cooldown
// if target in range." Bots stood still and traded shots. v2 gives
// each bot a decision-making FSM that commits to a state for 0.5-1.2s
// (no per-frame jitter), with state choice weighted by personality,
// distance, own HP/energy, and the opponent's damaged parts.
//
// What's new vs v1:
//   - AI FSM: approach / kite / trade / reposition / retreat / stall
//   - Preferred range computed from each bot's weapon loadout +
//     personality bias (aggressive closes, snipe holds max range)
//   - Per-part damage tracking (chest/leftArm/rightArm/legs/head)
//   - Target-zone selection: AI bias toward damaged parts + personality
//     (aggressive aims arms to disable weapons, snipe aims head)
//   - Part-destruction consequences: arm broken = weapon gone; legs
//     broken = speed penalty; head broken = accuracy penalty
//   - State-change log events the UI shows in the attack feed
//   - Persistent damage support: simulateBattle accepts startHpFrac
//     so the repair bay can pull in chip-damage from prior fights.
//
// What stayed the same (backward-compat):
//   - simulateBattle(player, enemy) signature + BattleResult shape
//   - 30 sim ticks/sec, MAX_T = 60s
//   - Energy regen = maxEnergy/5 per second
//   - Damage = weapon.damage × (1 + power/200) × (1 - armor/400) × variance
//     (multiplied now by zone targeting bonus + accuracy roll)
//   - Frame recording rules

import type { Bot, Weapon, SlotId } from "./types";

// ── Public types ─────────────────────────────────────────────────────

export interface BattleSide {
  bot: Bot;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  x: number;
  leftCd: number;
  rightCd: number;
  knockedOut: boolean;
  /** Damage accumulated per body zone (sum may exceed hp loss because of
   *  zone HP caps + multi-hit lifetime damage). */
  partDamage: Partial<Record<SlotId, number>>;
  /** Zones that have crossed their destruction threshold. */
  disabled: SlotId[];
  /** Negative-effect modifiers applied by part destruction. */
  speedPenalty: number;       // 0..1, subtracted from movement
  accuracyPenalty: number;    // 0..1, miss chance per shot
  /** Current AI state — exposed for the UI label / debug. */
  aiState: AIState;
}

export type AIState = "approach" | "kite" | "trade" | "reposition" | "retreat" | "stall";

export type BattleEvent =
  | { kind: "shot"; from: "left" | "right"; weapon: Weapon; hit: boolean; damage: number;
      /** Body zone aimed at. */                zone?: SlotId }
  | { kind: "ko"; side: "left" | "right" }
  | { kind: "partDown"; side: "left" | "right"; zone: SlotId; consequence: string }
  | { kind: "ai"; side: "left" | "right"; state: AIState; label: string }
  | { kind: "log"; text: string };

export interface BattleFrame {
  t: number;
  left: BattleSide;
  right: BattleSide;
  events: BattleEvent[];
}

export interface BattleResult {
  winner: "left" | "right";
  durationMs: number;
  frames: BattleFrame[];
  leftHpFrac: number;
  rightHpFrac: number;
  summary: string;
}

// ── AI brain ─────────────────────────────────────────────────────────

interface AIBrain {
  state: AIState;
  /** Sim-time t at which the current state expires (next decision rolls). */
  stateUntil: number;
  /** Preferred fight distance, derived from weapon range + personality. */
  preferredRange: number;
  /** HP fraction below which we'd rather retreat than trade. */
  retreatThreshold: number;
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

/** Weapons drive preferred range; personality tilts it. */
function computePreferredRange(bot: Bot): number {
  const wpns: Weapon[] = [];
  if (bot.weapons.left)  wpns.push(bot.weapons.left);
  if (bot.weapons.right) wpns.push(bot.weapons.right);
  if (wpns.length === 0) return 80; // pure melee
  const totalDmg = wpns.reduce((s, w) => s + w.damage, 0);
  const weighted = wpns.reduce((s, w) => s + w.range * w.damage, 0) / Math.max(1, totalDmg);
  const personalityMult: Record<Bot["personality"], number> = {
    aggressive: 0.55,  // closes hard
    balanced:   0.75,
    defensive:  0.92,
    snipe:      1.00,  // holds max range
  };
  return Math.max(60, weighted * personalityMult[bot.personality]);
}

function computeRetreatThreshold(bot: Bot): number {
  return ({ aggressive: 0.10, balanced: 0.22, defensive: 0.38, snipe: 0.50 } as Record<Bot["personality"], number>)[bot.personality];
}

function makeBrain(bot: Bot): AIBrain {
  return {
    state: "approach",
    stateUntil: 0,
    preferredRange: computePreferredRange(bot),
    retreatThreshold: computeRetreatThreshold(bot),
  };
}

const STATE_LABELS: Record<AIState, string> = {
  approach:   "closing in",
  kite:       "backing off",
  trade:      "trading shots",
  reposition: "strafing",
  retreat:    "retreating",
  stall:      "regrouping",
};

function pickNewState(me: BattleSide, them: BattleSide, brain: AIBrain): AIState {
  const dist = Math.abs(me.x - them.x);
  const hpFrac = me.hp / me.maxHp;
  const energyFrac = me.energy / Math.max(1, me.maxEnergy);
  const pr = brain.preferredRange;

  // Critical HP — bias retreat when in fire range.
  if (hpFrac <= brain.retreatThreshold && dist < pr * 1.4) return "retreat";

  // Genuinely depleted — brief stall to recover (don't keep approaching
  // empty-handed). Threshold tight so bots fight down to near-empty.
  if (energyFrac < 0.08) return "stall";

  // Distance bands relative to preferred range.
  if (dist > pr * 1.25) return "approach";
  if (dist < pr * 0.55) return "kite";

  // In comfortable range — usually trade, sometimes strafe.
  // Aggressive bots trade more; defensive/snipe strafe more.
  const strafeChance = me.bot.personality === "aggressive" ? 0.08
                     : me.bot.personality === "defensive"  ? 0.25
                     : me.bot.personality === "snipe"      ? 0.30
                     : 0.15;
  if (Math.random() < strafeChance) return "reposition";
  return "trade";
}

/** Drive movement based on current AI state. */
function applyMovement(me: BattleSide, them: BattleSide, brain: AIBrain, dt: number, t: number) {
  // Base speed: speed stat (typically 4-20) + a floor so bots aren't immobile.
  // Speed-penalty applied if legs are disabled.
  const base = Math.max(15, (me.bot.derived.speed ?? 0) * 5 + 18);
  const speed = base * (1 - me.speedPenalty);
  const dirToThem = them.x > me.x ? 1 : -1;
  switch (brain.state) {
    case "approach":
      me.x += dirToThem * speed * dt;
      break;
    case "kite":
      me.x -= dirToThem * speed * 0.85 * dt;
      break;
    case "retreat":
      me.x -= dirToThem * speed * 1.15 * dt;
      break;
    case "reposition":
      // Strafe oscillation — small back-and-forth so position varies
      // without abandoning range.
      me.x += Math.sin(t * 5 + me.x * 0.01) * speed * 0.6 * dt;
      break;
    case "stall":
      me.x -= dirToThem * speed * 0.25 * dt; // small back-shuffle
      break;
    case "trade":
      // Hold ground — tiny float to feel alive
      me.x += Math.sin(t * 3) * 4 * dt;
      break;
  }
  me.x = Math.max(20, Math.min(580, me.x));
}

// ── Target zone selection ────────────────────────────────────────────

const ZONE_DAMAGE_MULT: Record<SlotId, number> = {
  chest:    1.00,
  head:     1.18,
  leftArm:  0.92,
  rightArm: 0.92,
  legs:     0.90,
};

/** What fraction of maxHp it takes to "destroy" each zone. Past this,
 *  the zone is disabled and consequences trigger. */
const ZONE_HP_CAP: Record<SlotId, number> = {
  chest:    0.55,   // chest takes huge damage before destruction
  head:     0.20,
  leftArm:  0.22,
  rightArm: 0.22,
  legs:     0.28,
};

function pickTargetZone(attacker: Bot, defender: BattleSide): SlotId {
  // 1) Heavily prefer zones already damaged ≥30% of cap — exploit wounds.
  //    The 60% probability gate keeps it from becoming deterministic.
  const candidates: SlotId[] = ["chest", "leftArm", "rightArm", "legs", "head"];
  const wounded = candidates
    .filter(z => !defender.disabled.includes(z))
    .map(z => {
      const d = defender.partDamage[z] ?? 0;
      const cap = ZONE_HP_CAP[z] * defender.maxHp;
      return { z, frac: d / cap };
    })
    .filter(x => x.frac > 0.3)
    .sort((a, b) => b.frac - a.frac);
  if (wounded.length > 0 && Math.random() < 0.6) return wounded[0].z;

  // 2) Personality-driven default targeting.
  switch (attacker.personality) {
    case "aggressive": {
      // Mix chest with arms to disable weapons.
      const r = Math.random();
      if (r < 0.45) return "chest";
      if (r < 0.85) return Math.random() < 0.5 ? "leftArm" : "rightArm";
      return "legs";
    }
    case "defensive":
      // Reliable chest damage; occasional opportunistic legs.
      return Math.random() < 0.78 ? "chest" : "legs";
    case "snipe":
      // Headshot specialist with chest fallback.
      return Math.random() < 0.38 ? "head" : "chest";
    case "balanced":
    default: {
      const r = Math.random();
      if (r < 0.50) return "chest";
      if (r < 0.72) return Math.random() < 0.5 ? "leftArm" : "rightArm";
      if (r < 0.88) return "legs";
      return "head";
    }
  }
}

// ── Side construction ────────────────────────────────────────────────

function mkSide(bot: Bot, startX: number, startHpFrac: number): BattleSide {
  const hp = Math.max(50, bot.derived.hp);
  const energy = Math.max(10, bot.derived.energy);
  return {
    // Deep-ish clone of bot so we can null out destroyed-arm weapons
    // without mutating the source.
    bot: { ...bot, weapons: { ...bot.weapons } },
    hp: Math.round(hp * startHpFrac),
    maxHp: hp,
    energy, maxEnergy: energy,
    x: startX,
    leftCd: 0, rightCd: 0,
    knockedOut: false,
    partDamage: {},
    disabled: [],
    speedPenalty: 0,
    accuracyPenalty: 0,
    aiState: "approach",
  };
}

// ── Fire one weapon ──────────────────────────────────────────────────

/** Returns true if the weapon actually fired (energy was sufficient). */
function fireWeapon(
  attacker: BattleSide, defender: BattleSide, weapon: Weapon, side: "left" | "right",
  events: BattleEvent[],
): boolean {
  if (attacker.energy < weapon.energyCost) return false;
  attacker.energy -= weapon.energyCost;

  const distance = Math.abs(attacker.x - defender.x);
  const inRange = distance <= weapon.range;
  if (!inRange) {
    events.push({ kind: "shot", from: side, weapon, hit: false, damage: 0 });
    return true;
  }

  // Head-disabled bots have an accuracy penalty (miss chance).
  if (attacker.accuracyPenalty > 0 && Math.random() < attacker.accuracyPenalty) {
    events.push({ kind: "shot", from: side, weapon, hit: false, damage: 0 });
    return true;
  }

  // Pick a target zone first — UI shows it; damage modifies on it.
  const zone = pickTargetZone(attacker.bot, defender);
  const zoneMult = ZONE_DAMAGE_MULT[zone];

  const power = attacker.bot.derived.power;
  const armor = defender.bot.derived.armor;
  const variance = 0.85 + Math.random() * 0.3;
  const baseDmg = weapon.damage * (1 + power / 200) * (1 - armor / 400) * variance * zoneMult;
  const dmg = Math.max(1, Math.floor(baseDmg));

  defender.hp -= dmg;
  defender.partDamage[zone] = (defender.partDamage[zone] ?? 0) + dmg;
  events.push({ kind: "shot", from: side, weapon, hit: true, damage: dmg, zone });

  // Part destruction check.
  const cap = ZONE_HP_CAP[zone] * defender.maxHp;
  if (!defender.disabled.includes(zone) && (defender.partDamage[zone] ?? 0) >= cap) {
    defender.disabled.push(zone);
    let consequence = "";
    if (zone === "leftArm") {
      consequence = defender.bot.weapons.left
        ? `${defender.bot.name}'s ${defender.bot.weapons.left.name} severed!`
        : `${defender.bot.name}'s left arm crushed.`;
      defender.bot.weapons.left = undefined;
    } else if (zone === "rightArm") {
      consequence = defender.bot.weapons.right
        ? `${defender.bot.name}'s ${defender.bot.weapons.right.name} severed!`
        : `${defender.bot.name}'s right arm crushed.`;
      defender.bot.weapons.right = undefined;
    } else if (zone === "legs") {
      consequence = `${defender.bot.name} hobbled — speed cut.`;
      defender.speedPenalty = Math.max(defender.speedPenalty, 0.55);
    } else if (zone === "head") {
      consequence = `${defender.bot.name} stunned — targeting glitching.`;
      defender.accuracyPenalty = Math.max(defender.accuracyPenalty, 0.30);
    } else if (zone === "chest") {
      consequence = `${defender.bot.name}'s chest cracked — armor failing.`;
      // Already weak; no further consequence beyond the damage.
    }
    events.push({ kind: "partDown", side: side === "left" ? "right" : "left", zone, consequence });
  }
  return true;
}

// ── Main simulation ──────────────────────────────────────────────────

export interface SimOptions {
  /** Start HP as a fraction of maxHp. Defaults to 1.0 (full). Used by
   *  the repair bay if a bot enters a fight already chipped. */
  leftStartHpFrac?: number;
  rightStartHpFrac?: number;
}

export function simulateBattle(playerBot: Bot, enemyBot: Bot, opts: SimOptions = {}): BattleResult {
  const left  = mkSide(playerBot, 100, opts.leftStartHpFrac  ?? 1.0);
  const right = mkSide(enemyBot,  500, opts.rightStartHpFrac ?? 1.0);
  const brains: { left: AIBrain; right: AIBrain } = {
    left:  makeBrain(playerBot),
    right: makeBrain(enemyBot),
  };

  const frames: BattleFrame[] = [];
  const T_STEP = 1 / 30;
  const MAX_T = 60;
  let t = 0;

  frames.push({
    t, left: clone(left), right: clone(right),
    events: [{ kind: "log", text: `${playerBot.name} vs ${enemyBot.name} — FIGHT!` }],
  });

  while (t < MAX_T && !left.knockedOut && !right.knockedOut) {
    const events: BattleEvent[] = [];

    // 1) AI decision for each side (only if state expired).
    for (const [me, them, side, brain] of [
      [left, right, "left",  brains.left]  as const,
      [right, left, "right", brains.right] as const,
    ]) {
      if (t >= brain.stateUntil) {
        const next = pickNewState(me, them, brain);
        const stateChanged = next !== brain.state || brain.stateUntil === 0;
        brain.state = next;
        // Commit for 0.5-1.2s — no per-frame jitter.
        brain.stateUntil = t + 0.5 + Math.random() * 0.7;
        if (stateChanged) {
          me.aiState = next;
          events.push({ kind: "ai", side, state: next, label: STATE_LABELS[next] });
        }
      }
      me.aiState = brain.state;
    }

    // 2) Movement.
    applyMovement(left,  right, brains.left,  T_STEP, t);
    applyMovement(right, left,  brains.right, T_STEP, t);

    // 3) Energy regen.
    left.energy  = Math.min(left.maxEnergy,  left.energy  + left.maxEnergy  / 5 * T_STEP);
    right.energy = Math.min(right.maxEnergy, right.energy + right.maxEnergy / 5 * T_STEP);

    // 4) Cooldowns + weapon fire. Only trade/approach/reposition states
    //    will fire — retreat/stall/kite focus on positioning.
    for (const [me, them, side, brain] of [
      [left, right, "left",  brains.left]  as const,
      [right, left, "right", brains.right] as const,
    ]) {
      me.leftCd  = Math.max(0, me.leftCd  - T_STEP);
      me.rightCd = Math.max(0, me.rightCd - T_STEP);

      // Bots fight while moving — kite/retreat both shoot back over the
      // shoulder. Only `stall` (out of energy) holds fire.
      if (brain.state === "stall") continue;

      if (me.bot.weapons.right && me.rightCd <= 0) {
        if (fireWeapon(me, them, me.bot.weapons.right, side, events)) {
          me.rightCd = 1 / me.bot.weapons.right.fireRate;
        }
      }
      if (me.bot.weapons.left && me.leftCd <= 0) {
        if (fireWeapon(me, them, me.bot.weapons.left, side, events)) {
          me.leftCd = 1 / me.bot.weapons.left.fireRate;
        }
      }
    }

    // 5) KO check.
    if (left.hp  <= 0 && !left.knockedOut)  { left.knockedOut  = true; events.push({ kind: "ko", side: "left"  }); }
    if (right.hp <= 0 && !right.knockedOut) { right.knockedOut = true; events.push({ kind: "ko", side: "right" }); }

    t += T_STEP;
    // Frame recording: every event-bearing tick, plus a heartbeat every 0.1s
    // so the playback engine has smooth motion data.
    if (events.length > 0 || frames.length === 0 || (t - frames[frames.length - 1].t) >= 0.1) {
      frames.push({ t, left: clone(left), right: clone(right), events });
    }
  }

  const winner: "left" | "right" =
    left.knockedOut && !right.knockedOut ? "right" :
    right.knockedOut && !left.knockedOut ? "left" :
    left.hp >= right.hp ? "left" : "right";

  const summary = winner === "left"
    ? `${playerBot.name} KO'd ${enemyBot.name} in ${t.toFixed(1)}s`
    : `${enemyBot.name} dropped ${playerBot.name} in ${t.toFixed(1)}s`;

  return {
    winner, durationMs: t * 1000, frames,
    leftHpFrac:  Math.max(0, left.hp  / left.maxHp),
    rightHpFrac: Math.max(0, right.hp / right.maxHp),
    summary,
  };
}

function clone(s: BattleSide): BattleSide {
  return {
    ...s,
    bot: { ...s.bot, weapons: { ...s.bot.weapons } },
    partDamage: { ...s.partDamage },
    disabled: s.disabled.slice(),
  };
}

// ── Enemy bot generation + matchmaking ───────────────────────────────

import { PARTS, WEAPONS } from "./parts";
import { LEAGUE_INFO, type League } from "./types";
import { assembleBot } from "./store";

const RIVAL_NAMES = [
  "Rust Bandit", "Cleaver Cog", "Ironhide", "Twin Pistons", "Switchblade",
  "Thunder Pup", "Junkyard Jr", "Slag Hammer", "Bolt Hornet", "Scrappy",
  "Hollowpoint", "Tin Reaper", "Last Call", "Sparkjaw", "Mister Cog",
  "Razor Mane", "Quicksilver", "Demolisher", "Tin Witch", "Cogsmith",
];
const RIVAL_PAINTS = ["#fb923c", "#67e8f9", "#a78bfa", "#86efac", "#f87171", "#fbbf24", "#fca5a5"];

export function generateEnemy(league: League, playerBotPower: number): Bot {
  const allowed = league === "rookie" ? ["common"]
                : league === "amateur" ? ["common", "uncommon"]
                : league === "pro" ? ["common", "uncommon", "rare"]
                : ["common", "uncommon", "rare", "legendary"];

  const head    = pick(PARTS.filter(p => p.slot === "head"     && allowed.includes(p.rarity)));
  const leftArm = pick(PARTS.filter(p => p.slot === "leftArm"  && allowed.includes(p.rarity)));
  const rightArm= pick(PARTS.filter(p => p.slot === "rightArm" && allowed.includes(p.rarity)));
  const chest   = pick(PARTS.filter(p => p.slot === "chest"    && allowed.includes(p.rarity)));
  const legs    = pick(PARTS.filter(p => p.slot === "legs"     && allowed.includes(p.rarity)));

  const lWpn = leftArm.weaponMount && Math.random() > 0.2
    ? pick(WEAPONS.filter(w => w.mount === leftArm.weaponMount!.size && allowed.includes(w.tier)))
    : undefined;
  const rWpn = rightArm.weaponMount && Math.random() > 0.15
    ? pick(WEAPONS.filter(w => w.mount === rightArm.weaponMount!.size && allowed.includes(w.tier)))
    : undefined;

  const bot: Bot = {
    id: `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: pick(RIVAL_NAMES),
    paint: pick(RIVAL_PAINTS),
    parts: { head, leftArm, rightArm, chest, legs },
    weapons: { left: lWpn, right: rWpn },
    personality: pick(["aggressive", "defensive", "balanced", "snipe"] as const),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    derived: { armor: 0, weight: 0, power: 0, energy: 0, balance: 0, speed: 0, hp: 0 },
  };
  const assembled = assembleBot(bot);
  const mult = LEAGUE_INFO[league].difficulty;
  assembled.derived.hp    = Math.round(assembled.derived.hp    * mult);
  assembled.derived.armor = Math.round(assembled.derived.armor * mult);
  assembled.derived.power = Math.round(assembled.derived.power * mult);
  void playerBotPower;
  return assembled;
}

/** Fitness score used by matchmaking — rough "how dangerous is this bot?" */
export function botPower(bot: Bot): number {
  const d = bot.derived;
  const wpnDmg = (bot.weapons.left?.damage ?? 0) + (bot.weapons.right?.damage ?? 0);
  return Math.round(d.hp * 0.6 + d.armor * 0.8 + d.power * 1.2 + wpnDmg * 2.5);
}

/** Generate an opponent within ±15% of the player's power band.
 *  Up to 12 attempts, then return the closest of those. */
export function findMatch(playerBot: Bot, league: League): Bot {
  const target = botPower(playerBot);
  const band = target * 0.15;
  let best: Bot | null = null;
  let bestDelta = Infinity;
  for (let i = 0; i < 12; i++) {
    const e = generateEnemy(league, target);
    const d = Math.abs(botPower(e) - target);
    if (d < band) return e;
    if (d < bestDelta) { bestDelta = d; best = e; }
  }
  return best ?? generateEnemy(league, target);
}

/** Pre-fight odds for the matchup screen. Returns {leftPct, rightPct}. */
export function matchupOdds(left: Bot, right: Bot): { leftPct: number; rightPct: number } {
  const pl = botPower(left);
  const pr = botPower(right);
  const total = pl + pr;
  if (total === 0) return { leftPct: 50, rightPct: 50 };
  const leftPct = Math.round((pl / total) * 100);
  return { leftPct, rightPct: 100 - leftPct };
}
