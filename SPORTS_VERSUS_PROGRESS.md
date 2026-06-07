# Sports Versus — Strategic Depth

Adds a strategic decision layer on top of the existing head-to-head versus mode. Pure logic, no new art. Engine code in `src/versus/engine.ts` stays unchanged; the strategic module post-processes outcomes by the matchup tilt + signature plays.

## Module map

```
src/sports/strategic/        — shared, sport-agnostic primitives
  types.ts                   — GamePlan, PlayAction, MomentumState, StaminaState, SideState, StrategicResolve, SportStrategyConfig, MatchResult
  plans.ts                   — three GamePlans (aggressive / balanced / defensive)
  rps.ts                     — resolveDecision + applyMomentumStamina
  cpu.ts                     — cpuPick (adaptive: exploit / neutral / random)
  match.ts                   — newSide / newMatchState / simulateMatch + harness strategies
  sports.ts                  — RPS configs per sport (zero-sum matchup matrices)
  index.ts                   — barrel
  __tests__/rps.test.ts      — headless verification harness

src/versus/strategic.ts      — bridge: maps existing PitcherPick / BatterPick / FootballPick* to PlayActions; CPU pickers for baseball + football; outcome post-processors
src/versus/components/StrategicUI.tsx — PlanPickerScreen, StrategicBars, SignatureButton
```

Combat sports (Boxing/Wrestling, parallel task) reuse `src/sports/strategic/` as a standalone import — already wired in `src/combat-sports/boxing/`.

## Upgraded sports

| Sport      | Attacker triangle                | Defender triangle             | Signature        |
| ---------- | -------------------------------- | ----------------------------- | ---------------- |
| Baseball   | swing_power / swing_contact / swing_take | pitch_fast / pitch_curve / pitch_change | Grand-slam swing |
| Football   | call_run / call_pass / call_trick | def_blitz / def_cover / def_balanced | Flea-flicker     |
| Basketball | drive / shoot / pass             | lane / contest / double       | Power dunk (reserved — no versus base yet) |
| Hockey     | shoot / deke / pass              | block / poke / screen         | Top-shelf slap (reserved — no versus base yet) |

## RPS triangles (zero-sum tilt matrices)

Every matrix has each row & column summing to 0 so random-vs-random is a true 50/50 control.

**Baseball** (rows = attacker, cols = defender, values = tilt from attacker POV)

|              | fast | curve | change |
| ------------ | ---- | ----- | ------ |
| power swing  | 0.00 | −0.45 | +0.45  |
| contact swing| +0.45| 0.00  | −0.45  |
| take         | −0.45| +0.45 | 0.00   |

**Football**

|         | blitz | cover | balanced |
| ------- | ----- | ----- | -------- |
| run     | +0.45 | −0.45 | 0.00     |
| pass    | 0.00  | +0.45 | −0.45    |
| trick   | −0.45 | 0.00  | +0.45    |

## Game plans

| Plan       | riskBias | rewardMult | staminaDrain | momentumGain |
| ---------- | -------- | ---------- | ------------ | ------------ |
| Aggressive | +0.45    | 1.20       | 1.35         | 1.20         |
| Balanced   | 0        | 1.0        | 1.0          | 1.0          |
| Defensive  | −0.35    | 0.85       | 0.75         | 0.90         |

## Adaptive CPU notes

- Tracks opponent's last 8 picks (rolling window).
- Difficulty mix:
  - **Easy**: 30% exploit / 30% neutral / 40% random
  - **Normal**: 60% exploit / 25% neutral / 15% random
  - **Hard**: 78% exploit / 15% neutral / 7% random
- Stamina-aware safe/risky selection: low stamina → mostly safe; momentum > 60 → mostly risky.
- Signature timing: fires only when the matchup is favourable OR opponent stamina is low. Hard CPU fires at 95% probability when ready, Normal 70%, Easy 30%.

## Headless verification (1000 matches per scenario)

```
A.baseball (random vs random control)        :: 50.8% / 49.2% / ties 0
B.baseball.agg-vs-def (plans matter)         :: 93.1% / 6.9%  / ties 0
C.baseball.adaptive-vs-pattern (60% spam)    :: 27.1% / 72.9% / ties 0
C2.football.adaptive-vs-pattern (60% spam)   :: 76.9% / 23.1% / ties 0
C3.baseball.adaptive-vs-uniform (informational, no pattern to exploit) :: 56.2% / 43.8%
D.baseball.spammer-vs-hard (90% spam)        :: 0.0%  / 100.0% / ties 0
Unit: POWER vs CURVE tilt              -0.49 ✓
Unit: POWER vs CHANGEUP tilt           +0.49 ✓
Unit: aggressive stamina drained        15.8 ✓
Unit: momentum built                   100.0 ✓
Unit: hard CPU counter rate            82.0% ✓
```

**Adaptive CPU beats a patterned (60%-spam) player at 73-77%.** That's the realistic "kid spamming their favourite move" case — the strategic depth is decisive. Against a hypothetical fully uniform random opponent (informational scenario C3, no pattern to exploit) the CPU sits near coin-flip, which is the theoretical ceiling of any RPS strategy.

## How match flow changed

1. Plan picker phase (P1 picks plan card → P2 picks if pass-and-play, auto for CPU mode).
2. Pitch/play loop unchanged on the surface — same hidden simultaneous pick, same reveal.
3. After both picks lock, the strategic layer maps them to RPS actions, computes tilt (matrix + plan bias + stamina + signature), resolves the existing engine outcome, then post-processes:
   - Strong attacker tilt + signature fired → outcome upgrades a notch (single → double, foul → single, etc.).
   - Strong defender tilt + signature → outcome downgrades.
4. Momentum + stamina mutate; UI bars re-render.
5. When a side's momentum hits 100, their signature button glows; tap to arm before locking the next pick. Firing spends 50 momentum.

## Decisions actually affect outcomes (proof points)

| Claim                                          | Evidence |
| ---------------------------------------------- | -------- |
| Plans matter                                   | Aggressive vs Defensive → 93.1% win rate (vs 50% control) |
| Adaptive CPU adapts to patterns                | 73-77% win vs 60%-patterned opponent; 100% vs 90% spammer |
| Pattern exploitation is real-time              | Hard CPU counter rate on spammed POWER = 82% |
| Stamina drains and momentum builds             | Aggressive attacker drained to 15.8 stamina over 12 decisions; built 100 momentum |
| Matchup matrix is correctly signed             | POWER vs CURVE = −0.49 (pitcher); POWER vs CHANGEUP = +0.49 (batter) |
| Random vs random is 50/50                      | 50.8% / 49.2% over 1000 matches — confirms no inherent bias |

## What to test on iPad

1. Open https://henry-dynasty.vercel.app → Versus.
2. **Baseball pass-and-play**: Pick two profiles, two teams. New pre-match plan picker appears — pick Aggressive on one side, Defensive on the other. Play several pitches; watch the stamina bar drop faster on the aggressive side. After ~5-6 winning outcomes, momentum bar fills — tap Grand-Slam Swing before locking the swing to fire signature.
3. **Baseball vs CPU**: From the hub, tap VS CPU + Hard. Try spamming Power swings — note the CPU starts throwing curves at you (it adapts after ~5 pitches).
4. **Football pass-and-play**: Same flow with run/pass/trick + blitz/cover/balanced. Long passes are risky (call_pass, !safe); short passes are safe.
5. **Football vs CPU**: Try a heavy run game; CPU should switch to blitz frequency to stop you.

## Unmet scope flagged

- **Basketball + Hockey versus mode does not exist** in this build. Strategic configs are stubbed in `sports.ts` for when they get added (or when combat sports needs another sport template). No regression — the configs are unused at runtime.
- **Online (room-code) versus** wasn't upgraded with the strategic layer in this commit; only Pass-and-Play and VS CPU. Online mode still uses the unmodified engine. The strategic state would need to ride over the existing multiplayer/match protocol — a follow-up task.

## Files touched

| File                                                     | Change |
| -------------------------------------------------------- | ------ |
| `src/sports/strategic/`                                  | NEW — shared strategic module |
| `src/versus/strategic.ts`                                | NEW — versus-specific bridge |
| `src/versus/components/StrategicUI.tsx`                  | NEW — plan picker + bars + signature button |
| `src/versus/types.ts`                                    | + PlayMode `cpu`, + CpuDifficulty type |
| `src/versus/pages/VersusHub.tsx`                         | + VS CPU mode + difficulty picker + CPU team picker |
| `src/versus/pages/BaseballVersus.tsx`                    | + plan phases, strategic state, CPU autopick, signature button, post-process |
| `src/versus/pages/FootballVersus.tsx`                    | same as baseball |

Engine code (`src/versus/engine.ts`) **not touched**. Season-sim (`src/sports-engine/`, `src/sportshub/`) **not touched**.
