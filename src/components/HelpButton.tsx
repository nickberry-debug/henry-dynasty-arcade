import { useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useModal, dialogProps } from "../a11y";

interface HelpButtonProps {
  topic: string;
  title?: string;
  children: React.ReactNode;
}

export function HelpButton({ topic, title, children }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center pressable touch-target"
        aria-label={`Help: ${topic}`}
      >
        <HelpCircle size={18} className="text-accent" aria-hidden="true" />
      </button>
      {open && <HelpDialog topic={topic} title={title} onClose={() => setOpen(false)}>{children}</HelpDialog>}
    </>
  );
}

function HelpDialog({ topic, title, onClose, children }: { topic: string; title?: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal({ onClose, containerRef: dialogRef });
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        ref={dialogRef}
        {...dialogProps("help-dialog-title")}
        className="glass max-w-md w-full rounded-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/5 flex items-center justify-center pressable" aria-label="Close help">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="text-xs uppercase tracking-widest text-accent font-display mb-1">{title ?? "Quick Help"}</div>
        <h2 id="help-dialog-title" className="font-display text-2xl mb-3">{topic}</h2>
        <div className="text-sm text-ink-100 leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}
