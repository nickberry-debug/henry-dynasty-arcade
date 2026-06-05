// Card Clash — Snap-style match engine.
//
// 3 locations · 6 turns · escalating energy (1→6) · simultaneous reveal
// (engine resolves both players' plays at once at the end of each turn)
// · max 4 cards per location · 2-of-3 wins.
// "Go Bold" doubles the stakes; either player may call, the other may
// fold (retreat) for reduced loss.

import { CARDS, STARTER_DECK_IDS, type CardDef, type Element } from "./cards";
import { pickRandomLocations, type LocationDef, type LocationEffect } from "./locations";

export type PlayerId = "player" | "opponent";

export interface InPlayCard {
  /** Unique runtime id (so duplicates can coexist). */
  uid: string;
  def: CardDef;
  /** Owner of this card. */
  owner: PlayerId;
  /** Effective power after all modifiers. */
  power: number;
  /** Locked power means abilities can't change it. (Twin Blades) */
  lockedPower?: boolean;
  /** Immune flag — cannot be destroyed or have power reduced. (Eternal Guardian) */
  immune?: boolean;
  /** Marked-for-destruction this resolution. */
  toDestroy?: boolean;
}

export interface LocationState {
  loc: LocationDef;
  /** Revealed yet? */
  revealed: boolean;
  /** Cards by owner. */
  cards: { player: InPlayCard[]; opponent: InPlayCard[] };
  /** Cumulative power per owner after resolution. */
  totals: { player: number; opponent: number };
}

export interface PlayerState {
  id: PlayerId;
  deck: string[];          // card ids
  hand: CardDef[];         // drawn cards
  energy: number;
  /** Pending plays — placed face-down, resolved at end of turn. */
  pending: Array<{ cardUid: string; def: CardDef; locationIndex: number }>;
  /** Cards already in play this match (used for "destroyed" replay rules). */
  destroyed: InPlayCard[];
  /** Bonus energy for next turn. */
  bonusEnergyNext: number;
  /** Aura: "you can play 1 more card this game" — counts down. */
  playsRemaining: number;
}

export interface Match {
  turn: number;        // 1..6
  locations: [LocationState, LocationState, LocationState];
  player: PlayerState;
  opponent: PlayerState;
  /** Stakes — 1× normal, 2× after a "Go Bold" call. */
  stakes: number;
  /** Cube ladder — 1 → 2 → 4 → 8. Stakes is the current cube count.
   *  Only set true the turn a snap was called so retreat is locked
   *  for that turn; cleared on next endTurn. */
  playerSnapThisTurn: boolean;
  opponentSnapThisTurn: boolean;
  /** Priority: which player reveals first this turn. Computed at end-of-turn
   *  from location-wins (tiebreak: total power). Turn 1 is random. */
  priority: PlayerId;
  /** Has the player called Bold this match? */
  playerBoldCalled: boolean;
  opponentBoldCalled: boolean;
  /** Last log lines (for the action ticker). */
  log: string[];
  state: "playing" | "ended";
  result: "win" | "loss" | "tie" | "retreatPlayer" | "retreatOpponent" | null;
}

// ── Setup ────────────────────────────────────────────────────────────

export function newMatch(playerDeckIds: string[], opponentDeckIds?: string[]): Match {
  const locs = pickRandomLocations(3);
  const pDeck = shuffle(playerDeckIds);
  const oDeck = shuffle(opponentDeckIds ?? buildAIDeck());
  const player: PlayerState = {
    id: "player", deck: pDeck, hand: drawCards(pDeck, 3), energy: 0,
    pending: [], destroyed: [], bonusEnergyNext: 0, playsRemaining: 999  /* practical infinity that survives JSON round-trips */,
  };
  // Remove drawn cards from deck
  player.deck = player.deck.slice(3);
  const opponent: PlayerState = {
    id: "opponent", deck: oDeck.slice(3), hand: drawCards(oDeck, 3), energy: 0,
    pending: [], destroyed: [], bonusEnergyNext: 0, playsRemaining: 999  /* practical infinity that survives JSON round-trips */,
  };
  return {
    turn: 1,
    locations: [
      makeLoc(locs[0], 1),
      makeLoc(locs[1], 2),
      makeLoc(locs[2], 3),
    ],
    player, opponent,
    stakes: 1,
    playerSnapThisTurn: false, opponentSnapThisTurn: false,
    priority: Math.random() < 0.5 ? "player" : "opponent",
    playerBoldCalled: false, opponentBoldCalled: false,
    log: ["Match begins. Energy = turn number."],
    state: "playing",
    result: null,
  };
}

function makeLoc(loc: LocationDef, revealOnTurn: number): LocationState {
  return {
    loc,
    revealed: revealOnTurn === 1,
    cards: { player: [], opponent: [] },
    totals: { player: 0, opponent: 0 },
  };
}

function drawCards(deckIds: string[], n: number): CardDef[] {
  const out: CardDef[] = [];
  for (let i = 0; i < n && i < deckIds.length; i++) {
    const c = CARDS.find(x => x.id === deckIds[i]);
    if (c) out.push(c);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAIDeck(): string[] {
  // Mix of strong vanilla + a couple of mechanics. Returns ids.
  return [
    "ember_pup", "cliff_pebble", "hex_imp",
    "stone_sentinel", "loyal_hound", "twin_blades",
    "iron_vanguard", "vine_beast", "stormcaller",
    "crystal_titan", "storm_drake",
    "granite_colossus",
  ];
}

// ── Plays ────────────────────────────────────────────────────────────

export function canPlay(state: PlayerState, card: CardDef, locIdx: number, match: Match): { ok: boolean; reason?: string } {
  const loc = match.locations[locIdx];
  if (!loc.revealed) return { ok: false, reason: "Location not revealed yet." };
  const ownSlots = loc.cards[state.id].length + state.pending.filter(p => p.locationIndex === locIdx).length;
  // Honor max-card cap (default 4)
  const cap = loc.loc.effect.kind === "maxCards" ? loc.loc.effect.cap : 4;
  if (ownSlots >= cap) return { ok: false, reason: "Location is full." };
  const effectiveCost = effectiveCardCost(card, locIdx, match, state.id);
  if (effectiveCost > state.energy) return { ok: false, reason: "Not enough energy." };
  if (state.playsRemaining <= 0) return { ok: false, reason: "No plays remaining." };
  return { ok: true };
}

function effectiveCardCost(card: CardDef, locIdx: number, match: Match, owner: PlayerId): number {
  let cost: number = card.cost;
  // Location: Forge → -1 cost
  const eff = match.locations[locIdx].loc.effect;
  if (eff.kind === "costLess") cost = Math.max(0, cost - eff.amount);
  // Frost Monarch (enemy) → +1 cost
  const enemyAt = match.locations[locIdx].cards[owner === "player" ? "opponent" : "player"];
  for (const c of enemyAt) {
    if (c.def.effect?.kind === "auraEnemyHereCostBump") cost += c.def.effect.amount;
  }
  return cost;
}

export function queuePlay(state: PlayerState, cardIdx: number, locIdx: number, match: Match): { ok: boolean; reason?: string } {
  const card = state.hand[cardIdx];
  if (!card) return { ok: false, reason: "Not in hand." };
  const check = canPlay(state, card, locIdx, match);
  if (!check.ok) return check;
  const cost = effectiveCardCost(card, locIdx, match, state.id);
  state.pending.push({ cardUid: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, def: card, locationIndex: locIdx });
  state.hand.splice(cardIdx, 1);
  state.energy -= cost;
  // Only decrement when an aura set a finite limit (Doom Herald). 999 = unbounded.
  if (state.playsRemaining < 999) state.playsRemaining = Math.max(0, state.playsRemaining - 1);
  return { ok: true };
}

export function unqueuePlay(state: PlayerState, pendingIdx: number, match: Match): void {
  const p = state.pending[pendingIdx];
  if (!p) return;
  const cost = effectiveCardCost(p.def, p.locationIndex, match, state.id);
  state.energy += cost;
  state.hand.push(p.def);
  state.pending.splice(pendingIdx, 1);
  if (state.playsRemaining < 999) state.playsRemaining += 1;
}

// ── End-of-turn resolution ───────────────────────────────────────────

// Deep-clone a Match without going through JSON, so we never lose typed
// values to JSON's quirks (Infinity → null, NaN → null, undefined → dropped,
// Date → string, etc.). structuredClone is supported everywhere we target.
export function cloneMatch(match: Match): Match {
  return typeof structuredClone === "function"
    ? (structuredClone(match) as Match)
    // Final fallback for ancient runtimes — typed values shouldn't be set
    // here anyway since we use plain JSON-safe shapes throughout the engine.
    : (JSON.parse(JSON.stringify(match)) as Match);
}

export function endTurn(match: Match): Match {
  if (match.state !== "playing") return match;
  const m: Match = cloneMatch(match);

  // Reveal next location (turns 2 and 3)
  if (m.turn === 1) m.locations[1].revealed = true;
  if (m.turn === 2) m.locations[2].revealed = true;
  // Actually locations reveal AT the start of the turn they go live;
  // we activate them via [turn 1: idx 0, turn 2: idx 1, turn 3: idx 2]
  m.locations[0].revealed = true;
  if (m.turn >= 2) m.locations[1].revealed = true;
  if (m.turn >= 3) m.locations[2].revealed = true;

  // 1. Place pending cards into play in order (player then opponent
  //    alternating gives a fair simultaneous feel).
  // Priority system — player with priority reveals their cards first.
  // Within each player's reveal, plays go in the order they were
  // queued (Snap-style: order matters for the ability resolution).
  const allPending: Array<{ owner: PlayerId; play: PlayerState["pending"][0] }> = [];
  const first: PlayerId = m.priority;
  const second: PlayerId = first === "player" ? "opponent" : "player";
  for (const p of (first === "player" ? m.player.pending : m.opponent.pending)) {
    allPending.push({ owner: first, play: p });
  }
  for (const p of (second === "player" ? m.player.pending : m.opponent.pending)) {
    allPending.push({ owner: second, play: p });
  }

  for (const { owner, play } of allPending) {
    const loc = m.locations[play.locationIndex];
    const card: InPlayCard = {
      uid: play.cardUid, def: play.def, owner,
      power: play.def.power,
      lockedPower: play.def.effect?.kind === "auraCannotGainPower" ? true : undefined,
      immune: play.def.effect?.kind === "auraImmune" ? true : undefined,
    };
    loc.cards[owner].push(card);
    runArrivalAbility(m, card, play.locationIndex);
    runLocationOnPlay(m, owner, play.locationIndex, card);
  }
  m.player.pending = [];
  m.opponent.pending = [];

  // 2. Echo (end-of-turn ticks)
  for (let li = 0; li < 3; li++) {
    const loc = m.locations[li];
    if (!loc.revealed) continue;
    for (const owner of ["player", "opponent"] as PlayerId[]) {
      for (const c of loc.cards[owner]) {
        if (c.toDestroy) continue;
        if (loc.loc.effect.kind === "abilitiesDisabled") continue;
        if (c.def.effect?.kind === "echoSelfPlusOne" && !c.lockedPower) c.power += 1;
        if (c.def.effect?.kind === "echoPlusOnePerCardPlayedHere" && !c.lockedPower) {
          // Count cards owned this turn — approximation: +1 if any new card was added
          const added = allPending.some(p => p.owner === owner && p.play.locationIndex === li && p.play.cardUid !== c.uid);
          if (added) c.power += 1;
        }
        if (c.def.effect?.kind === "echoBoostHereEachTurn" && !c.lockedPower) {
          c.power += c.def.effect.amount;
        }
      }
    }
    // Location echo: stormfront — +1 to everyone here each turn
    if (loc.loc.effect.kind === "echoPlusOne") {
      for (const owner of ["player", "opponent"] as PlayerId[]) {
        for (const c of loc.cards[owner]) if (!c.lockedPower && !c.immune) c.power += 1;
      }
    }
    if (loc.loc.effect.kind === "destroyLowestEachTurn") {
      let lowest: InPlayCard | null = null;
      for (const owner of ["player", "opponent"] as PlayerId[]) {
        for (const c of loc.cards[owner]) {
          if (c.immune) continue;
          if (!lowest || c.power < lowest.power) lowest = c;
        }
      }
      if (lowest) lowest.toDestroy = true;
    }
  }

  // 3. Apply destruction (with lastStand triggers)
  for (let li = 0; li < 3; li++) {
    const loc = m.locations[li];
    for (const owner of ["player", "opponent"] as PlayerId[]) {
      const remaining: InPlayCard[] = [];
      for (const c of loc.cards[owner]) {
        if (c.toDestroy && !c.immune) {
          runLastStand(m, c, li);
          (owner === "player" ? m.player : m.opponent).destroyed.push(c);
        } else {
          c.toDestroy = false;
          remaining.push(c);
        }
      }
      loc.cards[owner] = remaining;
    }
  }

  // 4. Recompute totals at each location (apply auras + locations)
  for (let li = 0; li < 3; li++) computeTotals(m, li);

  // 4b. Recompute priority for next turn — player winning more locations
  //     reveals first. Tiebreak on total power across all revealed
  //     locations.
  let pWins = 0, oWins = 0, pPower = 0, oPower = 0;
  for (const l of m.locations) {
    if (!l.revealed) continue;
    if (l.totals.player > l.totals.opponent) pWins++;
    else if (l.totals.opponent > l.totals.player) oWins++;
    pPower += l.totals.player;
    oPower += l.totals.opponent;
  }
  if (pWins > oWins) m.priority = "player";
  else if (oWins > pWins) m.priority = "opponent";
  else if (pPower > oPower) m.priority = "player";
  else if (oPower > pPower) m.priority = "opponent";
  // else: keep previous priority on a complete tie

  // 4c. Clear "snap this turn" lock so retreat is available again
  m.playerSnapThisTurn = false;
  m.opponentSnapThisTurn = false;

  // 5. End of turn 6 → match end
  m.turn += 1;
  m.player.energy = m.turn;
  m.opponent.energy = m.turn;
  m.player.energy += m.player.bonusEnergyNext;
  m.opponent.energy += m.opponent.bonusEnergyNext;
  m.player.bonusEnergyNext = 0;
  m.opponent.bonusEnergyNext = 0;

  // Draw a card each
  drawForPlayer(m.player);
  drawForPlayer(m.opponent);

  // AI plan for opponent
  if (m.state === "playing") aiPlan(m);

  // Check end of match
  if (m.turn > 6) {
    finalize(m);
  }
  return m;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function drawForPlayer(p: PlayerState) {
  if (p.deck.length === 0) return;
  if (p.hand.length >= 7) return;
  const next = p.deck.shift();
  if (!next) return;
  const c = CARDS.find(x => x.id === next);
  if (c) p.hand.push(c);
}

function runLocationOnPlay(m: Match, owner: PlayerId, li: number, card: InPlayCard) {
  const loc = m.locations[li];
  if (loc.loc.effect.kind === "drawOnPlay") {
    drawForPlayer(owner === "player" ? m.player : m.opponent);
    m.log.push(`Wellspring: ${owner} draws a card.`);
  }
  if (loc.loc.effect.kind === "copyFirstToHand") {
    const totalHere = loc.cards.player.length + loc.cards.opponent.length;
    if (totalHere === 1) {
      // First card played: give a copy to owner's hand
      const me = owner === "player" ? m.player : m.opponent;
      me.hand.push(card.def);
      m.log.push(`Twin Gates: ${owner} gets a copy of ${card.def.name}.`);
    }
  }
}

function runArrivalAbility(m: Match, card: InPlayCard, li: number) {
  if (!card.def.effect) return;
  if (card.def.keyword !== "arrival") return;
  const loc = m.locations[li];
  if (loc.loc.effect.kind === "abilitiesDisabled") {
    m.log.push(`${card.def.name}'s ability is silenced (Null Zone).`);
    return;
  }
  // Echo Chamber doubles
  const repeats = loc.loc.effect.kind === "arrivalTwice" ? 2 : 1;
  for (let i = 0; i < repeats; i++) applyArrival(m, card, li);
}

function applyArrival(m: Match, card: InPlayCard, li: number) {
  const eff = card.def.effect!;
  const loc = m.locations[li];
  const owner = card.owner;
  const myState = owner === "player" ? m.player : m.opponent;
  const enemyState = owner === "player" ? m.opponent : m.player;
  switch (eff.kind) {
    case "draw":
      for (let i = 0; i < eff.count; i++) drawForPlayer(myState);
      m.log.push(`${card.def.name}: ${owner} draws ${eff.count}.`);
      break;
    case "addTokenToHand": {
      const t = eff.token;
      // Synthesize a token CardDef
      const token: CardDef = {
        id: `token-${t.name}-${Date.now()}`, name: t.name, cost: t.cost as 1, power: t.power,
        element: t.element, keyword: "vanilla", text: "Token.", effect: null, icon: t.icon, rarity: "common",
      };
      myState.hand.push(token);
      m.log.push(`${card.def.name} adds a ${t.name}.`);
      break;
    }
    case "energyNext":
      myState.bonusEnergyNext += eff.amount;
      m.log.push(`${card.def.name}: +${eff.amount} energy next turn.`);
      break;
    case "powerOtherCardsHere":
      for (const c of loc.cards[owner]) {
        if (c.uid === card.uid) continue;
        if (c.lockedPower) continue;
        c.power += eff.amount;
      }
      m.log.push(`${card.def.name}: +${eff.amount} to your other cards here.`);
      break;
    case "debuffEnemyHere": {
      const enemyCards = loc.cards[owner === "player" ? "opponent" : "player"];
      if (enemyCards.length === 0) break;
      const target = enemyCards[Math.floor(Math.random() * enemyCards.length)];
      if (!target.immune) target.power -= eff.amount;
      m.log.push(`${card.def.name} debuffs ${target.def.name} by ${eff.amount}.`);
      break;
    }
    case "destroyEnemyHereIfPowerLte": {
      const enemyCards = loc.cards[owner === "player" ? "opponent" : "player"];
      const victim = enemyCards.find(c => c.power <= eff.threshold && !c.immune);
      if (victim) {
        victim.toDestroy = true;
        m.log.push(`${card.def.name} destroys ${victim.def.name}!`);
      }
      break;
    }
    case "discardFromHand":
      for (let i = 0; i < eff.count; i++) {
        if (myState.hand.length > 0) {
          const idx = Math.floor(Math.random() * myState.hand.length);
          myState.hand.splice(idx, 1);
        }
      }
      m.log.push(`${card.def.name}: ${owner} discards ${eff.count}.`);
      break;
    case "copyPowerHere": {
      const others = loc.cards[owner].filter(c => c.uid !== card.uid);
      if (others.length > 0 && !card.lockedPower) {
        const target = others[Math.floor(Math.random() * others.length)];
        card.power = target.power;
        m.log.push(`${card.def.name} copies ${target.def.name}'s power (${target.power}).`);
      }
      break;
    }
    case "moveEnemyHere": {
      const enemyCards = loc.cards[owner === "player" ? "opponent" : "player"];
      if (enemyCards.length === 0) break;
      const target = enemyCards[0];
      const otherLocs = [0, 1, 2].filter(i => i !== li && m.locations[i].revealed);
      if (otherLocs.length === 0) break;
      const destLi = otherLocs[Math.floor(Math.random() * otherLocs.length)];
      enemyCards.splice(enemyCards.indexOf(target), 1);
      m.locations[destLi].cards[target.owner].push(target);
      m.log.push(`${card.def.name} pushes ${target.def.name} to ${m.locations[destLi].loc.name}.`);
      break;
    }
    case "splitDamageHere": {
      const enemyCards = loc.cards[owner === "player" ? "opponent" : "player"].filter(c => !c.immune);
      if (enemyCards.length === 0) break;
      const perCard = Math.floor(eff.total / enemyCards.length) || 1;
      for (const c of enemyCards) c.power -= perCard;
      m.log.push(`${card.def.name} deals ${eff.total} split damage.`);
      break;
    }
    case "bonusPowerPerEmptySlotHere": {
      const cap = loc.loc.effect.kind === "maxCards" ? loc.loc.effect.cap : 4;
      const empty = cap - loc.cards[owner].length;
      if (!card.lockedPower) card.power += empty * eff.perSlot;
      m.log.push(`${card.def.name} gains ${empty * eff.perSlot} (${empty} empty slots).`);
      break;
    }
    case "destroyOthersHereAndAbsorb": {
      let absorbed = 0;
      for (const owner2 of ["player", "opponent"] as PlayerId[]) {
        for (const c of loc.cards[owner2]) {
          if (c.uid === card.uid) continue;
          if (c.immune) continue;
          absorbed += c.power;
          c.toDestroy = true;
        }
      }
      if (!card.lockedPower) card.power += absorbed;
      m.log.push(`${card.def.name} destroys all and absorbs ${absorbed}!`);
      break;
    }
    case "addTwoSixCostsToHand": {
      const sixes = CARDS.filter(c => c.cost === 6);
      for (let i = 0; i < 2; i++) {
        myState.hand.push(sixes[Math.floor(Math.random() * sixes.length)]);
      }
      m.log.push(`${card.def.name} adds 2 random 6-cost cards.`);
      break;
    }
  }
}

function runLastStand(m: Match, card: InPlayCard, li: number) {
  const loc = m.locations[li];
  if (card.def.keyword !== "lastStand" || !card.def.effect) return;
  // Soul Warden aura → trigger twice
  const ownerCards = loc.cards[card.owner];
  const soulWarden = ownerCards.some(c => c.def.effect?.kind === "auraLastStandDoubles");
  const graveyard = loc.loc.effect.kind === "lastStandTwice";
  const repeats = (soulWarden ? 2 : 1) * (graveyard ? 2 : 1);
  const eff = card.def.effect;
  for (let i = 0; i < repeats; i++) {
    if (eff.kind === "lastStandBuffOthersHere") {
      for (const c of loc.cards[card.owner]) {
        if (c.uid === card.uid) continue;
        if (!c.lockedPower) c.power += eff.amount;
      }
      m.log.push(`${card.def.name} Last Stand: +${eff.amount} to your other cards here.`);
    } else if (eff.kind === "lastStandReturnToHandPlusN") {
      const me = card.owner === "player" ? m.player : m.opponent;
      const returnedDef: CardDef = { ...card.def, power: card.def.power + eff.amount };
      me.hand.push(returnedDef);
      m.log.push(`${card.def.name} returns to hand at ${returnedDef.power} power.`);
    }
  }
}

function computeTotals(m: Match, li: number) {
  const loc = m.locations[li];
  // Reset to base power + immutable lock state
  for (const owner of ["player", "opponent"] as PlayerId[]) {
    let total = 0;
    for (const c of loc.cards[owner]) {
      let p = c.power;
      // Aura: low-cost buff from a Runesmith
      const auraLow = loc.cards[owner].find(c2 => c2.def.effect?.kind === "auraLowCostBuff");
      if (auraLow && c.def.cost <= 2 && !c.lockedPower) {
        const eff = auraLow.def.effect as Extract<NonNullable<CardDef["effect"]>, { kind: "auraLowCostBuff" }>;
        p += eff.amount;
      }
      // Aura: alone bonus
      if (c.def.effect?.kind === "auraSelfPowerIfAlone" && loc.cards[owner].length === 1 && !c.lockedPower) {
        p += c.def.effect.amount;
      }
      // Aura: enemy-here debuff
      const enemyAuras = loc.cards[owner === "player" ? "opponent" : "player"]
        .filter(c2 => c2.def.effect?.kind === "auraEnemyHereDebuff");
      for (const ea of enemyAuras) {
        const eff = ea.def.effect as Extract<NonNullable<CardDef["effect"]>, { kind: "auraEnemyHereDebuff" }>;
        if (!c.immune) p -= eff.amount;
      }
      // Sun Squire penalty
      if (c.def.effect?.kind === "auraSelfPenaltyIfBigCardInPlay") {
        const bigInPlay = m.locations.some(l =>
          l.cards[owner].some(x => x.def.cost >= 5));
        if (bigInPlay) p -= c.def.effect.amount;
      }
      // Aura: cards at OTHER locations get +1 (Storm Drake)
      const otherLocsDrake = m.locations.some((l, lj) =>
        lj !== li && l.cards[owner].some(x => x.def.effect?.kind === "auraOtherLocationsBuff"));
      if (otherLocsDrake && !c.lockedPower) p += 1;
      // Location: bonus power here
      if (loc.loc.effect.kind === "bonusPowerHere" && !c.lockedPower) p += loc.loc.effect.amount;
      if (loc.loc.effect.kind === "powerPenalty") p -= loc.loc.effect.amount;
      total += p;
    }
    loc.totals[owner] = total;
  }
  // Champion's Pit — highest-power card +3
  if (loc.loc.effect.kind === "buffHighestPower") {
    for (const owner of ["player", "opponent"] as PlayerId[]) {
      if (loc.cards[owner].length === 0) continue;
      loc.totals[owner] += loc.loc.effect.amount;
    }
  }
}

// ── End-of-match ─────────────────────────────────────────────────────

function finalize(m: Match) {
  let pWins = 0, oWins = 0;
  for (const l of m.locations) {
    if (l.totals.player > l.totals.opponent) pWins++;
    else if (l.totals.opponent > l.totals.player) oWins++;
  }
  // Per Snap rules: stakes double automatically after the final turn
  // (going to "show" doubles the cubes). Capped at 8.
  if (m.result !== "tie") m.stakes = Math.min(8, m.stakes * 2);
  if (pWins > oWins) m.result = "win";
  else if (oWins > pWins) m.result = "loss";
  else m.result = "tie";
  m.state = "ended";
  m.log.push(`Match over: ${pWins}-${oWins} locations. ${m.stakes} cube${m.stakes === 1 ? "" : "s"} on the line.`);
}

// ── Go Bold mechanic ─────────────────────────────────────────────────

export function callBold(m: Match, caller: PlayerId): Match {
  const out = { ...m };
  // Cube ladder: 1 → 2 → 4 → 8 (capped at 8).
  out.stakes = Math.min(8, out.stakes * 2);
  if (caller === "player") { out.playerBoldCalled = true; out.playerSnapThisTurn = true; }
  else                     { out.opponentBoldCalled = true; out.opponentSnapThisTurn = true; }
  out.log = [...out.log, `${caller} GO BOLD! Stakes ×${out.stakes}. Can't retreat until next turn.`];
  return out;
}

/** True if `who` can retreat right now — false if they just snapped
 *  this turn (locked-in until the next turn flips the flag). */
export function canRetreat(m: Match, who: PlayerId): boolean {
  if (m.state !== "playing") return false;
  if (who === "player") return !m.playerSnapThisTurn;
  return !m.opponentSnapThisTurn;
}

export function retreat(m: Match, retreater: PlayerId): Match {
  if (!canRetreat(m, retreater)) return m;
  const out = { ...m };
  out.state = "ended";
  out.result = retreater === "player" ? "retreatPlayer" : "retreatOpponent";
  out.log = [...out.log, `${retreater} retreats — loses ${Math.max(1, out.stakes / 2)} cube${out.stakes / 2 === 1 ? "" : "s"}.`];
  return out;
}

// ── AI ───────────────────────────────────────────────────────────────

function aiPlan(m: Match) {
  // Greedy AI: play the most expensive playable card to the location
  // where the AI is currently losing (or any if tied).
  const me = m.opponent;
  const energyBudget = { v: me.energy };
  const usedHand = new Set<number>();
  while (true) {
    // Find best card+location combination
    let bestIdx = -1, bestLi = -1, bestScore = -Infinity;
    for (let h = 0; h < me.hand.length; h++) {
      if (usedHand.has(h)) continue;
      const card = me.hand[h];
      for (let li = 0; li < 3; li++) {
        const cost = effectiveCardCost(card, li, m, "opponent");
        if (cost > energyBudget.v) continue;
        const loc = m.locations[li];
        if (!loc.revealed) continue;
        const ownAt = loc.cards.opponent.length + me.pending.filter(p => p.locationIndex === li).length;
        const cap = loc.loc.effect.kind === "maxCards" ? loc.loc.effect.cap : 4;
        if (ownAt >= cap) continue;
        // Score: prefer high-power, prefer losing locations
        const losing = loc.totals.opponent < loc.totals.player ? 5 : 0;
        const score = card.power + cost * 0.5 + losing - h * 0.1;
        if (score > bestScore) {
          bestScore = score; bestIdx = h; bestLi = li;
        }
      }
    }
    if (bestIdx < 0) break;
    const card = me.hand[bestIdx];
    const cost = effectiveCardCost(card, bestLi, m, "opponent");
    me.pending.push({ cardUid: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, def: card, locationIndex: bestLi });
    me.hand.splice(bestIdx, 1);
    energyBudget.v -= cost;
    me.energy -= cost;
    // Re-index — we removed a card, so the indices we marked are stale.
    // Instead, just don't re-mark; rely on greedy by recomputing each loop.
  }
}

export { STARTER_DECK_IDS };
