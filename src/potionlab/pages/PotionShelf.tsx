// Bottled potions shelf — last 24 brews, newest first.

import { motion } from "framer-motion";
import { Volume2, Trash2 } from "lucide-react";
import { PotionLabShell, LAB_PURPLE } from "../components/PotionLabShell";
import { PotionBottle } from "../components/PotionBottle";
import { usePotionSave } from "../store";
import { speak } from "../../wordplay/voice";

export default function PotionShelf() {
  const { state, setState } = usePotionSave();

  const clear = () => {
    if (!confirm("Empty the whole shelf? Bottles can't be brewed back from this.")) return;
    setState(s => ({ ...s, shelf: [] }));
  };

  return (
    <PotionLabShell title="Your Shelf" subtitle={`${state.shelf.length} of 24 bottles`} backTo="/potion-lab" emoji="🍶">
      <div className="space-y-3">
        {state.shelf.length === 0 ? (
          <div className="rounded-xl p-6 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
            <div className="text-[13px] text-violet-200/85">Shelf is empty.</div>
            <div className="text-[11px] text-violet-200/70 mt-1">Brew something at the cauldron and it'll land here.</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {state.shelf.map((p, i) => (
                <motion.button key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  onClick={() => p.narration && speak(p.narration)}
                  aria-label={`${p.name} bottle — tap to hear the brewmaster again`}
                  className="rounded-xl p-2 flex flex-col items-center pressable touch-target"
                  style={{
                    background: `linear-gradient(180deg, ${p.color}22, rgba(10,6,18,0.92))`,
                    border: `1px solid ${p.color}55`,
                    minHeight: 130,
                  }}>
                  <PotionBottle color={p.color} size={64} />
                  <div className="text-[10px] font-display mt-1 text-center text-violet-50 truncate w-full">{p.emoji} {p.name}</div>
                  {p.narration && <Volume2 size={10} className="text-violet-200/60 mt-1" aria-hidden="true" />}
                </motion.button>
              ))}
            </div>
            <button onClick={clear}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] pressable touch-target"
              style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#fca5a5", minHeight: 40 }}>
              <Trash2 size={11} aria-hidden="true" /> Empty shelf
            </button>
          </>
        )}
      </div>
    </PotionLabShell>
  );
}
