// Crew Traitor — safe-chat presets + emote bar. Tap-only, no free-text
// input. Each tap broadcasts the chosen line to the room (via a small
// patch onto the public room doc's `safeChatLog` array). Lines auto-
// timeout 15s after they're posted so old chatter doesn't pile up.
//
// For the solo (vs-CPU) mode, this component is purely local — chats
// land in a passed-in callback. Online wires the callback through the
// room module so all clients see the same feed.
//
// All presets are kid-safe by design: there's no way to type
// custom text, and the curated list avoids accusations beyond what a
// 5yo would say at the table ("Was that you?" / "Skip!" / "🤔").

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ChatMessage {
  id: string;
  fromProfileId: string;
  fromName: string;
  fromColor: string;
  text: string;
  ts: number;
}

const PRESETS = [
  "I'm in {ROOM}.",
  "Was that you?",
  "Skip — I dunno.",
  "I saw something.",
  "I was alone the whole time.",
  "Not me!",
  "I think I know.",
  "Let's vote.",
];

const EMOTES = ["👍", "👎", "🤔", "😮", "🎯", "🛡️", "💥", "🕵️"];

interface Props {
  /** Recent messages (capped to last ~6). */
  messages: ChatMessage[];
  /** Send a new message — caller decides where to write (local or remote). */
  onSend: (text: string) => void;
  /** Optional substitution for {ROOM}. */
  currentRoomName?: string;
  /** If set, gate sending (e.g. ghosts can't chat). */
  disabled?: boolean;
}

export function SafeChat({ messages, onSend, currentRoomName, disabled }: Props) {
  const [open, setOpen] = useState(false);
  // Prune messages older than 20s for the in-modal view.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const visible = messages.filter(m => now - m.ts < 20_000).slice(-6);

  function send(text: string) {
    if (disabled) return;
    const final = text.replace("{ROOM}", currentRoomName ?? "this room");
    onSend(final);
  }

  return (
    <section className="rounded-xl p-2"
      style={{ background: "rgba(155,227,255,0.08)", border: "1px solid rgba(155,227,255,0.30)" }}>
      <div className="flex items-center justify-between">
        <div className="text-[9px] tracking-[0.3em]" style={{ color: "#9be3ff" }}>
          💬 SAFE CHAT {disabled && <span className="opacity-60">· you're a ghost</span>}
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="text-[9px] tracking-widest px-2 py-1 rounded-full"
          style={{ background: "rgba(155,227,255,0.18)", border: "1px solid rgba(155,227,255,0.45)", color: "#9be3ff" }}>
          {open ? "HIDE" : "OPEN"}
        </button>
      </div>

      {/* Live feed — last 6 messages within 20s window. */}
      <AnimatePresence initial={false}>
        {visible.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-1.5 space-y-0.5 max-h-28 overflow-auto">
            {visible.map(m => (
              <li key={m.id}
                className="text-[11px] flex items-baseline gap-1.5">
                <span className="font-display tracking-widest text-[9px]" style={{ color: m.fromColor }}>
                  {m.fromName.toUpperCase()}
                </span>
                <span style={{ color: "rgba(229,231,235,0.92)" }}>{m.text}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {open && (
        <div className="mt-2">
          <div className="text-[9px] tracking-widest mb-1" style={{ color: "rgba(229,231,235,0.6)" }}>QUICK PHRASES</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map(p => (
              <button key={p} onClick={() => send(p)} disabled={disabled}
                className="rounded-md px-2 py-1.5 text-left text-[11px] pressable touch-target"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(155,227,255,0.30)",
                  color: "#fef3c7",
                  opacity: disabled ? 0.5 : 1,
                }}>
                {p.replace("{ROOM}", currentRoomName ?? "here")}
              </button>
            ))}
          </div>
          <div className="text-[9px] tracking-widest mt-2 mb-1" style={{ color: "rgba(229,231,235,0.6)" }}>EMOTES</div>
          <div className="grid grid-cols-8 gap-1">
            {EMOTES.map(e => (
              <button key={e} onClick={() => send(e)} disabled={disabled}
                aria-label={`Emote ${e}`}
                className="rounded-md text-xl py-1 pressable touch-target"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(155,227,255,0.30)",
                  opacity: disabled ? 0.5 : 1,
                }}>{e}</button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
