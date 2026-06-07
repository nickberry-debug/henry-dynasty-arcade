// src/versus/components/StrategicUI.tsx
//
// Plan picker, momentum/stamina bars, signature-play button. Kid-friendly
// minimal UI used by BaseballVersus + FootballVersus.

import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { GAME_PLANS } from "../../sports/strategic";
import type { GamePlan, PlanId } from "../../sports/strategic";

export interface PlanPickerScreenProps {
  whoseName: string;
  whoseColor: string;
  prompt?: string;
  onLock: (plan: GamePlan) => void;
}

export function PlanPickerScreen({ whoseName, whoseColor, prompt, onLock }: PlanPickerScreenProps) {
  return (
    <section className="rounded-2xl p-4 space-y-3"
      style={{ background: `linear-gradient(135deg, ${whoseColor}14, rgba(10,10,20,0.92))`, border: `1.5px solid ${whoseColor}` }}>
      <div className="text-center">
        <div className="text-[10px] tracking-[0.3em]" style={{ color: whoseColor }}>{whoseName.toUpperCase()} · GAME PLAN</div>
        <div className="text-[12px] mt-1 opacity-85" style={{ color: "#fef3c7" }}>{prompt ?? "Pick how your team plays today."}</div>
      </div>
      <div className="grid gap-2">
        {(["aggressive","balanced","defensive"] as PlanId[]).map(id => {
          const plan = GAME_PLANS[id];
          const color = id === "aggressive" ? "#f97316" : id === "balanced" ? "#86efac" : "#60a5fa";
          return (
            <motion.button key={id} whileTap={{ scale: 0.97 }} onClick={() => onLock(plan)}
              className="rounded-xl p-3 text-left pressable touch-target"
              style={{ background: `linear-gradient(135deg, ${color}26, rgba(10,10,20,0.85))`, border: `1.5px solid ${color}`, minHeight: 72 }}>
              <div className="flex items-center gap-2">
                <div className="text-2xl">{id === "aggressive" ? "🔥" : id === "balanced" ? "⚖️" : "🛡️"}</div>
                <div className="flex-1">
                  <div className="font-display tracking-widest text-[13px]" style={{ color }}>{plan.label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.78)" }}>{plan.tradeoff}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export interface StrategicBarsProps {
  aLabel: string;
  aColor: string;
  aMomentum: number;
  aStamina: number;
  bLabel: string;
  bColor: string;
  bMomentum: number;
  bStamina: number;
}

export function StrategicBars(props: StrategicBarsProps) {
  return (
    <section className="rounded-2xl p-2.5 space-y-2"
      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <SideBars label={props.aLabel} color={props.aColor} momentum={props.aMomentum} stamina={props.aStamina} />
      <SideBars label={props.bLabel} color={props.bColor} momentum={props.bMomentum} stamina={props.bStamina} />
    </section>
  );
}

function SideBars({ label, color, momentum, stamina }: { label: string; color: string; momentum: number; stamina: number }) {
  const sigReady = momentum >= 100;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 shrink-0">
        <div className="text-[9px] tracking-widest font-display" style={{ color }}>{label.toUpperCase()}</div>
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <Flame size={10} style={{ color: sigReady ? "#fde047" : color }} />
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full" aria-label="momentum"
              style={{ width: `${momentum}%`, background: sigReady ? "linear-gradient(90deg,#fde047,#f97316)" : color, transition: "width 0.4s ease" }} />
          </div>
          <div className="text-[9px] w-7 text-right opacity-70">{Math.round(momentum)}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={10} style={{ color: stamina < 30 ? "#f87171" : "#86efac" }} />
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full" aria-label="stamina"
              style={{ width: `${stamina}%`, background: stamina < 30 ? "#f87171" : "#86efac", transition: "width 0.4s ease" }} />
          </div>
          <div className="text-[9px] w-7 text-right opacity-70">{Math.round(stamina)}</div>
        </div>
      </div>
    </div>
  );
}

export interface SignatureButtonProps {
  ready: boolean;
  armed: boolean;
  label: string;
  flavor: string;
  color?: string;
  onToggle: () => void;
}

export function SignatureButton({ ready, armed, label, flavor, color = "#fde047", onToggle }: SignatureButtonProps) {
  if (!ready) return null;
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      animate={armed ? { scale: [1, 1.03, 1] } : {}}
      transition={armed ? { repeat: Infinity, duration: 1.4 } : {}}
      onClick={onToggle}
      className="w-full rounded-xl p-3 pressable touch-target"
      style={{
        background: armed ? `linear-gradient(135deg, ${color}, #f97316)` : `linear-gradient(135deg, ${color}26, rgba(10,10,20,0.85))`,
        border: `2px solid ${color}`,
        color: armed ? "#0a0a14" : color,
        boxShadow: armed ? `0 0 18px ${color}aa` : "none",
        minHeight: 56,
      }}
      aria-pressed={armed}
      aria-label={`Signature play ${label}`}>
      <div className="flex items-center justify-center gap-2">
        <Flame size={16} />
        <span className="font-display tracking-widest text-[12px]">{armed ? "ARMED · " : ""}{label}</span>
      </div>
      <div className="text-[10px] opacity-80 mt-0.5">{flavor}</div>
    </motion.button>
  );
}
