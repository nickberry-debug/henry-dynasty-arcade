// Monster Forge — Phase 3 unique powers.
//
// Each monster gets 1-3 powers derived from body type + active potions.
// Tapping a power triggers a transient Three.js effect that auto-despawns.

import * as THREE from "three";
import type { BodyType } from "../partsManifest";
import type { AssembledMonster } from "../engine";
import { POTIONS_BY_ID, type ElementId } from "../data/potions";

export type PowerElement =
  | "fire" | "ice" | "spark" | "shade" | "toxic"
  | "aqua" | "earth" | "wind" | "steam" | "plague" | "tempest"
  | "physical";

export interface Power {
  id: string;
  name: string;
  emoji: string;
  element: PowerElement;
  description: string;
  power: number;
  emit: "front" | "down" | "up" | "around";
}

const SIGNATURE_BY_TYPE: Record<BodyType, Power> = {
  biped:      { id: "sig_slam",   name: "Crushing Slam", emoji: "💥", element: "physical", power: 1.2, emit: "down",   description: "Slams the ground — concussive shockwave." },
  quadruped:  { id: "sig_pounce", name: "Pouncing Bite", emoji: "🐺", element: "physical", power: 1.15, emit: "front", description: "Lunges forward with a snapping bite." },
  winged:     { id: "sig_gust",   name: "Wing Gust",     emoji: "💨", element: "wind",     power: 1.0,  emit: "around", description: "Beats wings, blasting wind in every direction." },
  serpentine: { id: "sig_coil",   name: "Coil Strike",   emoji: "🐍", element: "physical", power: 1.25, emit: "front", description: "Whips forward in a serpentine strike." },
  floating:   { id: "sig_phase",  name: "Phase Bolt",    emoji: "👻", element: "shade",    power: 1.1,  emit: "front", description: "Channels a beam of ethereal energy." },
};

const ELEMENT_POWER: Record<ElementId, Power> = {
  fire:    { id: "fire_breath",   name: "Fire Breath",    emoji: "🔥", element: "fire",    power: 1.5, emit: "front",  description: "Cone of roaring flame." },
  ice:     { id: "ice_blast",     name: "Ice Blast",      emoji: "❄️", element: "ice",     power: 1.3, emit: "front",  description: "Freezing cone of ice shards." },
  spark:   { id: "lightning",     name: "Lightning Bolt", emoji: "⚡", element: "spark",   power: 1.5, emit: "up",     description: "Calls a bolt from above." },
  shade:   { id: "shadow_strike", name: "Shadow Strike",  emoji: "🌑", element: "shade",   power: 1.4, emit: "around", description: "Dark tendrils swarm outward." },
  toxic:   { id: "venom_spit",    name: "Venom Spit",     emoji: "☣️", element: "toxic",   power: 1.2, emit: "front",  description: "Corrosive poison globs." },
  aqua:    { id: "tidal_jet",     name: "Tidal Jet",      emoji: "💧", element: "aqua",    power: 1.2, emit: "front",  description: "High-pressure water blast." },
  earth:   { id: "stone_throw",   name: "Stone Throw",    emoji: "🪨", element: "earth",   power: 1.3, emit: "front",  description: "Hurls jagged rocks." },
  wind:    { id: "cyclone",       name: "Cyclone",        emoji: "🌪️", element: "wind",   power: 1.1, emit: "around", description: "Spins a cyclone outward." },
  steam:   { id: "steam_burst",   name: "Steam Burst",    emoji: "♨️", element: "steam",   power: 1.4, emit: "around", description: "Scalding superheated steam." },
  plague:  { id: "plague_cloud",  name: "Plague Cloud",   emoji: "☠️", element: "plague",  power: 1.5, emit: "around", description: "Toxic miasma poisons enemies." },
  tempest: { id: "chain_storm",   name: "Chain Storm",    emoji: "🌩️", element: "tempest",power: 1.6, emit: "up",     description: "Chain lightning storm." },
};

const MUTATION_POWER: Record<string, Power> = {
  extra_horns:  { id: "horn_charge", name: "Horn Charge", emoji: "🐂", element: "physical", power: 1.4, emit: "front",  description: "Bull-rush with extra horns." },
  bat_wings:    { id: "wing_buffet", name: "Wing Buffet", emoji: "🦇", element: "wind",     power: 1.1, emit: "around", description: "Concussive wing strike." },
  spike_coat:   { id: "spike_burst", name: "Spike Burst", emoji: "🦔", element: "physical", power: 1.2, emit: "around", description: "Launches spikes outward." },
  extra_eyes:   { id: "psi_glare",   name: "Psi Glare",   emoji: "👁️", element: "shade",    power: 1.3, emit: "front",  description: "Mind-rending stare." },
  extra_arms:   { id: "flurry",      name: "Fist Flurry", emoji: "💪", element: "physical", power: 1.3, emit: "front",  description: "Six-fisted barrage." },
  tail_boost:   { id: "tail_slam",   name: "Tail Slam",   emoji: "🦎", element: "physical", power: 1.3, emit: "down",   description: "Heavy tail crashes down." },
  demon_aspect: { id: "hellfire",    name: "Hellfire",    emoji: "😈", element: "fire",     power: 1.7, emit: "around", description: "Black flame engulfs all." },
};

export function powersFor(bodyType: BodyType, activePotionIds: string[]): Power[] {
  const out: Power[] = [];
  const seen = new Set<string>();
  const push = (p: Power) => { if (!seen.has(p.id)) { out.push(p); seen.add(p.id); } };
  push(SIGNATURE_BY_TYPE[bodyType]);
  for (const pid of activePotionIds) {
    const eff = POTIONS_BY_ID[pid]?.effect;
    if (eff?.aura && ELEMENT_POWER[eff.aura]) push(ELEMENT_POWER[eff.aura]);
  }
  for (const pid of activePotionIds) {
    const eff = POTIONS_BY_ID[pid]?.effect;
    if (eff?.mutation && MUTATION_POWER[eff.mutation]) push(MUTATION_POWER[eff.mutation]);
  }
  return out.slice(0, 3);
}

export interface ActiveEffect {
  group: THREE.Group;
  update: (t: number, dt: number) => boolean;
}

const ELEMENT_COLOR: Record<PowerElement, number> = {
  fire: 0xff6f00, ice: 0x80deea, spark: 0xfff176, shade: 0x4a148c,
  toxic: 0x76ff03, aqua: 0x039be5, earth: 0x8d6e63, wind: 0xeceff1,
  steam: 0xffffff, plague: 0x33691e, tempest: 0xfff59d, physical: 0xff5252,
};

export function buildPowerEffect(power: Power, am: AssembledMonster): ActiveEffect {
  const color = ELEMENT_COLOR[power.element];
  const size = new THREE.Vector3(); am.bbox.getSize(size);
  const center = new THREE.Vector3(); am.bbox.getCenter(center);
  const w = Math.max(size.x, 0.5);
  const frontZ = am.bbox.max.z + 0.1;
  const topY = am.bbox.max.y;
  const h = Math.max(size.y, 0.5);
  const lifetime = 1.4;
  const g = new THREE.Group();
  g.name = "power-fx";
  am.root.add(g);

  const particles: { mesh: THREE.Mesh; vel: THREE.Vector3; basePos: THREE.Vector3; rot: number }[] = [];
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.6,
    transparent: true, opacity: 0.95, roughness: 0.4, metalness: 0.1,
  });

  if (power.emit === "front") {
    const N = 24;
    for (let i = 0; i < N; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random()*0.04, 0.18, 6), mat);
      cone.position.set(0, center.y, frontZ);
      const vy = (Math.random()-0.5)*0.4, vx = (Math.random()-0.5)*0.4, vz = 1.6+Math.random()*0.8;
      cone.lookAt(cone.position.x+vx, cone.position.y+vy, cone.position.z+vz);
      g.add(cone);
      particles.push({ mesh: cone, vel: new THREE.Vector3(vx,vy,vz), basePos: cone.position.clone(), rot: Math.random()*Math.PI*2 });
    }
  } else if (power.emit === "down") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 36), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.01, 0);
    g.add(ring);
    particles.push({ mesh: ring, vel: new THREE.Vector3(w*1.6,0,w*1.6), basePos: ring.position.clone(), rot: 0 });
    const N = 12;
    for (let i = 0; i < N; i++) {
      const chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), mat);
      const a = (i/N)*Math.PI*2;
      chunk.position.set(Math.cos(a)*0.2, 0.1, Math.sin(a)*0.2);
      g.add(chunk);
      particles.push({ mesh: chunk, vel: new THREE.Vector3(Math.cos(a)*1.5, 0.8+Math.random()*0.5, Math.sin(a)*1.5), basePos: chunk.position.clone(), rot: Math.random()*Math.PI*2 });
    }
  } else if (power.emit === "up") {
    const N = 14;
    for (let i = 0; i < N; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 14), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, topY + i*0.18, 0);
      g.add(ring);
      particles.push({ mesh: ring, vel: new THREE.Vector3(0, 1.5+Math.random()*0.5, 0), basePos: ring.position.clone(), rot: 0 });
    }
    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), mat);
    stinger.position.set(0, topY + h * 1.8, 0);
    stinger.rotation.x = Math.PI;
    g.add(stinger);
    particles.push({ mesh: stinger, vel: new THREE.Vector3(0,0,0), basePos: stinger.position.clone(), rot: 0 });
  } else {
    const N = 28;
    for (let i = 0; i < N; i++) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat);
      const phi = Math.acos(2*Math.random()-1), theta = Math.random()*Math.PI*2;
      const dX = Math.sin(phi)*Math.cos(theta), dY = Math.cos(phi), dZ = Math.sin(phi)*Math.sin(theta);
      sphere.position.set(0, center.y, 0);
      g.add(sphere);
      particles.push({ mesh: sphere, vel: new THREE.Vector3(dX*1.8, dY*1.2+0.3, dZ*1.8), basePos: sphere.position.clone(), rot: Math.random()*Math.PI*2 });
    }
  }

  const start = performance.now() / 1000;
  const update = (_t: number, dt: number): boolean => {
    const elapsed = performance.now()/1000 - start;
    const k = elapsed / lifetime;
    if (k >= 1) {
      g.parent?.remove(g);
      for (const p of particles) p.mesh.geometry.dispose();
      mat.dispose();
      return false;
    }
    const fade = 1 - k;
    mat.opacity = 0.9 * fade;
    for (const p of particles) {
      p.mesh.position.x = p.basePos.x + p.vel.x * elapsed;
      p.mesh.position.y = p.basePos.y + p.vel.y * elapsed - 0.5*1.4*elapsed*elapsed*(power.emit === "front" ? 0.3 : 0.0);
      p.mesh.position.z = p.basePos.z + p.vel.z * elapsed;
      p.rot += dt * 6;
      p.mesh.rotation.set(p.rot, p.rot*0.7, p.rot*0.5);
      if (p.mesh.geometry instanceof THREE.RingGeometry) {
        p.mesh.scale.setScalar(1 + k * 8);
      } else {
        const s = power.emit === "down" ? 1 + k*6 : Math.max(0.001, fade);
        p.mesh.scale.setScalar(s);
      }
    }
    return true;
  };
  return { group: g, update };
}
