// Confirmation dialog for irreversible actions. Kid-friendly: spells out consequences,
// "Are you sure?" with explicit yes/no, optional "don't ask again" for power users.
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

interface Props {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel = "Yes, do it", cancelLabel = "Never mind", destructive = false, onConfirm, onCancel }: Props) {
  useScrollLock(open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
          role="dialog" aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
            className="glass max-w-md w-full rounded-2xl p-6 relative card-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onCancel} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/5 flex items-center justify-center pressable touch-target" aria-label="Cancel"><X size={16} /></button>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${destructive ? "bg-red-500/20" : "bg-amber-400/20"}`}>
                <AlertTriangle size={22} className={destructive ? "text-red-400" : "text-amber-400"} />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="font-display text-xl tracking-wide mb-1">{title}</div>
                <div className="text-sm text-ink-100 leading-relaxed">{body}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-white/5 text-sm font-medium pressable touch-target">{cancelLabel}</button>
              <button onClick={onConfirm} className={`px-4 py-2.5 rounded-xl text-sm font-display tracking-wider pressable touch-target ${destructive ? "bg-red-500 text-white" : "bg-accent text-ink-950"}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
