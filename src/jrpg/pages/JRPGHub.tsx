// AETHERSONG title screen.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { hasSave, loadSave, newGame, writeSave } from "../engine/save";
import { isMuted, setMuted, playTrack, stopTrack } from "../engine/audio";

export default function JRPGHub() {
  const nav = useNavigate();
  const [saveExists, setSaveExists] = useState(false);
  const [muted, setMutedLocal] = useState(isMuted());
  const [audioStarted, setAudioStarted] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    setSaveExists(hasSave());
    return () => { stopTrack(); };
  }, []);

  function startMusic(): void {
    if (audioStarted) return;
    playTrack("town");
    setAudioStarted(true);
  }

  function onNewGame(): void {
    startMusic();
    const fresh = newGame();
    writeSave(fresh);
    nav("/jrpg/play");
  }

  function onContinue(): void {
    startMusic();
    const s = loadSave();
    if (!s) { onNewGame(); return; }
    nav("/jrpg/play");
  }

  function toggleMute(): void {
    const next = !muted;
    setMuted(next);
    setMutedLocal(next);
    if (next) stopTrack();
    else if (audioStarted) playTrack("town");
  }

  return (
    <div
      onClick={startMusic}
      style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at 50% 30%, #2a1f48 0%, #0b0510 70%, #050308 100%)",
        color: "#fde68a",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        textAlign: "center",
        userSelect: "none",
      }}
    >
      <BackButton onClick={() => nav("/home/adventure")} />
      <MuteButton muted={muted} onClick={toggleMute} />

      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/assets/jrpg/backgrounds/bg_sky.png')",
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.4,
        imageRendering: "pixelated",
      }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{
          fontSize: 14, letterSpacing: 6, color: "#a78bfa", textTransform: "uppercase",
          marginBottom: 8,
        }}>
          A J R P G  &middot;  C h a p t e r  O n e
        </div>
        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(48px, 9vw, 96px)",
          margin: 0, lineHeight: 1.05,
          color: "#fde68a",
          textShadow: "0 0 32px rgba(255,200,80,0.5), 0 0 8px rgba(255,200,80,0.4)",
        }}>
          AETHERSONG
        </h1>
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(16px, 3vw, 24px)",
          color: "#cbd5e1", fontStyle: "italic", marginTop: 4,
        }}>
          The First Refrain
        </div>

        <p style={{
          maxWidth: 480, margin: "32px auto", lineHeight: 1.55,
          color: "#e4e4e7", fontSize: "clamp(14px, 2.4vw, 16px)",
        }}>
          A girl with an off-key voice. A silver lantern in a Hush-touched chapel.
          The world was sung into being - and someone is unsinging it.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", marginTop: 12 }}>
          {saveExists && (
            <MenuButton onClick={onContinue} accent="#fbbf24" label="Continue" sub="Resume your saved game" />
          )}
          <MenuButton onClick={onNewGame} accent="#a78bfa" label={saveExists ? "New Game (erase save)" : "New Game"} sub="Begin Chapter One" />
          <MenuButton onClick={() => setShowAbout(true)} accent="#7dd3fc" label="The World" sub="A glimpse at the world bible" />
        </div>

        <div style={{ marginTop: 36, fontSize: 12, color: "#71717a" }}>
          Original IP &middot; Inspired by classic JRPGs &middot; CC-BY/CC0 assets
        </div>
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}

function MenuButton({ onClick, label, sub, accent }: { onClick: () => void; label: string; sub: string; accent: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "linear-gradient(180deg, rgba(30,20,50,0.85), rgba(15,8,30,0.95))",
        border: "2px solid " + accent,
        borderRadius: 12,
        color: accent,
        fontFamily: "Georgia, serif",
        padding: "14px 28px",
        minWidth: 260,
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4), inset 0 0 12px " + accent + "22",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#a1a1aa", marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute", top: 16, left: 16,
        background: "rgba(20,15,30,0.7)",
        border: "1px solid #71717a",
        color: "#e4e4e7",
        padding: "8px 14px",
        borderRadius: 8, fontSize: 14, cursor: "pointer",
        zIndex: 4,
      }}
    >
      &larr; Arcade
    </button>
  );
}

function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute", top: 16, right: 16,
        background: "rgba(20,15,30,0.7)",
        border: "1px solid #71717a",
        color: "#e4e4e7",
        padding: "8px 14px",
        borderRadius: 8, fontSize: 14, cursor: "pointer",
        zIndex: 4,
      }}
    >
      {muted ? "Audio off" : "Audio on"}
    </button>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520, maxHeight: "80vh", overflowY: "auto",
          background: "linear-gradient(180deg, #1c1530 0%, #0a0418 100%)",
          color: "#e4e4e7", padding: 22, borderRadius: 14,
          border: "2px solid #fbbf24",
          fontFamily: "Georgia, serif", lineHeight: 1.6,
        }}
      >
        <h2 style={{ color: "#fde68a", marginTop: 0 }}>Aethersong - The First Refrain</h2>
        <p>The world of <b>Saevora</b> was sung into being by the First Choir - seven divine voices.
          A thousand years ago the final note of their refrain was lost, and ever since the world has been quietly forgetting itself.</p>
        <p>Where the song dies, the world unmakes into <b>the Hush</b>: silver-grey patches of silence that erase land, memory, and people.</p>
        <p><b>Liora Vey</b> is a 17-year-old in a coastal village. Her voice is flat. The Hush flinches from it. She doesn&apos;t know why.</p>
        <p>The full world bible lives at <code>WORLD_BIBLE.md</code> in the repo. It introduces the party of four,
          the antagonist (the cast-out Eighth Voice), and the seven-chapter arc. This release ships
          <b> Chapter 1 only</b> - Liora alone, the village of Threnfall, and the Silent Chapel.</p>
        <button
          onClick={onClose}
          style={{
            marginTop: 16, padding: "8px 22px",
            background: "#fbbf24", color: "#1c1530",
            border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
          }}
        >Close</button>
      </div>
    </div>
  );
}
