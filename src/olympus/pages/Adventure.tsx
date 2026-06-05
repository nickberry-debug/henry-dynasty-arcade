// The adventure screen — current scene, choices, voice in/out, free-text
// fallback. Every interaction commits to IndexedDB via the store.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useOlympus } from "../store";
import {
  startAdventure, resolveChoice, resolveFreeText, finalizeAdventure, preGenerateBranches, olympusHasApiKey, clearBranchCacheFor, isBranchCached, isBranchInFlight,
} from "../ai";
import type { Choice, Scene } from "../types";
import { CLASS_INFO, classInfoFor } from "../types";
import { pickNarratorVoice, getNarratorRate } from "../tts";
import { hasOpenAITtsKey, synthesizeOpenAI, prewarmOpenAISequence, splitForTTS, getCachedOpenAIUrl } from "../openaiTts";
import { HeroSprite } from "../components/HeroSprite";
import { playSfx, unlockAudio } from "../../art";
import { VoiceInput } from "../components/VoiceInput";
import { Typewriter } from "../components/Typewriter";
import { Confetti } from "../components/Confetti";
import { InventoryPanel } from "../components/InventoryPanel";
import { Volume2, VolumeX, Send, Sword, Brain, MessageCircle, EyeOff, Sparkles, Coins, Compass, Loader, BookOpen, Home, Trash } from "lucide-react";

const KIND_ICONS: Record<Choice["kind"], any> = {
  combat: Sword, wits: Brain, persuasion: MessageCircle, stealth: EyeOff,
  magic: Sparkles, luck: Coins, exploration: Compass, custom: Send,
};
const KIND_COLORS: Record<Choice["kind"], string> = {
  combat: "#c75050", wits: "#6ba8c7", persuasion: "#d4b48a", stealth: "#7a6ec7",
  magic: "#c76eb9", luck: "#85c75c", exploration: "#5ca8c7", custom: "#DAA520",
};

export function AdventureNew() {
  // Spawns a new adventure for the currently active hero and routes to /olympus/adventure.
  const navigate = useNavigate();
  const activeHero = useOlympus(s => s.heroes.find(h => h.id === s.activeHeroId));
  const activeAdventure = useOlympus(s => s.activeAdventure);
  const startNewAdventure = useOlympus(s => s.startNewAdventure);
  const [busy, setBusy] = useState(false);

  // If the hero already has an in-progress adventure, redirect to it
  // instead of letting the user accidentally start a second one. Prevents
  // a hero from getting into a state where their activeAdventureId
  // points to a different adventure than the one they're playing.
  useEffect(() => {
    if (activeAdventure && activeAdventure.status === "active" && activeAdventure.heroId === activeHero?.id) {
      navigate("/olympus/adventure", { replace: true });
    }
  }, [activeAdventure?.id, activeAdventure?.status, activeHero?.id]);
  const [patron, setPatron] = useState<string | undefined>(undefined);
  // End-game gate: hero with all 12 Olympian blessings unlocks "Titans'
  // Return", a special patron that drives Claude to write the climactic
  // hours-long adventure.
  const titansUnlocked = !!activeHero && activeHero.equipment.blessings.length >= 12;
  // Read the default length from Olympus settings so the setting actually
  // takes effect. Was hardcoded to "auto", ignoring the user's preference.
  const [length, setLength] = useState<"auto" | "short" | "medium" | "long" | "epic">(() => {
    try {
      const stored = localStorage.getItem("dd_olympus_length");
      if (stored === "short" || stored === "medium" || stored === "long" || stored === "epic" || stored === "auto") {
        return stored;
      }
    } catch {}
    return "auto";
  });

  if (!activeHero) {
    return <div className="p-8 text-center" style={{ color: "rgba(233,227,210,0.7)" }}>No hero selected. <button onClick={() => navigate("/olympus")} className="underline" style={{ color: "#DAA520" }}>Back to roster</button></div>;
  }

  const begin = async () => {
    if (busy) return;
    setBusy(true);
    const { adventure } = await startAdventure(activeHero, { patron, lengthHint: length });
    await startNewAdventure(adventure);
    navigate("/olympus/adventure");
  };

  const GODS: Array<{ name: string; domain: string }> = [
    ...(titansUnlocked ? [{ name: "Titans' Return", domain: "★ END GAME · the climactic war" }] : []),
    { name: "No patron",   domain: "AI picks a fresh hook" },
    { name: "Zeus",        domain: "Kings, storms, oaths" },
    { name: "Athena",      domain: "Wisdom, strategy, craft" },
    { name: "Apollo",      domain: "Music, prophecy, light" },
    { name: "Artemis",     domain: "Wild lands, the hunt" },
    { name: "Hermes",      domain: "Travel, tricks, thieves" },
    { name: "Poseidon",    domain: "Sea, storms, horses" },
    { name: "Aphrodite",   domain: "Love, beauty, persuasion" },
    { name: "Ares",        domain: "War, courage, ruin" },
    { name: "Hephaestus",  domain: "Forge, fire, invention" },
    { name: "Demeter",     domain: "Harvest, mothers, mourning" },
    { name: "Dionysus",    domain: "Wine, theater, madness" },
    { name: "Hades",       domain: "Underworld, riches, fate" },
  ];
  const hasKey = olympusHasApiKey();

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-5">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>Begin Adventure</div>
        <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>NEW QUEST</h1>
      </header>
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(15,27,45,0.5)", border: "1px solid rgba(218,165,32,0.25)" }}>
        <HeroSprite hero={activeHero} size={72} />
        <div>
          <div className="font-display text-lg" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{activeHero.name}</div>
          <div className="text-[11px]" style={{ color: "rgba(233,227,210,0.65)" }}>Level {activeHero.level} {classInfoFor(activeHero.className).name} · HP {activeHero.hp}/{activeHero.hpMax}</div>
        </div>
      </div>

      <section>
        <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: "#DAA520" }}>Patron Deity (optional)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {GODS.map(g => {
            const selected = (patron ?? "No patron") === g.name;
            return (
              <button
                key={g.name}
                onClick={() => setPatron(g.name === "No patron" ? undefined : g.name)}
                className="text-left px-3 py-2 rounded-lg pressable touch-target"
                style={{
                  background: selected ? "rgba(218,165,32,0.18)" : "rgba(15,27,45,0.5)",
                  border: selected ? "1px solid rgba(218,165,32,0.45)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-xs font-display tracking-wide" style={{ color: selected ? "#DAA520" : "#e9e3d2" }}>{g.name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(233,227,210,0.55)" }}>{g.domain}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-2" style={{ color: "#DAA520" }}>Adventure Length</div>
        <div className="grid grid-cols-5 gap-1.5">
          {(["auto", "short", "medium", "long", "epic"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLength(l)}
              className="px-2 py-1.5 rounded-lg text-xs font-display tracking-wider pressable touch-target"
              style={{
                background: length === l ? "rgba(218,165,32,0.18)" : "rgba(15,27,45,0.5)",
                border: length === l ? "1px solid rgba(218,165,32,0.45)" : "1px solid rgba(255,255,255,0.06)",
                color: length === l ? "#DAA520" : "rgba(233,227,210,0.85)",
              }}
            >{l.toUpperCase()}</button>
          ))}
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: "rgba(233,227,210,0.55)" }}>
          {length === "short" ? "15-20 decisions" : length === "medium" ? "25-30" : length === "long" ? "35-45" : length === "epic" ? "50-80" : "Auto: 20-45"}
        </div>
      </section>

      {!hasKey && (
        <div className="rounded-xl text-xs px-3 py-2.5 space-y-1" style={{ background: "rgba(134,239,172,0.10)", border: "1px solid rgba(134,239,172,0.30)", color: "#e9e3d2" }}>
          <div className="font-display tracking-[0.18em] text-[10px]" style={{ color: "#86efac" }}>OFFLINE STORY MODE</div>
          <div>You're set to play one of four authored quests — a real branching adventure with full encounters, companions, items, and a twist ending. No API key needed.</div>
          <div className="opacity-75 text-[10px]">Want richer dynamic storytelling later? Add an Anthropic key in Settings → Olympus to unlock the AI Storyteller's improvisation on top.</div>
        </div>
      )}

      <button
        onClick={begin}
        disabled={busy}
        className="w-full px-5 py-4 rounded-2xl font-display tracking-[0.2em] pressable touch-target disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "#DAA520", color: "#0F1B2D" }}
      >
        {busy ? <><Loader size={16} className="animate-spin" /> Weaving fate…</> : "BEGIN THE TALE"}
      </button>
    </div>
  );
}

export function AdventurePlay() {
  const navigate = useNavigate();
  const hero = useOlympus(s => s.heroes.find(h => h.id === s.activeAdventure?.heroId));
  const adventure = useOlympus(s => s.activeAdventure);
  const appendSceneToAdventure = useOlympus(s => s.appendSceneToAdventure);
  const completeActiveAdventure = useOlympus(s => s.completeActiveAdventure);
  const abandonActiveAdventure = useOlympus(s => s.abandonActiveAdventure);
  const patchHero = useOlympus(s => s.patchHero);

  const [resolving, setResolving] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("dd_olympus_voice_in") === "1");
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem("dd_olympus_tts") === "1");
  const [finalizing, setFinalizing] = useState(false);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Page-turn SFX on scene change — soft whoosh so each step feels like
  // turning a page in an illuminated manuscript.
  useEffect(() => { unlockAudio(); }, []);
  useEffect(() => {
    if (adventure?.currentIndex !== undefined && adventure.currentIndex > 0) {
      playSfx("whoosh", { volume: 0.4 });
    }
  }, [adventure?.currentIndex]);

  // Pre-generate branches whenever the current scene changes — fires all
  // 4 next-scene API calls in parallel so they're cached and instant by
  // the time Henry finishes reading. Idempotent, so re-firing on a fast
  // remount is harmless.
  useEffect(() => {
    if (!hero || !adventure) return;
    const cur = adventure.scenes[adventure.currentIndex];
    if (cur && !cur.isEnding) {
      preGenerateBranches(hero, adventure).catch(() => { /* swallow */ });
    }
  }, [hero?.id, adventure?.currentIndex]);

  // Poll the pre-gen cache so the choice buttons can show a "ready"
  // indicator. Cheap — runs every 400ms only while the scene is active
  // and pre-gen isn't done for all choices yet. Stops polling once
  // everything's cached.
  const [prefetchTick, setPrefetchTick] = useState(0);
  useEffect(() => {
    if (!adventure) return;
    const cur = adventure.scenes[adventure.currentIndex];
    if (!cur || cur.isEnding) return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      setPrefetchTick(t => t + 1);
      const allReady = cur.choices.slice(0, 4).every(c =>
        isBranchCached(adventure.id, cur.index, c.label));
      if (!allReady) setTimeout(tick, 400);
    };
    setTimeout(tick, 200);
    return () => { stopped = true; };
  }, [adventure?.id, adventure?.currentIndex]);

  // iOS Safari refuses to play HTMLAudio unless audio.play() was called
  // from within a user-gesture handler. Our scene-narration useEffect
  // does its play() inside an async chain after `await synthesizeOpenAI`,
  // so it loses the gesture context and silently fails. Workaround:
  // intercept the FIRST user tap on the adventure page and play a
  // zero-byte audio clip to "unlock" the media pipeline for the session.
  // After this, subsequent .play() calls work even from async useEffects.
  useEffect(() => {
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        // Minimal silent MP3 — 1 frame, ~50 bytes — enough to convince
        // iOS that the user authorized media playback on this page.
        const silent = new Audio("data:audio/mp3;base64,/+MYxAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAA");
        silent.volume = 0;
        silent.play().then(() => { try { silent.pause(); } catch {} }).catch(() => {});
      } catch {}
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("click", unlock, true);
    };
    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("click", unlock, true);
    return () => {
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("click", unlock, true);
    };
  }, []);

  // Read scene aloud when TTS is enabled. Preferred path: OpenAI's
  // audio/speech endpoint with the user-chosen voice (default `fable` —
  // warm British narrator). Falls back to OS Web Speech API when no
  // OpenAI key is configured.
  useEffect(() => {
    if (!ttsEnabled || !adventure) return;
    const cur = adventure.scenes[adventure.currentIndex];
    if (!cur) return;
    let cancelled = false;

    const stopAll = () => {
      try { speechSynthesis.cancel(); } catch {}
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
        audioRef.current = null;
      }
    };
    stopAll();

    (async () => {
      // 1) Try OpenAI TTS if a key is set. Chunked playback: split the
      //    scene into paragraph-sized pieces, play each in sequence so
      //    audio starts after the FIRST chunk synthesizes (~1-2s)
      //    instead of waiting for the whole scene (~10-15s).
      if (hasOpenAITtsKey()) {
        try {
          const chunks = splitForTTS(cur.body);
          const audio = new Audio();
          audio.volume = 0.95;
          audioRef.current = audio;
          let i = 0;
          const playNext = async () => {
            if (cancelled || audioRef.current !== audio) return;
            if (i >= chunks.length) return;
            const chunk = chunks[i++];
            let url: string | null = getCachedOpenAIUrl(chunk);
            if (!url) url = await synthesizeOpenAI(chunk);
            if (!url || cancelled || audioRef.current !== audio) {
              // First chunk failed: bail to OS voice for this scene.
              if (i === 1 && !cancelled) playOSVoice(cur);
              return;
            }
            audio.src = url;
            audio.play().catch(() => {});
          };
          audio.onended = playNext;
          playNext();
          return;
        } catch {
          // Network or quota error — fall through to OS voice.
        }
      }
      if (!cancelled) playOSVoice(cur);
    })();

    return () => {
      cancelled = true;
      stopAll();
    };

    function playOSVoice(scene: Scene) {
      pickNarratorVoice().then(voice => {
        if (cancelled) return;
        try {
          const u = new SpeechSynthesisUtterance(scene.body);
          if (voice) { u.voice = voice; u.lang = voice.lang; }
          u.rate = getNarratorRate();
          u.pitch = scene.atmosphere === "dramatic" ? 0.92 : scene.atmosphere === "playful" ? 1.08 : 1.0;
          u.volume = 0.9;
          ttsRef.current = u;
          speechSynthesis.speak(u);
        } catch { /* silent */ }
      }).catch(() => {});
    }
  }, [ttsEnabled, adventure?.currentIndex]);

  // Pre-warm the audio for the CURRENT scene as soon as it's loaded —
  // doesn't wait for the user to enable TTS. The synthesis takes
  // 5-15s for a full-scene body, so kicking it off here means the
  // audio is cached by the time the speaker is tapped. We split into
  // paragraph-sized chunks (~500 chars each) and synthesize in
  // parallel, then play sequentially via the speaker handler. Gated
  // only on the key being set so users who haven't configured the
  // premium voice don't burn API tokens unintentionally.
  useEffect(() => {
    if (!hasOpenAITtsKey() || !adventure) return;
    const cur = adventure.scenes[adventure.currentIndex];
    if (!cur) return;
    prewarmOpenAISequence(cur.body);
  }, [adventure?.id, adventure?.currentIndex]);

  if (!hero || !adventure) {
    return <div className="p-8 text-center" style={{ color: "rgba(233,227,210,0.7)" }}>No active adventure. <button onClick={() => navigate("/olympus")} className="underline" style={{ color: "#DAA520" }}>Back to hub</button></div>;
  }

  const currentScene = adventure.scenes[adventure.currentIndex];
  const isEnding = currentScene?.isEnding;

  const commitChoice = async (choice: Choice, freeTextValue?: string) => {
    if (resolving || !hero) return;
    setResolving(true);
    try {
      const next: Scene = freeTextValue
        ? await resolveFreeText(hero, adventure, freeTextValue)
        : await resolveChoice(hero, adventure, choice);
      // Apply XP / HP / inventory deltas to the hero.
      await patchHero(hero.id, h => {
        if (next.xpDelta) {
          h.xp += next.xpDelta;
          while (h.xp >= h.xpToNext && h.level < 100) {
            h.xp -= h.xpToNext;
            h.level += 1;
            h.xpToNext = 100 + (h.level * 50);
            // Grant 1 stat point — bump primary. Endurance climbs
            // either directly (when primary IS endurance) or via the
            // ambient +1-every-3-levels nudge below.
            const primary = classInfoFor(h.className).primaryStat;
            h.stats[primary] = Math.min(100, h.stats[primary] + 1);
            if (h.level % 3 === 0) h.stats.endurance = Math.min(100, h.stats.endurance + 1);
            // HP is derived FROM endurance — recompute hpMax on level
            // so the cap grows naturally with the stat. Heal to full
            // on level-up (classic RPG affordance).
            h.hpMax = 50 + h.stats.endurance * 5;
            h.hp = h.hpMax;
          }
        }
        if (typeof next.hpDelta === "number" && next.hpDelta !== 0) {
          // The hero NEVER dies. Floor HP at 1 — when damage would
          // bring them to 0, the storyteller has been instructed to
          // weave in a miraculous save. The clamp guarantees we don't
          // soft-lock the run even if the AI forgets.
          h.hp = Math.max(1, Math.min(h.hpMax, h.hp + next.hpDelta));
        }
        if (next.itemsAdded) {
          for (const it of next.itemsAdded) {
            const existing = h.inventory.find(x => x.name === it.name);
            if (existing) { existing.qty += it.qty ?? 1; continue; }
            // Cap at 10 unique items. Anything beyond the cap is told
            // to the player as "left at base" in the scene flavor —
            // the storyteller is also instructed below to respect this.
            if (h.inventory.length >= 10) continue;
            h.inventory.push({ id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: it.name, kind: it.kind, qty: it.qty ?? 1 });
          }
        }
        if (next.itemsLost) {
          for (const name of next.itemsLost) {
            h.inventory = h.inventory.filter(x => x.name !== name);
          }
        }
        h.modifiedAt = Date.now();
      });
      const historyEntry = {
        scene: currentScene.index,
        choiceLabel: freeTextValue ?? choice.label,
        outcome: next.resolution ?? next.body.slice(0, 80),
      };
      await appendSceneToAdventure(adventure.currentIndex + 1, next, historyEntry);
      if (next.isEnding) {
        // Don't auto-finalize — let user read twist + epilogue first via "Finalize" button.
      }
    } finally {
      setResolving(false);
      setFreeText("");
      setShowFreeText(false);
    }
  };

  const [celebrate, setCelebrate] = useState(false);
  const finalize = async () => {
    if (finalizing) return;
    setFinalizing(true);
    try {
      const result = await finalizeAdventure(hero, adventure);
      await patchHero(hero.id, h => {
        h.journal.push(result.journalEntry);
        h.personality.descriptors = result.updatedDescriptors;
        h.personality.alignment = result.updatedAlignment;
        h.personality.lastUpdated = h.adventuresCompleted;
        h.visualDescription = result.visualDescription;
        // Mark the most recent unfulfilled prophecy as fulfilled if the
        // storyteller flagged it. Earns the "Prophecy Fulfilled" badge
        // visible on the hero profile.
        if (result.prophecyFulfilled && h.dreams) {
          for (let i = h.dreams.length - 1; i >= 0; i--) {
            if (!h.dreams[i].fulfilled) { h.dreams[i].fulfilled = true; break; }
          }
        }
        // Apply any artifact rewards the storyteller flagged. Already
        // validated in ai.ts (catalog ids only, dedup'd, capped at one).
        if (Array.isArray(result.artifactRewards) && result.artifactRewards.length > 0) {
          h.mythicArtifacts = [...(h.mythicArtifacts ?? []), ...result.artifactRewards];
        }
      });
      await completeActiveAdventure();
      clearBranchCacheFor(adventure.id);
      // Celebrate before navigating away — short enough that the user
      // sees confetti, long enough to feel earned.
      setCelebrate(true);
      await new Promise(r => setTimeout(r, 1800));
      navigate(`/olympus/hero/${hero.id}`);
    } finally {
      setFinalizing(false);
    }
  };

  const actLabel = currentScene.act === 1 ? "ACT I" : currentScene.act === 2 ? "ACT II" : "ACT III";

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Confetti active={celebrate} />
      <InventoryPanel hero={hero} />
      {/* Hero status bar */}
      <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl" style={{
        background: hero.hp === 0
          ? "rgba(199,80,80,0.15)"
          : hero.hp < hero.hpMax * 0.3
          ? "rgba(199,80,80,0.08)"
          : "rgba(15,27,45,0.6)",
        border: hero.hp === 0
          ? "1px solid rgba(199,80,80,0.6)"
          : "1px solid rgba(218,165,32,0.2)",
      }}>
        <HeroSprite hero={hero} size={48} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm leading-tight" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{hero.name}</div>
          <div className="text-[10px] flex items-center gap-2 flex-wrap" style={{ color: "rgba(233,227,210,0.7)" }}>
            <span>L{hero.level}</span>
            <span>·</span>
            <span style={{ color: hero.hp < hero.hpMax * 0.3 ? "#c75050" : "rgba(233,227,210,0.85)" }}>HP {hero.hp}/{hero.hpMax}</span>
            <span>·</span>
            <span>{hero.drachma} dr</span>
            {hero.hp === 0 && (
              <span className="px-1.5 py-0.5 rounded font-display tracking-widest" style={{ background: "#c75050", color: "#fff" }}>FALLEN</span>
            )}
            {hero.hp > 0 && hero.hp < hero.hpMax * 0.25 && (
              <span className="px-1.5 py-0.5 rounded font-display tracking-widest" style={{ background: "rgba(199,80,80,0.3)", color: "#ffb0b0" }}>WOUNDED</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const v = !ttsEnabled;
              setTtsEnabled(v);
              try { localStorage.setItem("dd_olympus_tts", v ? "1" : "0"); } catch {}
              if (v && adventure && hasOpenAITtsKey()) {
                const text = adventure.scenes[adventure.currentIndex]?.body;
                if (!text) return;
                // Stop anything still playing.
                if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
                // Chunked playback: split the scene into ~500-char
                // paragraphs and play them in order. Each chunk
                // synthesizes in 1-2s instead of 10-15s for the whole
                // scene, and pre-warm (above) means most/all chunks
                // are already cached.
                const chunks = splitForTTS(text);
                const audio = new Audio();
                audio.volume = 0.95;
                audioRef.current = audio;
                // Sync .play() with no src — claims iOS gesture rights.
                audio.play().catch(() => {});
                let i = 0;
                const playNext = async () => {
                  if (audioRef.current !== audio) return; // stopped
                  if (i >= chunks.length) return;
                  const chunk = chunks[i++];
                  // Prefer cache (sync) — falls back to network fetch.
                  let url: string | null = getCachedOpenAIUrl(chunk);
                  if (!url) url = await synthesizeOpenAI(chunk);
                  if (!url || audioRef.current !== audio) return;
                  audio.src = url;
                  audio.play().catch(() => {});
                };
                audio.onended = playNext;
                playNext();
              } else if (!v) {
                if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
                try { speechSynthesis.cancel(); } catch {}
              }
            }}
            aria-label={ttsEnabled ? "Mute narrator" : "Unmute narrator"}
            className="p-2 rounded-lg pressable touch-target"
            style={{ background: ttsEnabled ? "rgba(218,165,32,0.2)" : "rgba(255,255,255,0.05)", color: ttsEnabled ? "#DAA520" : "rgba(233,227,210,0.6)" }}
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          {/* Skip-narration button — cuts off in-flight audio without
              touching the global TTS toggle. Useful when Henry has
              already read ahead and wants to pick his next choice. */}
          {ttsEnabled && (
            <button
              onClick={() => {
                if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
                try { speechSynthesis.cancel(); } catch {}
              }}
              aria-label="Skip narration for this scene"
              className="p-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(233,227,210,0.7)" }}
            >
              SKIP
            </button>
          )}
        </div>
      </div>

      <div className="text-center mb-3">
        <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(218,165,32,0.7)" }}>
          {actLabel} · Scene {currentScene.index} of {adventure.totalDecisions}
        </div>
        <h1 className="font-display text-xl tracking-[0.1em] mt-0.5" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{adventure.title}</h1>
        {/* Three-act progress bar — colored differently per act, so the
            player can see where they are pacing-wise. */}
        <div className="relative h-1 mt-2 mx-auto rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", maxWidth: 360 }}>
          <motion.div
            className="absolute inset-y-0 left-0"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (currentScene.index / adventure.totalDecisions) * 100)}%` }}
            transition={{ duration: 0.5 }}
            style={{
              background:
                currentScene.act === 1
                  ? "linear-gradient(90deg, #5ca8c7, #6ba8c7)"
                  : currentScene.act === 2
                  ? "linear-gradient(90deg, #6ba8c7, #c79c5c)"
                  : "linear-gradient(90deg, #c79c5c, #DAA520)",
            }}
          />
          {/* Act 1/2 + Act 2/3 boundary markers */}
          <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${(adventure.actBoundaries.act1End / adventure.totalDecisions) * 100}%` }} />
          <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${(adventure.actBoundaries.act2End / adventure.totalDecisions) * 100}%` }} />
        </div>
      </div>

      {/* Scene body. mode="popLayout" + a shorter duration so scenes
          feel snappy on rapid taps; mode="wait" had a noticeable
          400ms dead-time between scene transitions. */}
      <AnimatePresence mode="popLayout">
        <motion.article
          key={currentScene.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl p-4 lg:p-5 mb-3"
          style={{
            background: "rgba(15,27,45,0.5)",
            borderLeft: `3px solid ${atmosphereColor(currentScene.atmosphere)}`,
            boxShadow: "inset 0 0 80px rgba(218,165,32,0.05)",
          }}
        >
          {currentScene.resolution && (
            <div className="mb-3 pb-3 text-sm italic" style={{ color: "rgba(218,165,32,0.85)", borderBottom: "1px solid rgba(218,165,32,0.2)" }}>
              {currentScene.resolution}
            </div>
          )}
          {currentScene.encounter && <EncounterPanel encounter={currentScene.encounter} />}
          <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(233,227,210,0.95)", fontFamily: "'EB Garamond', 'Crimson Text', Georgia, serif" }}>
            {currentScene.body}
          </div>

          {/* Delta indicators */}
          {(currentScene.xpDelta || currentScene.hpDelta || currentScene.itemsAdded?.length || currentScene.itemsLost?.length) && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {!!currentScene.xpDelta && <span className="px-2 py-0.5 rounded" style={{ background: "rgba(218,165,32,0.15)", color: "#DAA520" }}>+{currentScene.xpDelta} XP</span>}
              {!!currentScene.hpDelta && (
                <span className="px-2 py-0.5 rounded" style={{ background: currentScene.hpDelta < 0 ? "rgba(199,80,80,0.15)" : "rgba(63,204,106,0.15)", color: currentScene.hpDelta < 0 ? "#c75050" : "#3fcc6a" }}>
                  {currentScene.hpDelta > 0 ? "+" : ""}{currentScene.hpDelta} HP
                </span>
              )}
              {currentScene.itemsAdded?.map((it, i) => <span key={i} className="px-2 py-0.5 rounded" style={{ background: "rgba(63,204,106,0.15)", color: "#3fcc6a" }}>+ {it.name}</span>)}
              {currentScene.itemsLost?.map((n, i) => <span key={i} className="px-2 py-0.5 rounded" style={{ background: "rgba(199,80,80,0.15)", color: "#c75050" }}>– {n}</span>)}
            </div>
          )}

          {/* Ending content */}
          {isEnding && (
            <div className="mt-5 space-y-4">
              {currentScene.twist && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: "#DAA520" }}>The Twist</div>
                  <p className="text-sm leading-relaxed italic" style={{ color: "rgba(233,227,210,0.9)" }}>
                    <Typewriter text={currentScene.twist} speedMs={22} />
                  </p>
                </div>
              )}
              {currentScene.whatIfEpilogue && (
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(180,140,60,0.10), rgba(80,50,20,0.18))",
                    border: "1px solid rgba(180,140,60,0.25)",
                    filter: "saturate(0.85)",
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: "#c8a16a" }}>What If…</div>
                  <p className="text-sm leading-relaxed italic font-serif" style={{ color: "rgba(233,210,170,0.8)" }}>{currentScene.whatIfEpilogue}</p>
                </div>
              )}
              {currentScene.coda && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: "#DAA520" }}>The Road Home</div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(233,227,210,0.85)" }}>{currentScene.coda}</p>
                </div>
              )}
            </div>
          )}
        </motion.article>
      </AnimatePresence>

      {/* Choices */}
      {!isEnding && (
        <>
          {olympusHasApiKey() && (() => {
            const slice = currentScene.choices.slice(0, 4);
            const readyCount = slice.filter(c => isBranchCached(adventure.id, currentScene.index, c.label)).length;
            const inFlightCount = slice.filter(c => isBranchInFlight(adventure.id, currentScene.index, c.label)).length;
            return (
              <div className="text-[10px] uppercase tracking-[0.25em] mb-2 flex items-center gap-2" style={{ color: "rgba(218,165,32,0.7)" }}>
                <span>{readyCount}/{slice.length} ready</span>
                {inFlightCount > 0 && readyCount < slice.length && (
                  <span style={{ color: "rgba(233,227,210,0.45)" }}>· {inFlightCount} preparing…</span>
                )}
                {/* prefetchTick used to force re-render on cache change */}
                <span className="sr-only">{prefetchTick}</span>
              </div>
            );
          })()}
          <div className="space-y-2 mb-3">
            {currentScene.choices.map((c, i) => {
              const Icon = KIND_ICONS[c.kind] ?? Send;
              const color = KIND_COLORS[c.kind] ?? "#DAA520";
              const cached = i < 4 && isBranchCached(adventure.id, currentScene.index, c.label);
              const inflight = i < 4 && !cached && isBranchInFlight(adventure.id, currentScene.index, c.label);
              return (
                <button
                  key={i}
                  onClick={() => commitChoice(c)}
                  disabled={resolving}
                  className="w-full text-left p-3 rounded-xl flex items-start gap-3 pressable touch-target disabled:opacity-40"
                  style={{
                    background: "rgba(15,27,45,0.6)",
                    border: `1px solid ${color}40`,
                    minHeight: 60,
                  }}
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}25`, color }}>
                    <Icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug flex items-center gap-1.5" style={{ color: "rgba(233,227,210,0.95)" }}>
                      <span className="flex-1">{c.label}</span>
                      {cached && <span title="Next scene ready — instant" style={{ color: "#fbbf24" }}>⚡</span>}
                      {inflight && <span title="Preparing the next scene…" style={{ color: "rgba(233,227,210,0.4)" }}>…</span>}
                    </div>
                    {c.detail && <div className="text-[11px] mt-0.5 italic" style={{ color: "rgba(233,227,210,0.6)" }}>{c.detail}</div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Free text + voice */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={() => setShowFreeText(s => !s)}
                className="px-3 py-2 rounded-lg text-xs font-display tracking-wider flex items-center gap-1.5 pressable touch-target"
                style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520", border: "1px solid rgba(218,165,32,0.25)" }}
              >
                <Send size={12} /> {showFreeText ? "Hide custom action" : "Try your own action"}
              </button>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={e => { setVoiceEnabled(e.target.checked); try { localStorage.setItem("dd_olympus_voice_in", e.target.checked ? "1" : "0"); } catch {} }}
                  className="accent-amber-400"
                />
                <span style={{ color: "rgba(233,227,210,0.7)" }}>Voice input</span>
              </label>
            </div>

            {showFreeText && (
              <form
                onSubmit={e => { e.preventDefault(); if (freeText.trim()) commitChoice({ label: freeText, kind: "custom", freeText: true }, freeText.trim()); }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  value={freeText}
                  onChange={e => setFreeText(e.target.value.slice(0, 200))}
                  placeholder="Type what your hero does…"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
                />
                <button type="submit" disabled={!freeText.trim() || resolving} className="px-4 py-2.5 rounded-xl font-display tracking-wider text-xs pressable touch-target disabled:opacity-40" style={{ background: "#DAA520", color: "#0F1B2D" }}>
                  Resolve
                </button>
              </form>
            )}

            {voiceEnabled && (
              <VoiceInput
                choiceLabels={currentScene.choices.map(c => c.label)}
                onMatchChoice={idx => commitChoice(currentScene.choices[idx])}
                onFreeText={text => commitChoice({ label: text, kind: "custom", freeText: true }, text)}
                enabled={voiceEnabled}
              />
            )}
          </div>

          {resolving && (
            <div className="flex items-center justify-center py-4 text-sm" style={{ color: "rgba(218,165,32,0.85)" }}>
              <Loader size={14} className="animate-spin mr-2" /> The fates weigh your choice…
            </div>
          )}
        </>
      )}

      {/* Ending controls */}
      {isEnding && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={finalize}
            disabled={finalizing}
            className="flex-1 px-5 py-4 rounded-2xl font-display tracking-[0.15em] text-sm pressable touch-target disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            {finalizing ? <><Loader size={16} className="animate-spin" /> Recording legacy…</> : <><BookOpen size={16} /> Close the chapter</>}
          </button>
          <button
            onClick={() => navigate(`/olympus/hero/${hero.id}`)}
            className="px-4 py-4 rounded-2xl text-sm pressable touch-target"
            style={{ background: "rgba(218,165,32,0.1)", border: "1px solid rgba(218,165,32,0.25)", color: "#DAA520" }}
          >
            <Home size={14} />
          </button>
        </div>
      )}

      {/* Always-on abandon */}
      {!isEnding && (
        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              if (window.confirm(`Abandon "${adventure.title}"? You can start a new one anytime, but the story so far won't be recorded as completed.`)) {
                await abandonActiveAdventure();
                clearBranchCacheFor(adventure.id);
                navigate(`/olympus/hero/${hero.id}`);
              }
            }}
            className="text-[11px] underline opacity-60 inline-flex items-center gap-1"
            style={{ color: "rgba(233,227,210,0.6)" }}
          >
            <Trash size={11} /> Abandon adventure
          </button>
        </div>
      )}
    </div>
  );
}

function atmosphereColor(a: Scene["atmosphere"]): string {
  switch (a) {
    case "calm": return "#5ca8c7";
    case "tense": return "#c79c5c";
    case "dramatic": return "#c75050";
    case "mysterious": return "#7a6ec7";
    case "grim": return "#5a5a5a";
    case "playful": return "#85c75c";
    case "divine": return "#DAA520";
    default: return "#DAA520";
  }
}

// ─── Combat HP bars ────────────────────────────────────────────────────
function EncounterPanel({ encounter }: { encounter: import("../types").Encounter }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 rounded-xl p-3"
      style={{
        background: "linear-gradient(135deg, rgba(199,80,80,0.12), rgba(15,27,45,0.7))",
        border: "1px solid rgba(199,80,80,0.35)",
      }}
    >
      {encounter.tagline && (
        <div className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "#ff8b8b", fontFamily: "'Cinzel', serif" }}>
          ⚔️ {encounter.tagline}
        </div>
      )}
      <div className="space-y-2">
        {encounter.enemies.map(e => (
          <EnemyBar key={e.id} enemy={e} />
        ))}
      </div>
    </motion.div>
  );
}

function EnemyBar({ enemy }: { enemy: import("../types").Encounter["enemies"][number] }) {
  const pct = Math.max(0, Math.min(100, (enemy.hp / Math.max(1, enemy.hpMax)) * 100));
  const dead = enemy.hp <= 0;
  const color = dead ? "#5b6781" : pct > 60 ? "#c75050" : pct > 30 ? "#c79c5c" : "#ff8b8b";
  const isBoss = enemy.boss;
  return (
    <div className={dead ? "opacity-50" : ""}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={isBoss ? "text-2xl" : "text-lg"} style={{ filter: dead ? "grayscale(1)" : undefined }}>
            {enemy.emoji ?? (isBoss ? "👹" : "🗡️")}
          </span>
          <div className="min-w-0">
            <div
              className={`font-display tracking-wide truncate ${isBoss ? "text-base" : "text-sm"}`}
              style={{ fontFamily: "'Cinzel', serif", color: isBoss ? "#ff8b8b" : "#e9e3d2" }}
            >
              {enemy.name}{isBoss ? " · BOSS" : ""}
            </div>
            <div className="text-[10px] font-mono" style={{ color: "rgba(233,227,210,0.65)" }}>
              {dead ? "FALLEN" : `${enemy.hp} / ${enemy.hpMax}`}
            </div>
          </div>
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: isBoss ? "1px solid rgba(199,80,80,0.35)" : undefined,
          height: isBoss ? 10 : 8,
        }}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          className="h-full"
          style={{
            background: dead
              ? color
              : `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: isBoss && !dead ? `0 0 8px ${color}55` : undefined,
          }}
        />
      </div>
    </div>
  );
}
