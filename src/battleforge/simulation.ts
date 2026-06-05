import type { AbilityVfxType, BattleUnit, CharacterDef, Particle, MapConfig, BattleLogEntry, VFXEvent } from "./types";

export const WORLD_W = 1000;
export const WORLD_H = 560;

const SIZE_RADIUS: Record<string, number> = {
  tiny: 9, small: 13, medium: 19, large: 28, huge: 42, colossal: 62,
};
const SIZE_HP: Record<string, number> = {
  tiny: 0.5, small: 1, medium: 2.5, large: 7, huge: 20, colossal: 55,
};
const SIZE_POWER: Record<string, number> = {
  tiny: 0.4, small: 0.8, medium: 1.8, large: 5, huge: 14, colossal: 35,
};
const SIZE_SPEED: Record<string, number> = {
  tiny: 1.6, small: 1.3, medium: 1.0, large: 0.75, huge: 0.5, colossal: 0.3,
};

const MOVEMENT_PACE = 0.68;
const ATTACK_DAMAGE_PACE = 0.42;

// Same size-class multipliers the renderer uses for sprite scale — kept
// duplicated here so the sim can scale VFX by combatant size without
// importing from the renderer module.
const SIZE_MUL: Record<string, number> = {
  tiny: 0.6, small: 0.85, medium: 1.0, large: 1.25, huge: 1.6, colossal: 2.0,
};
const SPECIAL_DAMAGE_PACE = 0.34;
const INITIAL_SPECIAL_DELAY = 220;
const DEATH_TIMER = 58;

export function createUnit(
  def: CharacterDef,
  team: "A" | "B",
  index: number,
  total: number,
  uid: string,
): BattleUnit {
  const radius = SIZE_RADIUS[def.size] ?? 19;
  const maxHp = Math.max(1, Math.round(def.stats.hp * (SIZE_HP[def.size] ?? 2.5)));
  const power = Math.max(1, Math.round(def.stats.power * (SIZE_POWER[def.size] ?? 1.8)));
  const speed = (def.stats.speed / 100) * 2.2 * (SIZE_SPEED[def.size] ?? 1.0) * MOVEMENT_PACE;
  const defense = def.stats.defense;
  const special = def.stats.special;
  const isRanged = def.attackType !== "melee";
  const attackRange = radius + (isRanged ? 0 : 12);
  const attackCooldownMax = isRanged ? 108 : 82;

  const spread = WORLD_H / (total + 1);
  const baseY = spread * (index + 1) + (Math.random() - 0.5) * spread * 0.4;
  const baseX = team === "A"
    ? 55 + Math.random() * 120
    : WORLD_W - 55 - Math.random() * 120;

  return {
    uid, defId: def.id, name: def.name, emoji: def.emoji,
    size: def.size, attackType: def.attackType, color: def.color,
    specialName: def.specialName, specialVfx: def.specialVfx, team,
    x: baseX,
    y: Math.max(radius + 8, Math.min(WORLD_H - radius - 8, baseY)),
    vx: 0, vy: 0,
    hp: maxHp, maxHp, power, speed, defense, special, radius,
    attackRange,
    attackCooldown: Math.floor(Math.random() * attackCooldownMax),
    attackCooldownMax,
    specialCooldown: INITIAL_SPECIAL_DELAY + Math.floor(Math.random() * 260),
    state: "alive", targetUid: null,
    flashTimer: 0, deathTimer: 0, kills: 0, damageDealt: 0,
    rageMode: false, lastStand: false, knockbackTimer: 0, deathVx: 0, deathVy: 0,
  };
}

export function tickSimulation(
  units: BattleUnit[],
  particles: Particle[],
  map: MapConfig,
  tick: number,
  log: BattleLogEntry[],
  vfxQueue: VFXEvent[],
): void {
  const alive = units.filter(u => u.state === "alive");
  const aAlive = alive.filter(u => u.team === "A");
  const bAlive = alive.filter(u => u.team === "B");

  // Last stand: single survivor gets major power boost
  for (const u of alive) {
    const teamAlive = u.team === "A" ? aAlive : bAlive;
    u.lastStand = teamAlive.length === 1;
  }

  for (const u of alive) {
    const enemies = u.team === "A" ? bAlive : aAlive;
    const friends = u.team === "A" ? aAlive : bAlive;
    if (enemies.length === 0) continue;

    // Find nearest enemy (squared distance for speed)
    let nearestD2 = Infinity;
    let nearest: BattleUnit | null = null;
    for (const e of enemies) {
      const d2 = (e.x - u.x) ** 2 + (e.y - u.y) ** 2;
      if (d2 < nearestD2) { nearestD2 = d2; nearest = e; }
    }
    if (!nearest) continue;
    u.targetUid = nearest.uid;

    const dx = nearest.x - u.x;
    const dy = nearest.y - u.y;
    const dist = Math.sqrt(nearestD2);
    const nx = dx / dist;
    const ny = dy / dist;
    const mapSpeed = map.speedMultiplier;
    const spd = u.speed * mapSpeed;

    const touchDist = u.radius + nearest.radius;
    const isRanged = u.attackType !== "melee";
    const preferredDist = isRanged ? 140 : touchDist + 4;

    // Don't chase if in knockback
    if (u.knockbackTimer <= 0) {
      if (dist > preferredDist + 6) {
        u.vx += nx * spd * 0.6;
        u.vy += ny * spd * 0.6;
      } else if (isRanged && dist < 90) {
        u.vx -= nx * spd * 0.4;
        u.vy -= ny * spd * 0.4;
      } else {
        u.vx *= 0.7;
        u.vy *= 0.7;
      }
    }

    // Repel from same-team neighbors to prevent stacking
    for (const f of friends) {
      if (f.uid === u.uid) continue;
      const fdx = u.x - f.x;
      const fdy = u.y - f.y;
      const fd2 = fdx * fdx + fdy * fdy;
      const minD = u.radius + f.radius + 2;
      if (fd2 < minD * minD && fd2 > 0.01) {
        const fd = Math.sqrt(fd2);
        const push = (minD - fd) / minD * 0.6;
        u.vx += (fdx / fd) * push;
        u.vy += (fdy / fd) * push;
      }
    }

    // Speed cap
    const vMag = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
    const vMax = spd * 1.8;
    if (vMag > vMax) { u.vx = (u.vx / vMag) * vMax; u.vy = (u.vy / vMag) * vMax; }

    // Power multipliers: rage (+40%), last stand (+60%)
    const rageMult = u.rageMode ? 1.40 : 1.0;
    const lastStandMult = u.lastStand ? 1.60 : 1.0;
    const powerMult = rageMult * lastStandMult;

    // Attack
    const attackReach = isRanged ? 155 : touchDist + u.attackRange + 2;
    if (u.attackCooldown <= 0 && dist <= attackReach) {
      const defMult = 1 - (nearest.defense / 2500);
      const dmg = Math.max(1, Math.round(u.power * powerMult * ATTACK_DAMAGE_PACE * (0.70 + Math.random() * 0.45) * defMult));
      nearest.hp -= dmg;
      nearest.flashTimer = 8;
      u.attackCooldown = u.attackCooldownMax;
      u.damageDealt += dmg;

      // Knockback on heavy hits (>18% of target's max HP)
      if (dmg > nearest.maxHp * 0.18) {
        const kbStr = Math.min(8.0, (dmg / nearest.maxHp) * 14.0);
        nearest.vx -= nx * kbStr;
        nearest.vy -= ny * kbStr;
        nearest.knockbackTimer = 16;
      }

      spawnImpact(particles, nearest.x, nearest.y, u.team === "A" ? "#5599FF" : "#FF5555");
      // Every hit pushes a tiny burst VFX so impacts visibly read at any
      // zoom level (particles alone are easy to miss on a busy field).
      // Scale by the bigger of the two combatants so giants land heavier.
      const bigger = Math.max(SIZE_MUL[u.size] ?? 1, SIZE_MUL[nearest.size] ?? 1);
      vfxQueue.push({
        charId: u.defId,
        x: nearest.x,
        y: nearest.y,
        effect: "burst",
        color: u.team === "A" ? "#9ec7ff" : "#ff9e9e",
        scale: 0.5 + bigger * 0.25,
      });

      if (nearest.hp <= 0) {
        nearest.hp = 0;
        nearest.state = "dying";
        nearest.deathTimer = DEATH_TIMER;
        // Fly off in the direction of the hit (away from attacker)
        const flyStr = 3.5 + Math.random() * 2.5;
        nearest.deathVx = -nx * flyStr;
        nearest.deathVy = -ny * flyStr;
        nearest.vx = nearest.deathVx;
        nearest.vy = nearest.deathVy;
        u.kills++;
        if (log.length < 200) {
          log.push({ tick, text: `${u.name} took down ${nearest.name}!`, type: "kill" });
        }
        spawnDeath(particles, nearest.x, nearest.y);
      }
    }
    if (u.attackCooldown > 0) u.attackCooldown--;

    // Special ability (AoE around unit)
    if (u.specialCooldown <= 0) {
      const specialRange = u.radius * 3.5 + 20;
      let hit = 0;
      let hitX = 0;
      let hitY = 0;
      for (const e of enemies) {
        const ed2 = (e.x - u.x) ** 2 + (e.y - u.y) ** 2;
        if (ed2 < specialRange * specialRange) {
          const sDmg = Math.max(1, Math.round(u.power * powerMult * SPECIAL_DAMAGE_PACE * (0.75 + Math.random() * 0.35)));
          e.hp -= sDmg;
          e.flashTimer = 14;
          u.damageDealt += sDmg;
          hit++;
          hitX += e.x;
          hitY += e.y;
          if (e.hp <= 0) {
            e.hp = 0; e.state = "dying"; e.deathTimer = DEATH_TIMER; u.kills++;
            const flyStr2 = 4.0 + Math.random() * 3.0;
            const edx = e.x - u.x; const edy = e.y - u.y;
            const ed = Math.sqrt(edx * edx + edy * edy) || 1;
            e.deathVx = (edx / ed) * flyStr2;
            e.deathVy = (edy / ed) * flyStr2;
            e.vx = e.deathVx; e.vy = e.deathVy;
            spawnDeath(particles, e.x, e.y);
          }
        }
      }
      if (hit > 0 && log.length < 200) {
        log.push({ tick, text: `✨ ${u.name} unleashed ${u.specialName}!`, type: "special" });
        spawnSpecial(particles, u.x, u.y, u.color);
        vfxQueue.push({
          charId: u.defId,
          x: u.x,
          y: u.y,
          targetX: hitX / hit,
          targetY: hitY / hit,
          effect: specialEffectForUnit(u),
          color: u.color,
          scale: 0.8 + Math.min(2.4, u.radius / 34),
        });
      }
      u.specialCooldown = Math.round(620 - u.special * 0.25);
    }
    if (u.specialCooldown > 0) u.specialCooldown--;
  }

  // Move alive units + boundary
  for (const u of alive) {
    u.x = clamp(u.x + u.vx, u.radius + 4, WORLD_W - u.radius - 4);
    u.y = clamp(u.y + u.vy, u.radius + 4, WORLD_H - u.radius - 4);
    if (u.flashTimer > 0) u.flashTimer--;
    if (u.knockbackTimer > 0) {
      u.knockbackTimer--;
      // Decay knockback velocity
      u.vx *= 0.78;
      u.vy *= 0.78;
    }
    // Update rage mode
    u.rageMode = (u.hp / u.maxHp) < 0.30;
  }

  // Move dying units (fly off screen — no clamping)
  for (const u of units) {
    if (u.state === "dying") {
      u.vx *= 1.06; // accelerate outward
      u.vy *= 1.06;
      u.x += u.vx;
      u.y += u.vy;
      u.deathTimer--;
      if (u.deathTimer <= 0) u.state = "dead";
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function spawnImpact(particles: Particle[], x: number, y: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1.2 + Math.random() * 3;
    particles.push({ x: x + (Math.random()-0.5)*8, y: y + (Math.random()-0.5)*8, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 0.5, life: 10+Math.floor(Math.random()*8), maxLife: 18, color, radius: 2+Math.random()*2, type: "spark" });
  }
}

function spawnDeath(particles: Particle[], x: number, y: number) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
    const spd = 2.0 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 2.0, life: 20+Math.floor(Math.random()*18), maxLife: 38, color: "#FFD700", radius: 3+Math.random()*5, type: "star" });
  }
}

function spawnSpecial(particles: Particle[], x: number, y: number, color: string) {
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const spd = 3.0 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 0.5, life: 25+Math.floor(Math.random()*22), maxLife: 47, color, radius: 4+Math.random()*5, type: "star" });
  }
}

function specialEffectForUnit(u: BattleUnit): AbilityVfxType {
  if (u.specialVfx) return u.specialVfx;
  const text = `${u.defId} ${u.name} ${u.specialName}`.toLowerCase();
  if (/(thunder|lightning|electric|storm|bolt|godspeed|spark)/.test(text)) return "lightning";
  if (/(laser|beam|blaster|ray|optic|plasma)/.test(text)) return "laser";
  if (/(fire|flame|inferno|dragon|volcano|torch|phoenix|burn)/.test(text)) return "fire";
  if (/(ice|frost|snow|freeze|blizzard)/.test(text)) return "frost";
  if (/(vine|forest|thorn|root|leaf|nature|earth|flower)/.test(text)) return "nature";
  if (/(smash|stomp|quake|shock|slam|pound|titan|hulk|godzilla)/.test(text)) return "shockwave";
  return u.attackType === "ranged" ? "laser" : u.attackType === "indirect" ? "burst" : "shockwave";
}

export function computeWinProb(units: BattleUnit[]): number {
  let aHp = 0, bHp = 0;
  for (const u of units) {
    if (u.state === "dead") continue;
    if (u.team === "A") aHp += u.hp;
    else bHp += u.hp;
  }
  const total = aHp + bHp;
  return total === 0 ? 0.5 : aHp / total;
}

export function getMVP(units: BattleUnit[]): BattleUnit | null {
  let best: BattleUnit | null = null;
  for (const u of units) {
    if (!best || u.kills > best.kills || (u.kills === best.kills && u.damageDealt > best.damageDealt)) {
      best = u;
    }
  }
  return best;
}
