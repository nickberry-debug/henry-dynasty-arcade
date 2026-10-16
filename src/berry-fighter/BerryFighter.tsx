import { useState } from "react";
import { Link } from "react-router-dom";

const GAME = "/games/berry-fighter/index.html";
const WINDOWS = "/downloads/berry-fighter-windows.zip";

/** Arcade entry point; the Godot engine is downloaded only on explicit launch. */
export default function BerryFighter() {
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (playing) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0d252e] text-[#f7efd6]">
        <nav aria-label="Game navigation" className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-3 py-2 pt-[max(8px,env(safe-area-inset-top))] text-sm">
          <button className="min-h-11 rounded-lg px-3 hover:bg-white/10 focus-visible:outline" onClick={() => { setPlaying(false); setLoaded(false); }}>Back to Berry Arcade</button>
          <span className="hidden text-[#d0eb84] sm:inline">BERRY FIGHTER · COMBAT DEMO</span>
          <a className="min-h-11 content-center rounded-lg px-3 underline" href={GAME}>Open full screen</a>
        </nav>
        {!loaded && <p role="status" className="p-3 text-center">Loading the game… First launch downloads the engine.</p>}
        <iframe
          title="Berry Fighter game"
          src={GAME}
          className="min-h-0 w-full flex-1 border-0"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d252e] px-5 pb-12 pt-[max(24px,env(safe-area-inset-top))] text-[#f7efd6]">
      <div className="mx-auto max-w-5xl">
        <Link to="/home/action" className="inline-flex min-h-11 items-center text-[#b9d5cd] underline">Back to Action &amp; Combat</Link>
        <header className="grid items-center gap-8 py-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[.22em] text-[#d0eb84]">Berry Arcade / Originals</p>
            <h1 className="text-6xl font-black leading-[.95] tracking-tight sm:text-7xl">Berry<br />Fighter</h1>
            <p className="mt-6 max-w-lg text-xl leading-relaxed text-[#b9d5cd]">Small heroes. Big knockback. Two fighters and one floating garden to put the fundamentals to the test.</p>
            <p className="mt-4 text-sm text-[#b9d5cd]">Base engine demo · Provisional characters · No weapons</p>
          </div>
          <img src="/games/berry-fighter/preview.png" alt="Pip and Bramble in the floating garden arena" className="w-full rounded-2xl border border-white/15 shadow-xl" />
        </header>

        <section aria-label="Play and install" className="rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-7">
          <h2 className="text-2xl font-bold">Your arcade. Your device.</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => setPlaying(true)} className="min-h-14 rounded-xl bg-[#d0eb84] px-7 text-lg font-bold text-[#0d252e] hover:bg-[#e4f5b6]">Play in browser</button>
            <a href={WINDOWS} download className="inline-flex min-h-14 items-center rounded-xl border border-[#d0eb84]/50 px-6 font-semibold">Download for Windows</a>
            <a href={GAME} className="inline-flex min-h-14 items-center rounded-xl border border-white/20 px-6 font-semibold">Open for iPad install</a>
          </div>
          <div className="mt-7 grid gap-7 text-[#b9d5cd] sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-bold text-[#f7efd6]">iPad: add to your Home Screen</h3>
              <p className="leading-relaxed">Open the game using the iPad link in Safari. Tap Share, then Add to Home Screen. Launch once online and let it finish loading before trying offline. Use landscape and turn on Touch in the game menu.</p>
              <p className="mt-3 text-sm">This is an installable web app. iPad performance and controller behavior still need a real-device playtest.</p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-[#f7efd6]">Laptop: browser or Windows app</h3>
              <p className="leading-relaxed">Play here with keyboard or a controller. For the Windows build, download the ZIP, extract it, and run BerryFighter.exe. Plug in controllers before the match; press a controller button if your browser has not detected it.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2" aria-label="Modes and controls">
          <div className="rounded-2xl border border-white/15 p-6">
            <h2 className="text-xl font-bold text-[#d0eb84]">Fundamentals first</h2>
            <p className="mt-3 leading-relaxed text-[#b9d5cd]">Pick Pip or Bramble. Test movement and attacks against the CPU, practice with unlimited stocks, or play two-player local versus. Story, bosses, weapons, and more arenas come after the core feels right.</p>
          </div>
          <div className="rounded-2xl border border-white/15 p-6">
            <h2 className="text-xl font-bold text-[#d0eb84]">Learn the rhythm</h2>
            <p className="mt-3 leading-relaxed text-[#b9d5cd]">A/D move · Space jumps twice · J/K/L attack · Shift shields · E dodges · Esc pauses. Build percentage damage, then launch opponents out. Full controller and second-player controls are in the game.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
