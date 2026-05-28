// New sub-app: Storyteller Mode. Three-act AI-generated stories with
// twist endings. User picks length, genre, twist toggle. Stories save
// to a local library; can be continued for further chapters.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Volume2, Save, Library, ArrowLeft, Loader2, Mic } from "lucide-react";
import { WordplayShell } from "../components/WordplayShell";
import { callAI, parseJSON, useHistory } from "../ai";
import { speak, useVoiceInput, sttSupported } from "../voice";

const ACCENT = "#A78BFA";
const GRADIENT = "linear-gradient(135deg, rgba(167,139,250,0.30), rgba(30,16,50,0.95))";

type Length = "quick" | "short" | "medium" | "epic";
const LENGTHS: Array<{ id: Length; label: string; desc: string; words: number }> = [
  { id: "quick", label: "Quick", desc: "~400 words · 2 min", words: 400 },
  { id: "short", label: "Short", desc: "~900 words · 5 min", words: 900 },
  { id: "medium", label: "Medium", desc: "~1800 words · 10 min", words: 1800 },
  { id: "epic", label: "Epic", desc: "~3500 words · 20 min", words: 3500 },
];

const GENRES = ["Adventure", "Mystery", "Funny", "Spooky", "Sci-Fi", "Fantasy", "Sports", "Realistic", "Surprise Me"];

interface Story {
  id: string;
  title: string;
  protagonist: string;
  genre: string;
  twistType: string;
  actOne: string;
  actTwo: string;
  actThree: string;
  finalLine: string;
  plantedClues: string[];
  twistExplanation: string;
  theme: string;
  idea: string;
  length: Length;
  chapters: number;
  ts: number;
}

// ---------- Fallback story pool ----------
// Used only when the AI call fails (no API key, network error, parse error,
// rate limit). Each story is a complete 3-act with a clue-planted twist.
// We pick one by seeded hash of (idea + genre + seconds-timestamp) so two
// consecutive Generate clicks give different stories even offline.

type StoryShape = Omit<Story, "id" | "ts" | "chapters">;

const FALLBACK_POOL: ((idea: string, genre: string) => StoryShape)[] = [
  // 1. Identity twist - Maya/Solis garden.
  (idea, genre) => ({
    title: "The Whisper in the Wind",
    protagonist: "Maya", genre, twistType: "Identity twist",
    idea, length: "short" as Length,
    actOne: `Maya had always thought her grandmother's garden was just a garden. The roses, the squash, the strange purple flower nobody could name - all just plants. But on the morning of her twelfth birthday, the purple flower whispered her name.\n\nIt was a small whisper, barely there. "Maya."\n\nShe knelt down. "Did you... say something?" The flower bowed slightly in a breeze that wasn't there.`,
    actTwo: `Over three days, Maya learned the flower's name was Solis - the last of its kind, hunted by a man called the Collector. She tried hiding it, digging it up, covering it. Nothing worked. She begged her grandmother for help, but Grandma only smiled that puzzled way grown-ups do.\n\nOn the third night, Maya cried by the flower. Solis whispered: "Then trust the one who planted me."`,
    actThree: `"Grandma - who planted the purple flower?"\n\nHer grandmother set down her knitting. The puzzled look was gone. In its place was something ancient and warm.\n\n"I did. Seventy-six years ago, when I was twelve. The Collector has been hunting me ever since. He doesn't see old women very clearly. That's why I look like this."\n\nThe Collector arrived at dawn, found a sweet old lady knitting and no purple flower anywhere, and drove away frustrated.`,
    finalLine: "And somewhere under the squash leaves, Solis began, very slowly, to bloom again.",
    plantedClues: ["Grandma's 'puzzled' smile was a disguise", "Solis says 'trust the one who planted me'"],
    twistExplanation: "Grandma is the 76-year-old keeper; her 'forgetful' appearance is the protective disguise.",
    theme: "The people who love you protect you in ways you can't see.",
  }),
  // 2. Reversal twist - best friends in chess final.
  (idea, genre) => ({
    title: "The Last Match",
    protagonist: "Eli", genre, twistType: "Reversal twist",
    idea, length: "short" as Length,
    actOne: `Eli and Sam had been the best chess players at Northvale Middle for two years running. Eli had won every championship; Sam had come second every time. They were also best friends. The state final was Saturday.\n\nOn Thursday, Eli's grandfather - who had taught him chess since he was four - had a stroke. The doctors said he'd recover, but slowly. Eli stared at the board and saw nothing but his grandfather's hands.`,
    actTwo: `Sam came over Friday with chess problems. Eli waved him off. "I can't do this tomorrow."\n\n"You have to," Sam said. "You're better than me. You always have been."\n\n"Then YOU win it."\n\nSam looked at the floor. "I can't. Not against you. It wouldn't count."\n\nAt the tournament Saturday, Eli sat down across from Sam. His hands shook. He played the worst chess of his life. He blundered his queen on move twelve.`,
    actThree: `Sam stared at the board for a long time. Then he picked up his bishop and made a worse move - a move so bad that Eli, blinking through tears, almost laughed.\n\nThey traded losing moves for an hour. The judges grew confused. Finally a pawn push produced a stalemate.\n\nIn the lobby, Eli's mother was waiting with the news: Grandpa was awake, asking for him.\n\n"You threw the game," Eli said to Sam.\n\n"So did you," Sam said. "I noticed on move three."`,
    finalLine: "They split the trophy and walked to the hospital together.",
    plantedClues: ["Sam said it 'wouldn't count' against Eli", "Both played absurdly badly from the start"],
    twistExplanation: "Both friends were intentionally losing to spare the other - a mutual sacrifice neither realized the other was making.",
    theme: "Real friendship sometimes looks like losing on purpose.",
  }),
  // 3. Perspective twist - dog and boy mutually rescue.
  (idea, genre) => ({
    title: "Who Rescued Who",
    protagonist: "Bandit", genre, twistType: "Perspective twist",
    idea, length: "short" as Length,
    actOne: `Bandit had been at the shelter for one hundred and four days. The other dogs got picked. The puppies always got picked. Bandit, with his crooked ear and graying muzzle, watched families walk past his kennel without slowing.\n\nThen the boy came. He was small. He had a too-big coat. He smelled like sadness in a way Bandit recognized from the day his old human had stopped coming.\n\nThe boy crouched. He didn't put his hand through the bars. He just sat.`,
    actTwo: `"This one," the boy whispered to his mother.\n\nAt the new house, Bandit learned the boy's name was Theo. Theo's father had died eight months ago. Theo barely spoke. Theo cried at night under his blanket, quietly, so his mother wouldn't hear.\n\nBandit started sleeping at the foot of Theo's bed. When Theo cried, Bandit put his crooked head on Theo's chest until the crying slowed. Bandit had done this before, long ago, for someone else.`,
    actThree: `One night Theo whispered to him, "Mom said the shelter was going to put you down on Monday. We came on Sunday."\n\nBandit licked his cheek.\n\n"Thank you for letting me find you," Theo said.\n\nBandit thought: thank you for letting ME find YOU.`,
    finalLine: "They both slept that night, for the first time in a long time, without crying.",
    plantedClues: ["Bandit recognized the boy's sadness from his own past", "Bandit had done this before, long ago"],
    twistExplanation: "The story we thought was about a boy rescuing a dog was equally about the dog rescuing the boy - each was healing the other.",
    theme: "Sometimes the one who needs saving is also the one doing the saving.",
  }),
  // 4. Setting twist - the dome is a spaceship.
  (idea, genre) => ({
    title: "The View From the Window",
    protagonist: "Nia", genre, twistType: "Setting twist",
    idea, length: "short" as Length,
    actOne: `Nia had lived in the dome her whole life. Twelve years of recycled air, blue-tinted ceiling, and the same view of green hills beyond the wall. Her father said the hills were beautiful. Her mother said the wall kept them safe.\n\nOn her twelfth birthday, the dome would unlock the south airlock for her First Walk - the tradition where every child finally touched the grass outside.`,
    actTwo: `But the morning of her birthday, Nia got curious. She slipped into the maintenance tunnels under the dome looking for the cable junction that fed the blue-tinted ceiling. Her father was an engineer; she knew his keycard.\n\nThe junction was bigger than she expected. She traced the cables up. They didn't lead to the sky. They led to a screen.\n\nShe followed the conduit to its source: a long, humming room full of monitors. Each monitor showed the green hills.`,
    actThree: `Her father found her there.\n\n"Where are we?" Nia asked, very quiet.\n\nHe sighed. He pointed to the largest monitor. The image flickered, and for a second, Nia saw stars. Not the dome's painted stars. Real ones. Vast. Numerous. Wrong.\n\n"We left Earth a hundred and ten years ago," he said. "You're the fourth generation born aboard. The hills are a recording. We thought it would be kinder, until you were old enough."`,
    finalLine: `"Then today," she said, "I want my First Walk to be the real one."`,
    plantedClues: ["Blue-tinted ceiling, not blue sky", "Every child's First Walk happens at the same dome airlock"],
    twistExplanation: "The 'dome' isn't a settlement on Earth - it's a generation ship in deep space, and the hills outside are a comforting projection.",
    theme: "Sometimes growing up means seeing what was kept from you - and choosing it anyway.",
  }),
  // 5. Time twist - letter from older self.
  (idea, genre) => ({
    title: "Dear Future Me",
    protagonist: "Jordan", genre, twistType: "Time twist",
    idea, length: "short" as Length,
    actOne: `On the last day of fifth grade, Mrs. Pell handed out envelopes and said, "Write a letter to your future self. We'll mail them in seven years." Jordan wrote: "Dear future me - I hope you finally talked to Riley. I hope you're not still scared."\n\nJordan sealed the envelope and forgot about it.`,
    actTwo: `Seven years later, the letter arrived on Jordan's eighteenth birthday. Jordan was about to leave for college. The Riley question had - not been answered. Jordan had never said anything. Riley had moved to Oregon in eighth grade and they'd lost touch.\n\nJordan opened the envelope. The handwriting was small and round. But the second page - there was a second page, in different handwriting, neater - said:\n\n"You did fine. I'm okay. I found Riley on the train to college. Trust me."`,
    actThree: `Jordan stared. The second page was in HER handwriting. Older, but hers. She didn't remember writing it.\n\nThen Jordan understood: she would write it. Someday. To herself. Right now. And tuck it into the same envelope before the teacher mailed it, somehow, sometime.\n\nJordan boarded the train to college two weeks later. In car three, a person looked up from a book, and - across the aisle - their eyes met.\n\nRiley smiled.`,
    finalLine: "Jordan reached into her bag for a pen and the envelope she'd written that morning, the one she still had to mail.",
    plantedClues: ["The second page was in Jordan's OWN older handwriting", "The teacher said the letters would be 'mailed' - but who really mailed them?"],
    twistExplanation: "Future Jordan sent the second page back through time as a loop - the letter from the future is a letter Jordan herself will one day write.",
    theme: "Sometimes the bravest person in your life is the future version of yourself, cheering you on.",
  }),
  // 6. Connection twist - lost cat, lost family.
  (idea, genre) => ({
    title: "The Cat That Came Back",
    protagonist: "Owen", genre, twistType: "Connection twist",
    idea, length: "short" as Length,
    actOne: `Owen found the cat on a Tuesday in November - orange, scrawny, with a notched left ear. Owen named him Pumpkin. Pumpkin slept on Owen's pillow and purred like a small engine.\n\nThree weeks later, Owen saw a flyer on a telephone pole: LOST CAT, orange tabby, notched left ear, answers to "Marmalade." Reward.`,
    actTwo: `Owen wrestled with it for two days. He could lie. Nobody would know. But the flyer had a picture and Pumpkin was clearly Marmalade. He showed his dad.\n\nHis dad nodded once. "You know what you have to do."\n\nThe address led to a tall narrow house. An old woman answered. When she saw Pumpkin in Owen's arms, she cried so hard Owen thought she might fall.\n\n"He was my husband's cat," she said. "My husband passed last month. Marmalade ran away the day of the funeral. I thought I'd lost both of them."`,
    actThree: `Owen handed her the cat. The woman pressed an envelope of money into his hand. Owen tried to refuse. She insisted.\n\nOn the way home, Owen opened the envelope. Inside the money was a small photograph: the old woman, young, holding a baby. On the back, in faded ink: "For our son, who we hope will know us someday."\n\nOwen showed his dad. His dad's hands shook.\n\n"That's my mother," his dad whispered. "I was adopted at four months. I never knew her name."`,
    finalLine: "They drove back to the tall narrow house the next morning, with Pumpkin, and rang the bell.",
    plantedClues: ["The dad's odd reaction to the address", "Owen's dad has never talked about HIS parents"],
    twistExplanation: "The 'lost cat' was a thread connecting Owen's adopted father to his birth mother, who'd been searching their whole life.",
    theme: "Doing the right thing returns kindness in ways you can't predict.",
  }),
  // 7. Reality twist - imaginary friend.
  (idea, genre) => ({
    title: "The Friend Nobody Saw",
    protagonist: "Pip", genre, twistType: "Reality twist",
    idea, length: "short" as Length,
    actOne: `Pip had been moved to three foster homes in two years. At the fourth, in a town called Cedar Falls, Pip met Henley on the first day of school. Henley wore mismatched socks and laughed at everything Pip said. Henley sat with Pip at lunch. Henley walked Pip home.\n\nPip's foster mom seemed not to notice when Henley came inside. That was fine. Lots of foster parents didn't notice things.`,
    actTwo: `For six months, Henley was Pip's whole world. They built a treehouse in the woods. They read comics on the roof of the garage. Henley always knew exactly the right joke at exactly the right time.\n\nIn April, the foster mom asked, gently, "Sweetheart - who do you talk to in your room?"\n\nPip said, "Henley."\n\nHis foster mom went very still. Then she sat down and said, "Pip, honey - there's no Henley at your school. I checked."`,
    actThree: `Pip ran to the woods. To the treehouse. It was there. Real. Boards and nails Pip remembered hammering.\n\nBut Pip remembered - every nail - had been hammered by Pip's own hand.\n\nHenley arrived. Smiled. Mismatched socks.\n\n"You knew?" Pip said.\n\n"You needed someone," Henley said. "So I came. You did the rest yourself - the jokes, the comics, the treehouse. I just kept you company while you built it."\n\nPip cried. "Are you going to leave now?"\n\n"No," Henley said. "But you don't need me as much."`,
    finalLine: "Pip nodded, walked home, and that night told his foster mom about everything - the real things and the half-real things - and she listened.",
    plantedClues: ["Pip's foster mom never reacted to Henley", "Henley always 'knew exactly the right joke at exactly the right time'"],
    twistExplanation: "Henley was an imaginary friend Pip's mind created to survive the loneliness of being moved between homes - and that's okay.",
    theme: "Sometimes you have to be your own best friend until the real ones arrive.",
  }),
  // 8. Identity twist - witness protection neighbor.
  (idea, genre) => ({
    title: "Three Doors Down",
    protagonist: "Asha", genre, twistType: "Identity twist",
    idea, length: "short" as Length,
    actOne: `When a new family moved in three doors down, Asha was the first to bring over cookies. The boy who answered the door was her age - quiet, dark eyes, called himself Theo. He didn't go to her school. Homeschooled, his mom said. They'd just moved from "a few places."\n\nAsha and Theo spent the summer together. They biked. They built a raft for the creek. Theo was funny in a way Asha hadn't met before - he laughed like he'd been saving it up.`,
    actTwo: `In August, Asha noticed things. Theo's house didn't have curtains - it had sheets nailed up. Theo never invited her inside. Theo flinched at car horns. Theo's mother always answered the door with one hand behind it.\n\nOn the last day of August, a black sedan parked at the corner. Two men in suits sat inside, watching the house. Asha ran to tell Theo. Theo had already seen them. He was packing.\n\n"Witness Protection," he said, very quietly. "Don't tell anyone you knew me."`,
    actThree: `That night, Asha's father knocked on her door. He was holding her summer journal - the one she'd been keeping about Theo. The pages were blank where his name should have been.\n\n"Sweetheart," her father said. "I work for the marshals. I'm the one who placed them here. I know you didn't know."\n\nAsha stared at her dad - her quiet, ordinary, accountant dad.\n\nThe pages stayed blank.`,
    finalLine: "In the morning, the house three doors down was empty, and on Asha's front step was a single perfect skipping-stone.",
    plantedClues: ["Theo's house had sheets, not curtains", "Theo's mom always kept one hand behind the door", "Asha's dad is described as 'quiet, ordinary'"],
    twistExplanation: "Theo's family was in Witness Protection - and Asha's own dad was the federal marshal who placed them. Her ordinary father had a secret life.",
    theme: "The people closest to us sometimes carry the biggest secrets - to protect us.",
  }),
];

// Deterministic seeded picker. Mixes idea + genre + seconds-resolution
// timestamp so two clicks separated by 1s+ give different fallbacks.
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickFallback(idea: string, genre: string): StoryShape {
  const seed = simpleHash(`${idea}|${genre}|${Math.floor(Date.now() / 1000)}`);
  return FALLBACK_POOL[seed % FALLBACK_POOL.length](idea, genre);
}

const FALLBACK_STORY = (idea: string, genre: string): StoryShape => pickFallback(idea, genre);

export default function Storyteller() {
  const [view, setView] = useState<"input" | "story" | "library">("input");
  const [idea, setIdea] = useState("");
  const [length, setLength] = useState<Length>("short");
  const [genre, setGenre] = useState("Adventure");
  const [twist, setTwist] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"act_one" | "act_two" | "act_three" | "twist" | "done">("act_one");
  const [library, addLib] = useHistory<Story>("storyteller_library", 50);
  const [continuingFrom, setContinuingFrom] = useState<Story | null>(null);
  const vi = useVoiceInput();

  // Apply voice transcript
  useEffect(() => {
    if (vi.transcript && vi.transcript !== idea) {
      setIdea(i => `${i} ${vi.transcript}`.trim());
      vi.reset();
    }
  }, [vi.transcript]);

  // Typewriter-style phase progression while a story is on screen
  useEffect(() => {
    if (!story || view !== "story") return;
    if (phase === "act_one") {
      const t = setTimeout(() => setPhase("act_two"), 800);
      return () => clearTimeout(t);
    }
    if (phase === "act_two") {
      const t = setTimeout(() => setPhase("act_three"), 1200);
      return () => clearTimeout(t);
    }
    if (phase === "act_three") {
      const t = setTimeout(() => setPhase("twist"), 2200);
      return () => clearTimeout(t);
    }
    if (phase === "twist") {
      const t = setTimeout(() => setPhase("done"), 1800);
      return () => clearTimeout(t);
    }
  }, [phase, story, view]);

  const generate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    const wordTarget = LENGTHS.find(l => l.id === length)!.words;
    const finalGenre = genre === "Surprise Me" ? GENRES[Math.floor(Math.random() * (GENRES.length - 1))] : genre;
    // Variety nonce: random elements forced into every call so two clicks with
    // identical idea+genre still produce different stories. Without this the
    // model can land on the same protagonist/setting on repeat calls.
    const POV_OPTIONS = ["first person", "close third person", "observer third person"];
    const TONE_OPTIONS = ["warm and gentle", "witty and quick", "awe-struck and curious", "matter-of-fact and dry", "hopeful and bright"];
    const SETTING_HINTS = ["a small town", "a big city", "a forest", "a coastal village", "a desert town", "a school", "an apartment building", "a national park", "a snowy mountain village", "a riverside neighborhood"];
    const PROTAGONIST_TRAIT = ["painfully shy", "too curious for their own good", "a stubborn negotiator", "a quiet observer", "a chaotic optimist", "a careful planner", "a reluctant leader", "a fierce defender of fairness"];
    const variety = {
      pov: POV_OPTIONS[Math.floor(Math.random() * POV_OPTIONS.length)],
      tone: TONE_OPTIONS[Math.floor(Math.random() * TONE_OPTIONS.length)],
      setting: SETTING_HINTS[Math.floor(Math.random() * SETTING_HINTS.length)],
      trait: PROTAGONIST_TRAIT[Math.floor(Math.random() * PROTAGONIST_TRAIT.length)],
      nonce: Math.random().toString(36).slice(2, 10),
    };
    const ai = await callAI({
      system: "You generate 3-act stories for kids age 8-13. PG, kind, original, vivid, surprising. The twist must be EARNED - plant 2-3 small clues that reframe in hindsight. Output ONLY JSON.",
      user: `USER'S IDEA: ${idea}
LENGTH: ${length} (target approximately ${wordTarget} words total across the 3 acts)
GENRE: ${finalGenre}
INCLUDE TWIST: ${twist ? "YES - design a twist that recasts the story" : "no - focus on a satisfying linear arc"}

VARIETY HINTS (use these to keep this story DIFFERENT from any prior one):
- POV: ${variety.pov}
- Tone: ${variety.tone}
- Setting: ${variety.setting}
- Protagonist trait: ${variety.trait}
- Story nonce (ignore meaning; just use it to vary surface details): ${variety.nonce}

${continuingFrom ? `CONTINUING FROM: "${continuingFrom.title}" - same protagonist (${continuingFrom.protagonist}), same world, new conflict.` : ""}

STRUCTURE:
- ACT 1 (25%): Setup, introduce named protagonist, inciting incident
- ACT 2 (50%): Rising action, obstacles, midpoint reversal, lowest moment
- ACT 3 (25%): Climax, twist (if requested), resolution, memorable final line

REQUIREMENTS:
- PG, age-appropriate (8-13)
- Active voice, vivid verbs, show don't tell
- Twist (if any) must feel inevitable in hindsight, not random
- Themes: friendship, courage, cleverness, kindness, family
- No violence, scary content (mild only if spooky genre), romance, swearing

Return JSON exactly:
{
  "title": "Story title",
  "protagonist_name": "Character name",
  "genre_tone": "${finalGenre}",
  "twist_type": "Which twist category (identity / setting / time / reversal / perspective / reality / connection / none)",
  "act_one": "Full Act 1 prose",
  "act_two": "Full Act 2 prose",
  "act_three": "Full Act 3 prose with twist if requested",
  "final_line": "Last memorable sentence (don't include twice - just write it as the final line of act_three AND repeat it here)",
  "planted_clues": ["Clue 1", "Clue 2"],
  "twist_explanation": "How the twist reframes the story (1-2 sentences)",
  "theme": "What the story is about underneath"
}`,
      maxTokens: Math.max(1500, Math.floor(wordTarget * 2.5)),
      model: length === "epic" || length === "medium" ? "rich" : "fast",
    });
    const parsed = parseJSON<any>(ai);
    // If the AI call failed (no key, network/parse error), surface that
    // in the dev console + leave the user a varied fallback so consecutive
    // attempts don't show the same story.
    if (!parsed) {
      if (ai === null) {
        console.warn("[Storyteller] AI call returned null. Possibilities: no API key set, rate limited, or network error. Using varied fallback.");
      } else {
        console.warn("[Storyteller] AI returned text but JSON parse failed. Using varied fallback. Raw response:", ai);
      }
    }
    let s: Story;
    if (parsed && parsed.act_one && parsed.act_three) {
      s = {
        id: `s-${Date.now()}`,
        title: parsed.title ?? "Untitled",
        protagonist: parsed.protagonist_name ?? "Hero",
        genre: parsed.genre_tone ?? finalGenre,
        twistType: parsed.twist_type ?? "none",
        actOne: parsed.act_one,
        actTwo: parsed.act_two ?? "",
        actThree: parsed.act_three,
        finalLine: parsed.final_line ?? "",
        plantedClues: Array.isArray(parsed.planted_clues) ? parsed.planted_clues : [],
        twistExplanation: parsed.twist_explanation ?? "",
        theme: parsed.theme ?? "",
        idea, length, ts: Date.now(),
        chapters: continuingFrom ? continuingFrom.chapters + 1 : 1,
      };
    } else {
      const fb = FALLBACK_STORY(idea, finalGenre);
      s = { ...fb, length, id: `s-${Date.now()}`, ts: Date.now(), chapters: 1 };
    }
    setStory(s);
    addLib(s);
    setPhase("act_one");
    setView("story");
    setLoading(false);
    setContinuingFrom(null);
  };

  const continueChapter = (prev: Story) => {
    setContinuingFrom(prev);
    setIdea(`Continue the story of ${prev.protagonist} from "${prev.title}". New adventure, same character and world.`);
    setLength(prev.length);
    setGenre(prev.genre);
    setView("input");
  };

  return (
    <WordplayShell title="Storyteller" emoji="📚" accent={ACCENT} gradient={GRADIENT}>
      <div className="space-y-4">
        {/* Top tabs */}
        <div className="flex gap-2">
          <button onClick={() => { setView("input"); setStory(null); }}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "input" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "input" ? "#1a1308" : "#fff", minHeight: 44 }}>NEW STORY</button>
          <button onClick={() => setView("library")}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-display tracking-widest pressable touch-target"
            style={{ background: view === "library" ? ACCENT : "rgba(255,255,255,0.05)", color: view === "library" ? "#1a1308" : "#fff", minHeight: 44 }}>
            <Library size={11} className="inline mr-1" /> LIBRARY · {library.length}
          </button>
        </div>

        {/* INPUT view */}
        {view === "input" && (
          <div className="space-y-3">
            {continuingFrom && (
              <div className="rounded-xl p-3" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}55` }}>
                <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>CONTINUING</div>
                <div className="text-[12px] text-white mt-1">"{continuingFrom.title}" · Chapter {continuingFrom.chapters + 1}</div>
                <button onClick={() => { setContinuingFrom(null); setIdea(""); }}
                  className="text-[10px] text-ink-300 underline mt-1">Start over</button>
              </div>
            )}

            <section className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] tracking-widest font-display" style={{ color: ACCENT }}>WHAT'S YOUR STORY ABOUT?</div>
              <textarea value={idea} onChange={e => setIdea(e.target.value)}
                placeholder="e.g. 'A dog who finds a magical bone' or 'What if pizza was alive?'"
                aria-label="What's your story about?"
                rows={3}
                className="w-full rounded-lg bg-black/40 px-3 py-2.5 text-[14px] text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                style={{ border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }} />
              {sttSupported() && (
                <button onClick={() => vi.listening ? vi.stop() : vi.start()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] pressable touch-target"
                  style={{
                    background: vi.listening ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${vi.listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: vi.listening ? "#fca5a5" : "#fff",
                    minHeight: 36,
                  }}>
                  <Mic size={12} /> {vi.listening ? "STOP" : "SPEAK IDEA"}
                </button>
              )}
            </section>

            <section className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200">STORY LENGTH</div>
              <div className="grid grid-cols-2 gap-1.5">
                {LENGTHS.map(l => (
                  <button key={l.id} onClick={() => setLength(l.id)}
                    className="rounded-lg px-3 py-2 text-left pressable touch-target"
                    style={{
                      background: length === l.id ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${length === l.id ? ACCENT : "rgba(255,255,255,0.08)"}`,
                      minHeight: 56,
                    }}>
                    <div className="text-[12px] font-display" style={{ color: length === l.id ? ACCENT : "#fff" }}>{l.label}</div>
                    <div className="text-[10px] text-ink-300 mt-0.5">{l.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] tracking-widest font-display text-ink-200">GENRE</div>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => (
                  <button key={g} onClick={() => setGenre(g)}
                    className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
                    style={{
                      background: genre === g ? `${ACCENT}33` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${genre === g ? `${ACCENT}88` : "rgba(255,255,255,0.07)"}`,
                      color: genre === g ? ACCENT : "#fff",
                      minHeight: 34,
                    }}>{g}</button>
                ))}
              </div>
            </section>

            <button onClick={() => setTwist(!twist)}
              role="switch"
              aria-checked={twist}
              aria-label={`Twist ending - currently ${twist ? "on" : "off"}`}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg pressable touch-target"
              style={{
                background: twist ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${twist ? ACCENT : "rgba(255,255,255,0.08)"}`,
                minHeight: 44,
              }}>
              <span className="text-[13px]">Twist ending</span>
              <span aria-hidden="true" className="w-10 h-6 rounded-full relative" style={{ background: twist ? ACCENT : "rgba(255,255,255,0.30)" }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: twist ? 18 : 2 }} />
              </span>
            </button>

            <button onClick={generate} disabled={!idea.trim() || loading}
              className="w-full px-4 py-4 rounded-2xl font-display tracking-widest pressable touch-target text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: ACCENT, color: "#1a1308", minHeight: 60 }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> SPINNING THE TALE...</> : <><Sparkles size={14} /> GENERATE STORY</>}
            </button>
          </div>
        )}

        {/* STORY view */}
        {view === "story" && story && (
          <article className="space-y-4">
            <header className="text-center py-2">
              <div className="text-[10px] tracking-widest" style={{ color: ACCENT }}>{story.genre.toUpperCase()} · {story.length.toUpperCase()}{story.chapters > 1 ? ` · CHAPTER ${story.chapters}` : ""}</div>
              <h1 className="font-display text-2xl text-white mt-1">{story.title}</h1>
            </header>

            <AnimatePresence>
              {(phase === "act_one" || phase === "act_two" || phase === "act_three" || phase === "twist" || phase === "done") && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                  className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] tracking-widest mb-2" style={{ color: ACCENT }}>ACT ONE</div>
                  <div className="text-[13px] text-white leading-relaxed whitespace-pre-wrap">{story.actOne}</div>
                </motion.section>
              )}
              {(phase === "act_two" || phase === "act_three" || phase === "twist" || phase === "done") && story.actTwo && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                  className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] tracking-widest mb-2" style={{ color: ACCENT }}>ACT TWO</div>
                  <div className="text-[13px] text-white leading-relaxed whitespace-pre-wrap">{story.actTwo}</div>
                </motion.section>
              )}
              {phase === "twist" && (
                <motion.div key="twist-banner" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center rounded-xl p-4"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}33, rgba(30,16,50,0.95))`, border: `2px solid ${ACCENT}` }}>
                  <div className="font-display tracking-widest text-base" style={{ color: ACCENT }}>✨ TWIST ✨</div>
                </motion.div>
              )}
              {(phase === "act_three" || phase === "twist" || phase === "done") && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                  className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] tracking-widest mb-2" style={{ color: ACCENT }}>ACT THREE</div>
                  <div className="text-[13px] text-white leading-relaxed whitespace-pre-wrap">{story.actThree}</div>
                </motion.section>
              )}
              {phase === "done" && story.plantedClues.length > 0 && (
                <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="rounded-xl p-4 space-y-2"
                  style={{ background: `${ACCENT}11`, border: `1px solid ${ACCENT}44` }}>
                  <div className="text-[10px] tracking-widest" style={{ color: ACCENT }}>WHAT YOU MAY HAVE MISSED</div>
                  {story.twistExplanation && <div className="text-[12px] text-white italic">{story.twistExplanation}</div>}
                  {story.plantedClues.map((c, i) => (
                    <div key={i} className="text-[11px] text-ink-100">🔍 {c}</div>
                  ))}
                  {story.theme && <div className="text-[10px] text-ink-300 mt-2 italic">Theme: {story.theme}</div>}
                </motion.section>
              )}
            </AnimatePresence>

            {phase === "done" && (
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => speak(`${story.title}. ${story.actOne} ${story.actTwo} ${story.actThree}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] pressable touch-target"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 44 }}>
                  <Volume2 size={12} /> READ ALOUD
                </button>
                <button onClick={() => continueChapter(story)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: `${ACCENT}33`, color: ACCENT, border: `1px solid ${ACCENT}88`, minHeight: 44 }}>
                  <Sparkles size={12} /> CONTINUE STORY
                </button>
                <button onClick={() => { setView("input"); setStory(null); setIdea(""); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                  style={{ background: ACCENT, color: "#1a1308", minHeight: 44 }}>
                  NEW STORY
                </button>
              </div>
            )}
          </article>
        )}

        {/* LIBRARY view */}
        {view === "library" && (
          <div className="space-y-2">
            {library.length === 0 && <div className="text-center text-sm text-ink-300 italic py-8">No stories yet. Generate your first one!</div>}
            {library.map(s => (
              <button key={s.id} onClick={() => { setStory(s); setPhase("done"); setView("story"); }}
                className="w-full text-left rounded-xl p-3 pressable touch-target"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", minHeight: 60 }}>
                <div className="text-[10px]" style={{ color: ACCENT }}>{s.genre.toUpperCase()} · {s.length.toUpperCase()}{s.chapters > 1 ? ` · CH ${s.chapters}` : ""}</div>
                <div className="font-display text-sm text-white mt-0.5">{s.title}</div>
                <div className="text-[11px] text-ink-200 mt-0.5 line-clamp-1 italic">{s.theme || s.idea}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </WordplayShell>
  );
}
