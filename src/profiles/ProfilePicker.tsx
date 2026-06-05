// "Who's Playing?" — the launch gate. Five family avatar cards + an
// "Add Player" tile. Tapping a card sets the active profile and the
// arcade home loads with that profile's context.

import { motion } from "framer-motion";
import { useProfiles, type Profile } from "./store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Wifi, Check, Copy, Pencil } from "lucide-react";
import { ensureFamilyRoom, getRoomCode, setRoomCode } from "../sync/cloudBlob";

interface Props {
  onPicked: () => void;
}

export function ProfilePicker({ onPicked }: Props) {
  const { profiles, selectProfile, upsertProfile } = useProfiles();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  // Family room code — auto-created on first launch. Visible so a second
  // family device can paste this code in to sync to the same dataset.
  const [roomCode, setLocalRoomCode] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinValue, setJoinValue] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setLocalRoomCode(ensureFamilyRoom() ?? getRoomCode());
  }, []);
  function copyRoom() {
    if (!roomCode) return;
    try {
      navigator.clipboard?.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  }
  function joinRoom() {
    const clean = joinValue.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 6) return;
    setRoomCode(clean);
    setLocalRoomCode(clean);
    setShowJoin(false);
    setJoinValue("");
    // After joining, reload to pull the joined family's data on next boot.
    setTimeout(() => location.reload(), 250);
  }

  function pick(p: Profile) {
    selectProfile(p.id);
    onPicked();
  }

  function addPlayer() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = `p_${Date.now()}`;
    upsertProfile({
      id, name: trimmed, handle: trimmed.toUpperCase().replace(/\s+/g, ""),
      tagline: "New Player",
      color: "#86efac",
      avatar: "/assets/kenney/mini/character-male-b.png",
      title: "Rookie", age: "kid",
      createdAt: Date.now(), modifiedAt: Date.now(),
    });
    setAdding(false); setNewName("");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, rgba(192,132,252,0.20), transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.16), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #fff, transparent), " +
            "radial-gradient(1px 1px at 68% 22%, #fff, transparent), " +
            "radial-gradient(1.4px 1.4px at 48% 38%, #ffd54a, transparent), " +
            "radial-gradient(1.4px 1.4px at 22% 88%, #c084fc, transparent)",
        }} />

      <motion.header
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="text-center mb-8"
      >
        <div className="text-[10px] tracking-[0.4em] font-display uppercase" style={{ color: "#c9b6f0" }}>
          Berry Kids' Arcade
        </div>
        <h1 className="font-display text-3xl sm:text-4xl tracking-[0.15em] mt-2"
          style={{ color: "#ffd54a", textShadow: "0 0 24px rgba(255,213,74,0.3)" }}>
          WHO'S PLAYING?
        </h1>
      </motion.header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl w-full">
        {profiles.map((p, i) => (
          <ProfileCard key={p.id} profile={p} index={i} onPick={() => pick(p)} onEdit={() => navigate(`/profile/edit/${p.id}`)} />
        ))}
        {!adding && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08 * profiles.length, type: "spring", stiffness: 220, damping: 22 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAdding(true)}
            className="rounded-2xl p-4 flex flex-col items-center justify-center pressable touch-target"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "2px dashed rgba(255,255,255,0.18)",
              color: "#c4b5fd", minHeight: 180,
            }}
            aria-label="Add a new player profile"
          >
            <Plus size={32} aria-hidden="true" />
            <div className="font-display tracking-widest text-xs mt-2">ADD PLAYER</div>
          </motion.button>
        )}
        {adding && (
          <div className="rounded-2xl p-4 flex flex-col gap-2 col-span-2 sm:col-span-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.18)", minHeight: 180 }}>
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c9b6f0" }}>NEW PLAYER</div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addPlayer(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
              placeholder="Their name…"
              aria-label="New player's name"
              className="rounded-md px-3 py-2 outline-none text-sm"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }}
            />
            <div className="flex gap-2 mt-auto">
              <button onClick={addPlayer} disabled={!newName.trim()}
                className="flex-1 px-3 py-2 rounded-md text-xs font-display tracking-widest pressable touch-target disabled:opacity-40"
                style={{ background: "#ffb302", color: "#1a1208", minHeight: 40 }}>
                ADD
              </button>
              <button onClick={() => { setAdding(false); setNewName(""); }}
                className="px-3 py-2 rounded-md text-xs pressable"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", minHeight: 40 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mt-8 text-center text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "#9aa6bf" }}
      >
        Tap your avatar to start playing
      </motion.div>

      {/* Family cloud-sync indicator — auto-syncs saves across devices on
          the same family code. Tap to copy; second device taps "Join" and
          pastes to share the same data. */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="mt-6 flex items-center gap-2 text-[10px]"
      >
        {!showJoin && (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
              style={{ background: "rgba(134,239,172,0.08)", border: "1px solid rgba(134,239,172,0.25)", color: "#bbf7d0" }}>
              <Wifi size={11} aria-hidden="true" />
              <span className="tracking-widest">FAMILY CODE</span>
              <span className="font-display tracking-[0.2em] ml-1" style={{ color: "#86efac" }}>
                {roomCode ?? "—"}
              </span>
              {roomCode && (
                <button onClick={copyRoom} aria-label="Copy family code"
                  className="ml-1 pressable touch-target"
                  style={{ color: copied ? "#86efac" : "#bbf7d0", minWidth: 22, minHeight: 22 }}>
                  {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
                </button>
              )}
            </span>
            <button onClick={() => setShowJoin(true)}
              className="px-2.5 py-1 rounded-full pressable touch-target"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#c9b6f0", minHeight: 28 }}
            >Join family code</button>
          </>
        )}
        {showJoin && (
          <span className="inline-flex items-center gap-1">
            <input value={joinValue}
              onChange={e => setJoinValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") joinRoom(); if (e.key === "Escape") setShowJoin(false); }}
              maxLength={6}
              placeholder="6-char code"
              aria-label="Paste family code"
              className="px-2 py-1 rounded-md outline-none uppercase tracking-[0.2em] text-center"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: 110 }}
              autoFocus />
            <button onClick={joinRoom} disabled={joinValue.replace(/[^A-Za-z0-9]/g, "").length !== 6}
              className="px-2.5 py-1 rounded-md pressable touch-target disabled:opacity-40"
              style={{ background: "#86efac", color: "#052e16", minHeight: 28 }}>JOIN</button>
            <button onClick={() => { setShowJoin(false); setJoinValue(""); }}
              className="px-2.5 py-1 rounded-md pressable"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", minHeight: 28 }}>Cancel</button>
          </span>
        )}
      </motion.div>
    </div>
  );
}

function ProfileCard({ profile, index, onPick, onEdit }: { profile: Profile; index: number; onPick: () => void; onEdit: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08 * index, type: "spring", stiffness: 220, damping: 22 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative"
    >
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPick}
      aria-label={`Play as ${profile.name}, ${profile.tagline}`}
      className="rounded-2xl p-4 text-left pressable touch-target relative overflow-hidden group w-full"
      style={{
        background: `linear-gradient(135deg, ${profile.color}22, rgba(10,10,20,0.85))`,
        border: `1px solid ${profile.color}66`,
        minHeight: 180,
        boxShadow: `0 6px 22px -10px ${profile.color}30, 0 0 0 1px ${profile.color}1A inset`,
      }}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none transition-opacity group-hover:opacity-50"
        style={{ background: `radial-gradient(420px 180px at 80% -10%, ${profile.color}, transparent 60%)` }} />
      <div className="relative flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2 overflow-hidden"
          style={{ background: `${profile.color}22`, border: `2px solid ${profile.color}88`, boxShadow: `0 4px 18px ${profile.color}44` }}>
          <img src={profile.avatar} alt="" aria-hidden="true" draggable={false}
            style={{ width: 56, height: 56, imageRendering: "pixelated", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }} />
        </div>
        <div className="font-display text-lg tracking-wide" style={{ color: profile.color }}>{profile.name.toUpperCase()}</div>
        <div className="text-[10px] mt-0.5" style={{ color: "rgba(233,227,210,0.7)" }}>
          {profile.tagline}
        </div>
        <div className="text-[9px] mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: `${profile.color}22`, color: profile.color, border: `1px solid ${profile.color}55` }}>
          <ArrowRight size={10} aria-hidden="true" /> {profile.handle}
        </div>
      </div>
    </motion.button>
      {/* Edit pencil — sibling button (can't nest <button> inside <button>).
          Tapping it routes to /profile/edit/:id; tapping the rest of the
          card still picks the profile. */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        aria-label={`Edit ${profile.name}'s profile`}
        className="absolute pressable touch-target rounded-full"
        style={{
          top: 6, right: 6, width: 32, height: 32, minWidth: 32, minHeight: 32,
          background: "rgba(5,5,15,0.7)",
          border: `1px solid ${profile.color}88`,
          color: profile.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(2px)",
        }}>
        <Pencil size={13} aria-hidden="true" />
      </button>
    </motion.div>
  );
}
