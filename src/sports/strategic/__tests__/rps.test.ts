// src/sports/strategic/__tests__/rps.test.ts
//
// Headless verification harness. Runs many simulated matches across
// scenarios and asserts the strategic layer actually shifts win rates
// away from coin-flip. Exits non-zero on failure.

import {
  resolveDecision, applyMomentumStamina,
  cpuPick, pushRecent,
  newSide, simulateMatch,
  randomStrategy, adaptiveStrategy, patternedStrategy,
  GAME_PLANS, BASEBALL_RPS, FOOTBALL_RPS,
} from "../index";

function pct(x: number): string { return (x * 100).toFixed(1) + "%"; }
function runBattery(label: string, trials: number, match: () => number) {
  let aw = 0, dw = 0, tie = 0;
  for (let i = 0; i < trials; i++) {
    const r = match();
    if (r > 0) aw++; else if (r < 0) dw++; else tie++;
  }
  const out = { attackerWinRate: aw / trials, defenderWinRate: dw / trials, ties: tie };
  console.log(`${label} :: attacker ${pct(out.attackerWinRate)} / defender ${pct(out.defenderWinRate)} / ties ${tie} of ${trials}`);
  return out;
}
const TRIALS = 1000;
let failed = false;
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("FAIL:", msg); failed = true; }
  else        { console.log("PASS:", msg); }
}

console.log("\n=== Scenario A: random vs random (control should be near 50/50) ===");
const aResult = runBattery("A.baseball", TRIALS, () => {
  const list = [GAME_PLANS.aggressive, GAME_PLANS.balanced, GAME_PLANS.defensive];
  const planA = list[Math.floor(Math.random() * 3)];
  const planB = list[Math.floor(Math.random() * 3)];
  const { result } = simulateMatch(BASEBALL_RPS,
    randomStrategy(BASEBALL_RPS, "attacker"),
    randomStrategy(BASEBALL_RPS, "defender"),
    planA, planB);
  return result.margin > 0 ? +1 : result.margin < 0 ? -1 : 0;
});
assert(Math.abs(aResult.attackerWinRate - aResult.defenderWinRate) < 0.15,
  `random vs random should be near 50/50 (got ${pct(aResult.attackerWinRate)} vs ${pct(aResult.defenderWinRate)})`);

console.log("\n=== Scenario B: aggressive attacker vs defensive defender ===");
const bResult = runBattery("B.baseball.agg-vs-def", TRIALS, () => {
  const { result } = simulateMatch(BASEBALL_RPS,
    randomStrategy(BASEBALL_RPS, "attacker"),
    randomStrategy(BASEBALL_RPS, "defender"),
    GAME_PLANS.aggressive, GAME_PLANS.defensive);
  return result.margin > 0 ? +1 : result.margin < 0 ? -1 : 0;
});
assert(bResult.attackerWinRate > 0.52,
  `aggressive plan should beat defensive plan >52% (got ${pct(bResult.attackerWinRate)})`);

console.log("\n=== Scenario C: adaptive CPU defender vs patterned attacker (kid spamming POWER) ===");
const cResult = runBattery("C.baseball.adaptive-vs-pattern", TRIALS, () => {
  const { result } = simulateMatch(BASEBALL_RPS,
    patternedStrategy(BASEBALL_RPS, "attacker", { favourite: "swing_power", weight: 0.6 }),
    adaptiveStrategy(BASEBALL_RPS, "defender", "normal"),
    GAME_PLANS.balanced, GAME_PLANS.balanced);
  return result.margin > 0 ? +1 : result.margin < 0 ? -1 : 0;
});
assert(cResult.defenderWinRate > 0.55,
  `adaptive CPU defender should beat a patterned attacker >55% (got ${pct(cResult.defenderWinRate)})`);

console.log("\n=== Scenario C2: adaptive CPU attacker vs patterned defender (football) ===");
const c2Result = runBattery("C2.football.adaptive-vs-pattern", TRIALS, () => {
  const { result } = simulateMatch(FOOTBALL_RPS,
    adaptiveStrategy(FOOTBALL_RPS, "attacker", "normal"),
    patternedStrategy(FOOTBALL_RPS, "defender", { favourite: "def_cover", weight: 0.6 }),
    GAME_PLANS.balanced, GAME_PLANS.balanced);
  return result.margin > 0 ? +1 : result.margin < 0 ? -1 : 0;
});
assert(c2Result.attackerWinRate > 0.55,
  `adaptive CPU attacker should beat a patterned defender >55% (got ${pct(c2Result.attackerWinRate)})`);

console.log("\n=== Scenario C3: adaptive CPU defender vs uniform random attacker (informational) ===");
const c3Result = runBattery("C3.baseball.adaptive-vs-uniform", TRIALS, () => {
  const { result } = simulateMatch(BASEBALL_RPS,
    randomStrategy(BASEBALL_RPS, "attacker"),
    adaptiveStrategy(BASEBALL_RPS, "defender", "normal"),
    GAME_PLANS.balanced, GAME_PLANS.balanced);
  return result.margin > 0 ? +1 : result.margin < 0 ? -1 : 0;
});
assert(c3Result.defenderWinRate > 0.42,
  `adaptive CPU vs unexploitable random should hold its own (got ${pct(c3Result.defenderWinRate)})`);

console.log("\n=== Scenario D: spammer attacker (POWER 90%) vs hard adaptive defender ===");
const dResult = runBattery("D.baseball.spammer-vs-hard", TRIALS, () => {
  const { result } = simulateMatch(BASEBALL_RPS,
    patternedStrategy(BASEBALL_RPS, "attacker", { favourite: "swing_power", weight: 0.9 }),
    adaptiveStrategy(BASEBALL_RPS, "defender", "hard"),
    GAME_PLANS.balanced, GAME_PLANS.balanced);
  return result.margin > 0 ? +1 : result.margin < 0 ? -1 : 0;
});
assert(dResult.defenderWinRate > 0.75,
  `hard adaptive CPU should crush a heavy spammer >75% (got ${pct(dResult.defenderWinRate)})`);

console.log("\n=== Unit: matchup tilt directionality ===");
{
  const r = resolveDecision(BASEBALL_RPS,
    { id: "swing_power", safe: false },
    { id: "pitch_curve", safe: false },
    newSide(GAME_PLANS.balanced), newSide(GAME_PLANS.balanced),
    { rng: () => 0.5 });
  assert(r.tilt < 0, `POWER vs CURVE should favour pitcher (got ${r.tilt.toFixed(2)})`);
}
{
  const r = resolveDecision(BASEBALL_RPS,
    { id: "swing_power", safe: false },
    { id: "pitch_change", safe: false },
    newSide(GAME_PLANS.balanced), newSide(GAME_PLANS.balanced),
    { rng: () => 0.5 });
  assert(r.tilt > 0, `POWER vs CHANGEUP should favour batter (got ${r.tilt.toFixed(2)})`);
}

console.log("\n=== Unit: stamina + momentum dynamics ===");
{
  const sa = newSide(GAME_PLANS.aggressive);
  const sb = newSide(GAME_PLANS.balanced);
  for (let i = 0; i < 12; i++) {
    const r = resolveDecision(BASEBALL_RPS,
      { id: "swing_power", safe: false },
      { id: "pitch_change", safe: false },
      sa, sb, { rng: () => 0.55 });
    applyMomentumStamina(sa, sb, r);
  }
  assert(sa.stamina.value < 100, `aggressive attacker should have drained stamina (got ${sa.stamina.value.toFixed(1)})`);
  assert(sa.momentum.value > 0, `attacker should have built momentum (got ${sa.momentum.value.toFixed(1)})`);
}

console.log("\n=== Unit: cpuPick exploits a repeated pattern ===");
{
  let curvePicks = 0;
  const N = 500;
  for (let i = 0; i < N; i++) {
    const pick = cpuPick(BASEBALL_RPS, {
      cpuSide: "defender",
      humanRecent: ["swing_power","swing_power","swing_power","swing_power","swing_power"],
      difficulty: "hard",
    });
    if (pick.action.id === "pitch_curve") curvePicks++;
  }
  assert(curvePicks / N > 0.70,
    `hard CPU defender should counter spammed POWER >70% (got ${pct(curvePicks/N)})`);
}

{
  let r: string[] = [];
  for (let i = 0; i < 20; i++) r = pushRecent(r, "x_" + i, 8);
  assert(r.length === 8, `recent should cap at 8 (got ${r.length})`);
}

if (failed) {
  console.error("\nHEADLESS HARNESS: FAILURES PRESENT");
  process.exit(1);
}
console.log("\nHEADLESS HARNESS: ALL GREEN");
process.exit(0);