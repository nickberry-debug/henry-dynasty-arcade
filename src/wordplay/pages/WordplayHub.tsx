// Wordplay Hub — internal landing. 13 sub-app cards in a grid.
// Each card has its own gradient + accent + emoji + short tagline.
// API keys are configured arcade-wide from the Landing settings —
// this hub just shows a small status pill so Henry knows AI is on.
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { hasAnthropicKey } from "../../arcade/keys";
import { ArcadeSettings } from "../../arcade/ArcadeSettings";

interface SubApp {
  to: string;
  emoji: string;
  title: string;
  tagline: string;
  accent: string;
  gradient: string;
}

export const SUB_APPS: SubApp[] = [
  { to: "/wordplay/madlibs",          emoji: "📝", title: "Mad Libs",        tagline: "Fill in the blanks. Crack everyone up.", accent: "#FFD54A", gradient: "linear-gradient(135deg, rgba(255,180,40,0.25), rgba(40,20,8,0.85))" },
  { to: "/wordplay/jokes",            emoji: "😂", title: "Jokes",            tagline: "20 categories of fresh one-liners.",     accent: "#FF6B9D", gradient: "linear-gradient(135deg, rgba(255,80,140,0.25), rgba(40,8,20,0.85))" },
  { to: "/wordplay/quiz",             emoji: "🎯", title: "Quiz Show",        tagline: "Trivia by category and difficulty.",      accent: "#60A5FA", gradient: "linear-gradient(135deg, rgba(70,170,255,0.25), rgba(10,20,40,0.85))" },
  { to: "/wordplay/stories",          emoji: "📖", title: "Story Starters",   tagline: "Openings that beg to be finished.",       accent: "#C084FC", gradient: "linear-gradient(135deg, rgba(170,100,250,0.25), rgba(20,8,40,0.85))" },
  { to: "/wordplay/fortune",          emoji: "🥠", title: "Fortune Cookie",   tagline: "Crack it. See what fate says.",           accent: "#FCA5A5", gradient: "linear-gradient(135deg, rgba(220,80,80,0.25), rgba(40,10,10,0.85))" },
  { to: "/wordplay/magic8",           emoji: "🎱", title: "Magic 8 Ball",     tagline: "Ask, shake, learn your future.",          accent: "#94A3B8", gradient: "linear-gradient(135deg, rgba(80,90,110,0.35), rgba(8,10,15,0.95))" },
  { to: "/wordplay/twenty-questions", emoji: "🔮", title: "20 Questions",     tagline: "AI vs. you. Who's faster?",               accent: "#34D399", gradient: "linear-gradient(135deg, rgba(40,180,140,0.25), rgba(8,30,20,0.85))" },
  { to: "/wordplay/would-you-rather", emoji: "🤔", title: "Would You Rather", tagline: "Two choices. No going back.",             accent: "#FB923C", gradient: "linear-gradient(135deg, rgba(250,150,60,0.25), rgba(40,20,8,0.85))" },
  { to: "/wordplay/what-am-i",        emoji: "🔍", title: "What Am I?",       tagline: "Clue by clue. Less = more points.",       accent: "#818CF8", gradient: "linear-gradient(135deg, rgba(120,130,240,0.25), rgba(10,15,40,0.85))" },
  { to: "/wordplay/improv",           emoji: "🎭", title: "Improv Scenes",    tagline: "Act out scenes with AI.",                 accent: "#F87171", gradient: "linear-gradient(135deg, rgba(220,80,80,0.25), rgba(40,10,10,0.85))" },
  { to: "/wordplay/conversation",     emoji: "💬", title: "Conversation",     tagline: "Questions that spark real talk.",         accent: "#86EFAC", gradient: "linear-gradient(135deg, rgba(90,200,140,0.25), rgba(15,30,20,0.85))" },
  { to: "/wordplay/word-chain",       emoji: "🔗", title: "Word Chain",       tagline: "Free associate. See how long you go.",    accent: "#22D3EE", gradient: "linear-gradient(135deg, rgba(40,200,230,0.25), rgba(8,25,35,0.85))" },
  { to: "/wordplay/personality",      emoji: "🍕", title: "Personality",      tagline: "Which Greek god / dinosaur / hero?",      accent: "#F472B6", gradient: "linear-gradient(135deg, rgba(245,120,180,0.25), rgba(40,8,30,0.85))" },
];

/** 10 new sub-apps added in V2. Kept in their own list so the landing
 *  can show a NEW! divider between them and the original 13. */
export const NEW_SUB_APPS: SubApp[] = [
  { to: "/wordplay/storyteller",   emoji: "📚", title: "Storyteller",      tagline: "3-act stories with twist endings.",       accent: "#A78BFA", gradient: "linear-gradient(135deg, rgba(167,139,250,0.30), rgba(30,16,50,0.95))" },
  { to: "/wordplay/adventure",     emoji: "🎮", title: "Adventure",        tagline: "Choose your path, find the ending.",      accent: "#34D399", gradient: "linear-gradient(135deg, rgba(52,211,153,0.30), rgba(8,30,20,0.95))" },
  { to: "/wordplay/mystery-box",   emoji: "🎲", title: "Mystery Box",      tagline: "Tap. Be surprised.",                      accent: "#FCD34D", gradient: "linear-gradient(135deg, rgba(252,211,77,0.30), rgba(40,28,8,0.95))" },
  { to: "/wordplay/rap-battle",    emoji: "🎤", title: "Rap Battle",       tagline: "AI drops a verse. Drop yours back.",      accent: "#22D3EE", gradient: "linear-gradient(135deg, rgba(34,211,238,0.30), rgba(8,25,35,0.95))" },
  { to: "/wordplay/hero-maker",    emoji: "🦸", title: "Hero Maker",       tagline: "Invent your own superhero.",              accent: "#F87171", gradient: "linear-gradient(135deg, rgba(248,113,113,0.30), rgba(40,10,10,0.95))" },
  { to: "/wordplay/liar-liar",     emoji: "🃏", title: "Liar Liar",        tagline: "Two truths and a lie. Spot it.",          accent: "#F472B6", gradient: "linear-gradient(135deg, rgba(244,114,182,0.30), rgba(40,8,30,0.95))" },
  { to: "/wordplay/lyric-lab",     emoji: "🎵", title: "Lyric Lab",        tagline: "Original songs you actually want to sing.", accent: "#A3E635", gradient: "linear-gradient(135deg, rgba(163,230,53,0.30), rgba(20,30,8,0.95))" },
  { to: "/wordplay/settler",       emoji: "⚖️", title: "Settler",          tagline: "Bring an argument to the AI judge.",      accent: "#FBBF24", gradient: "linear-gradient(135deg, rgba(251,191,36,0.30), rgba(40,28,8,0.95))" },
  { to: "/wordplay/charades",      emoji: "🎭", title: "Charades",         tagline: "Act it out. Pictures or words.",          accent: "#EC4899", gradient: "linear-gradient(135deg, rgba(236,72,153,0.30), rgba(40,8,30,0.95))" },
  { to: "/wordplay/quiet-game",    emoji: "🤫", title: "Quiet Game",       tagline: "How long can you stay silent?",           accent: "#A78BFA", gradient: "linear-gradient(135deg, rgba(167,139,250,0.30), rgba(30,16,50,0.95))" },
];

/** Codex's 13-sub-app addition. Surfaced as a third row on the hub. */
export const CODEX_SUB_APPS: SubApp[] = [
  { to: "/wordplay/game-helper",   emoji: "🕹️", title: "Game Helper",      tagline: "Stuck? Talk to your AI game coach.",       accent: "#818CF8", gradient: "linear-gradient(135deg, rgba(129,140,248,0.30), rgba(15,10,40,0.95))" },
  { to: "/wordplay/story-chain",   emoji: "⛓️", title: "Story Chain",      tagline: "You and AI build a story together.",       accent: "#C084FC", gradient: "linear-gradient(135deg, rgba(192,132,252,0.30), rgba(20,8,40,0.95))" },
  { to: "/wordplay/one-word",      emoji: "🗣️", title: "One Word",         tagline: "One word at a time. Total chaos.",         accent: "#34D399", gradient: "linear-gradient(135deg, rgba(52,211,153,0.30), rgba(8,30,20,0.95))" },
  { to: "/wordplay/companion",     emoji: "🐾", title: "Companion Pet",    tagline: "Pick your companion, name them, chat.",    accent: "#F97316", gradient: "linear-gradient(135deg, rgba(249,115,22,0.30), rgba(40,18,8,0.95))" },
  { to: "/wordplay/game-show",     emoji: "🎰", title: "Game Show",        tagline: "Benny Buzzworth hosts. You answer.",       accent: "#FBBF24", gradient: "linear-gradient(135deg, rgba(251,191,36,0.30), rgba(30,20,5,0.95))" },
  { to: "/wordplay/detective",     emoji: "🕵️", title: "Detective",        tagline: "Find the culprit. Crack the case.",        accent: "#F59E0B", gradient: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(30,15,5,0.95))" },
  { to: "/wordplay/explain-it",    emoji: "🧠", title: "Explain It",       tagline: "Big idea? AI makes it kid-simple.",        accent: "#60A5FA", gradient: "linear-gradient(135deg, rgba(96,165,250,0.30), rgba(10,20,40,0.95))" },
  { to: "/wordplay/social-coach",  emoji: "🤝", title: "Social Coach",     tagline: "Practice tricky social situations.",       accent: "#86EFAC", gradient: "linear-gradient(135deg, rgba(134,239,172,0.30), rgba(10,30,20,0.95))" },
  { to: "/wordplay/what-if",       emoji: "💥", title: "What Happens If?", tagline: "Wild hypotheticals. Science answers.",     accent: "#F472B6", gradient: "linear-gradient(135deg, rgba(244,114,182,0.30), rgba(40,8,30,0.95))" },
  { to: "/wordplay/curiosity-cam", emoji: "📷", title: "Curiosity Cam",    tagline: "Describe anything. Get the story.",        accent: "#FCD34D", gradient: "linear-gradient(135deg, rgba(252,211,77,0.30), rgba(40,30,5,0.95))" },
  { to: "/wordplay/science-sidekick", emoji: "🔬", title: "Science Sidekick", tagline: "Ask why. Get safe experiments too.",    accent: "#4ADE80", gradient: "linear-gradient(135deg, rgba(74,222,128,0.30), rgba(8,30,15,0.95))" },
  { to: "/wordplay/ask-anything",  emoji: "🙋", title: "Ask Anything",     tagline: "No dumb questions. AI answers all.",       accent: "#22D3EE", gradient: "linear-gradient(135deg, rgba(34,211,238,0.28), rgba(5,15,25,0.97))" },
  { to: "/wordplay/just-talk",     emoji: "💬", title: "Just Want Talk",   tagline: "Good day, bad day — someone's listening.", accent: "#A78BFA", gradient: "linear-gradient(135deg, rgba(167,139,250,0.28), rgba(10,5,25,0.97))" },
];

export default function WordplayHub() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiOn, setAiOn] = useState(hasAnthropicKey());
  const onSettingsClose = () => { setSettingsOpen(false); setAiOn(hasAnthropicKey()); };

  return (
    <div className="min-h-screen safe-top safe-bottom" style={{ background: "linear-gradient(180deg, #1a0c2e 0%, #050306 100%)" }}>
      {/* Header — back arrow, title, AI status pill, settings gear */}
      <header className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/play")}
          className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"
          aria-label="Back to arcade"
          style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#c9b6f0" }}>BERRY KID'S ARCADE</div>
          <div className="font-display text-2xl tracking-widest">💬 WORDPLAY HUB</div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target relative"
          aria-label="Settings"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: aiOn ? "#c9b6f0" : "#9aa6bf",
            minWidth: 44, minHeight: 44, touchAction: "manipulation",
          }}
        >
          <SettingsIcon size={18} />
          {!aiOn && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />}
        </button>
      </header>

      <div className="px-4 pb-10 max-w-3xl mx-auto">
        {/* Title strip with subtle status info */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-base text-white">Pick a game</div>
            <div className="text-[11px] text-ink-200">36 ways to play with words</div>
          </div>
          {aiOn ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-display tracking-widest" style={{
              background: "rgba(201,182,240,0.12)",
              border: "1px solid rgba(201,182,240,0.30)",
              color: "#c9b6f0",
            }}>
              <Sparkles size={11} /> AI ON
            </div>
          ) : (
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-display tracking-widest pressable touch-target"
              style={{
                background: "rgba(255,179,2,0.10)",
                border: "1px solid rgba(255,179,2,0.30)",
                color: "#ffd54a",
                minHeight: 32, touchAction: "manipulation",
              }}
            >
              <Sparkles size={11} /> ADD API KEY
            </button>
          )}
        </div>

        {/* 13 classic cards */}
        <div className="text-[10px] tracking-[0.4em] font-display text-ink-200 mb-2">CLASSIC GAMES</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SUB_APPS.map((sa, i) => (
            <SubAppCard key={sa.to} sa={sa} delay={i * 0.02} onNavigate={navigate} />
          ))}
        </div>

        {/* NEW! divider — fancy gradient rule */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,182,240,0.4), transparent)" }} />
          <div className="font-display tracking-[0.4em] text-[10px] px-3 py-1 rounded-md"
            style={{ background: "rgba(201,182,240,0.12)", border: "1px solid rgba(201,182,240,0.35)", color: "#c9b6f0" }}>
            ✨ NEW · 10 MORE
          </div>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,182,240,0.4), transparent)" }} />
        </div>

        {/* 10 new cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {NEW_SUB_APPS.map((sa, i) => (
            <SubAppCard key={sa.to} sa={sa} delay={i * 0.02 + 0.05} onNavigate={navigate} isNew />
          ))}
        </div>

        {/* Even-newer divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)" }} />
          <div className="font-display tracking-[0.4em] text-[10px] px-3 py-1 rounded-md"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", color: "#c4b5fd" }}>
            ⚡ EVEN MORE · 13 MORE
          </div>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)" }} />
        </div>

        {/* Codex's 13 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CODEX_SUB_APPS.map((sa, i) => (
            <SubAppCard key={sa.to} sa={sa} delay={i * 0.02 + 0.05} onNavigate={navigate} isNew />
          ))}
        </div>
      </div>

      {settingsOpen && <ArcadeSettings onClose={onSettingsClose} />}
    </div>
  );
}

function SubAppCard({ sa, delay, onNavigate, isNew }: {
  sa: SubApp;
  delay: number;
  onNavigate: (path: string) => void;
  isNew?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      onClick={() => onNavigate(sa.to)}
      className="text-left rounded-2xl p-4 pressable touch-target flex flex-col gap-1.5 relative overflow-hidden"
      style={{
        background: sa.gradient,
        border: `1px solid ${sa.accent}55`,
        minHeight: 132,
        touchAction: "manipulation",
      }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(300px 120px at 80% -10%, ${sa.accent}66, transparent 60%)` }}
      />
      {isNew && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-display tracking-widest"
          style={{ background: sa.accent, color: "#0a0a14" }}>
          NEW
        </div>
      )}
      <div className="relative text-3xl leading-none">{sa.emoji}</div>
      <div className="relative font-display tracking-widest text-[12px] mt-1" style={{ color: sa.accent }}>
        {sa.title.toUpperCase()}
      </div>
      <div className="relative text-[11px] text-ink-100 leading-snug">{sa.tagline}</div>
    </motion.button>
  );
}
