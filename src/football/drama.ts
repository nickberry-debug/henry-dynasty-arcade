// Football drama — generates 2-3 news events per simmed week. Smaller
// template pool than baseball (40+ vs 222) but covers the same shapes:
// funny, injury, hot/cold streak, drama, rumor, milestone, personal,
// weather, comeback, hot-take.
import type { FootballLeague, FootballNewsItem, FootballPlayer, FootballTeam } from "./types";
import { rand, irnd } from "../utils/rand";

interface FootballTemplate {
  id: string;
  category: "funny" | "injury" | "hot" | "cold" | "drama" | "rumor" | "milestone" | "personal" | "hot-take" | "weather";
  emoji: string;
  /** {P} player name, {T} team name, {Tc} city, {N} number 3-50, {Days} 1-7. */
  headline: string;
  body?: string;
  needsPlayer?: boolean;
  /** If set, applies a temporary morale/rating shift. */
  effect?: "moraleBoost" | "moralePenalty" | "hotBoost" | "coldPenalty" | "injury";
  effectDuration?: number;
  effectMag?: number;
}

const TEMPLATES: FootballTemplate[] = [
  // FUNNY
  { id: "ff01", category: "funny", emoji: "🌭", headline: "{P} ate {N} hot dogs at a tailgate — listed as questionable", needsPlayer: true, effect: "moralePenalty", effectDuration: 1, effectMag: 3 },
  { id: "ff02", category: "funny", emoji: "🎮", headline: "{P} caught playing video games at 3 AM — head coach 'unconcerned'", needsPlayer: true },
  { id: "ff03", category: "funny", emoji: "🐕", headline: "{P}'s puppy crashed team meeting — biggest reaction of the week", needsPlayer: true },
  { id: "ff04", category: "funny", emoji: "💃", headline: "{P} dance-celebrated for 8 seconds after a TD — got a $10k fine", needsPlayer: true },
  { id: "ff05", category: "funny", emoji: "📺", headline: "{P} appeared on a cooking show — 'somehow burned water'", needsPlayer: true },
  { id: "ff06", category: "funny", emoji: "🧦", headline: "{T} locker room mystery: someone keeps stealing socks", body: "Coach: 'I have my suspicions.'" },
  { id: "ff07", category: "funny", emoji: "🦆", headline: "Geese on the practice field — drills delayed {Days} hours" },
  { id: "ff08", category: "funny", emoji: "🍕", headline: "Team meeting catered with pizza — {P} ate {N} slices", needsPlayer: true },
  { id: "ff09", category: "funny", emoji: "🪥", headline: "{P} forgot toothbrush on road trip — borrowed teammate's. Teammate 'horrified.'", needsPlayer: true },
  { id: "ff10", category: "funny", emoji: "🦔", headline: "{P} adopted a hedgehog from a fan — locker room now has a Spike", needsPlayer: true },
  { id: "ff11", category: "funny", emoji: "🤡", headline: "{P} showed up to media day in a clown costume — never explained", needsPlayer: true },
  { id: "ff12", category: "funny", emoji: "🛼", headline: "Whole {T} O-line went rollerblading on off-day — they 'regret it'" },

  // INJURY
  { id: "fi01", category: "injury", emoji: "🤕", headline: "{P} pulled hamstring at walkthrough — out {N} days", needsPlayer: true, effect: "injury", effectDuration: 7, effectMag: 5 },
  { id: "fi02", category: "injury", emoji: "💪", headline: "{P} shoulder soreness — listed questionable for Sunday", needsPlayer: true, effect: "injury", effectDuration: 7, effectMag: 4 },
  { id: "fi03", category: "injury", emoji: "🦵", headline: "{P} sprained ankle in practice — week-to-week", needsPlayer: true, effect: "injury", effectDuration: 14, effectMag: 5 },
  { id: "fi04", category: "injury", emoji: "🛏️", headline: "{P} flu — held out two practices, game-time decision", needsPlayer: true, effect: "moralePenalty", effectDuration: 2, effectMag: 3 },
  { id: "fi05", category: "injury", emoji: "🤕", headline: "{P} concussion protocol after a hit — out at least 7 days", needsPlayer: true, effect: "injury", effectDuration: 7, effectMag: 6 },
  { id: "fi06", category: "injury", emoji: "🏥", headline: "Tough news: {P} tore ACL — season over.", needsPlayer: true, effect: "injury", effectDuration: 120, effectMag: 10 },
  { id: "fi07", category: "injury", emoji: "🎢", headline: "{P} hurt back lifting his kid at a theme park — out {N} days", needsPlayer: true, effect: "injury", effectDuration: 5, effectMag: 4 },
  { id: "fi08", category: "injury", emoji: "🦷", headline: "{P} chipped tooth on his own facemask — playing through", needsPlayer: true },

  // HOT
  { id: "fh01", category: "hot", emoji: "🔥", headline: "{P} on a {N}-game TD streak — heating up", needsPlayer: true, effect: "hotBoost", effectDuration: 14, effectMag: 5 },
  { id: "fh02", category: "hot", emoji: "🚀", headline: "{P} averaging {N}+ yards per game — best stretch of his career", needsPlayer: true, effect: "hotBoost", effectDuration: 14, effectMag: 6 },
  { id: "fh03", category: "hot", emoji: "📈", headline: "QB {P} has thrown for 300+ in {N} straight — chasing record book", needsPlayer: true, effect: "hotBoost", effectDuration: 14, effectMag: 6 },
  { id: "fh04", category: "hot", emoji: "🛡️", headline: "{P} has logged {N} sacks in his last 3 games — terror at the LOS", needsPlayer: true, effect: "hotBoost", effectDuration: 14, effectMag: 5 },
  { id: "fh05", category: "hot", emoji: "🎯", headline: "{P} kicker hasn't missed a FG in {N} attempts — automatic", needsPlayer: true, effect: "hotBoost", effectDuration: 10, effectMag: 4 },
  { id: "fh06", category: "hot", emoji: "🏆", headline: "{T} riding {N}-game win streak — division lead growing" },
  { id: "fh07", category: "hot", emoji: "⚡", headline: "Rookie {P} now in MVP conversations — quietly electric", needsPlayer: true, effect: "hotBoost", effectDuration: 21, effectMag: 7 },

  // COLD
  { id: "fc01", category: "cold", emoji: "❄️", headline: "{P} hasn't found the end zone in {N} games — fans restless", needsPlayer: true, effect: "coldPenalty", effectDuration: 7, effectMag: 4 },
  { id: "fc02", category: "cold", emoji: "📉", headline: "{P}'s passer rating drops below 75 — coordinator under fire", needsPlayer: true, effect: "coldPenalty", effectDuration: 7, effectMag: 5 },
  { id: "fc03", category: "cold", emoji: "💔", headline: "{T} have lost {N} of last 5 — coaching staff under scrutiny" },
  { id: "fc04", category: "cold", emoji: "🌧️", headline: "{P} fumbled in three straight games — coach 'evaluating options'", needsPlayer: true, effect: "coldPenalty", effectDuration: 7, effectMag: 4 },
  { id: "fc05", category: "cold", emoji: "🐌", headline: "{T} offense ranks 28th in yards — major retooling rumored" },

  // DRAMA
  { id: "fd01", category: "drama", emoji: "🗯️", headline: "{P} and {T} reportedly far apart on contract talks", needsPlayer: true },
  { id: "fd02", category: "drama", emoji: "💢", headline: "{T} head coach blasts officiating in {N}-minute postgame rant" },
  { id: "fd03", category: "drama", emoji: "📰", headline: "{P} 'unhappy' with role — sources say trade demand looms", needsPlayer: true },
  { id: "fd04", category: "drama", emoji: "🥊", headline: "Bench-clearing scrum at {T} game — no ejections" },
  { id: "fd05", category: "drama", emoji: "📞", headline: "{T} owner spoke with GM 'at length' after Sunday's loss" },

  // RUMOR
  { id: "fr01", category: "rumor", emoji: "🤝", headline: "Buzz: {T} sniffing around the trade market for a pass rusher" },
  { id: "fr02", category: "rumor", emoji: "💼", headline: "{P} being shopped, per one league source — 'fit issue' cited", needsPlayer: true },
  { id: "fr03", category: "rumor", emoji: "🗞️", headline: "Hot stove: {T} 'most aggressive' in pursuit of a CB upgrade" },

  // MILESTONE
  { id: "fm01", category: "milestone", emoji: "🏆", headline: "QB {P} reaches {N}00 career TD passes — Cooperstown of Canton lock", needsPlayer: true },
  { id: "fm02", category: "milestone", emoji: "⚾", headline: "{P} surpasses 1,000 rushing yards — first time in his career", needsPlayer: true, effect: "moraleBoost", effectDuration: 7, effectMag: 5 },
  { id: "fm03", category: "milestone", emoji: "🎖️", headline: "{P} earns his {N}th Pro Bowl nod", needsPlayer: true, effect: "moraleBoost", effectDuration: 14, effectMag: 5 },

  // PERSONAL
  { id: "fp01", category: "personal", emoji: "👶", headline: "{P} welcomed a daughter Monday night — full week of paternity leave", needsPlayer: true, effect: "moraleBoost", effectDuration: 14, effectMag: 6 },
  { id: "fp02", category: "personal", emoji: "💍", headline: "{P} got engaged on the bye-week — fans send congrats", needsPlayer: true, effect: "moraleBoost", effectDuration: 14, effectMag: 5 },
  { id: "fp03", category: "personal", emoji: "🎓", headline: "{P} finished his bachelor's degree this offseason", needsPlayer: true },

  // HOT TAKE
  { id: "fht01", category: "hot-take", emoji: "🎤", headline: "Hot Take: {T} are overrated and will collapse by Week 12" },
  { id: "fht02", category: "hot-take", emoji: "📺", headline: "Bold Prediction: {P} wins Defensive Player of the Year", needsPlayer: true },
  { id: "fht03", category: "hot-take", emoji: "🤔", headline: "Take: {P} is the most underrated QB in football", needsPlayer: true },

  // WEATHER
  { id: "fw01", category: "weather", emoji: "🌨️", headline: "Snow expected at {Tc} stadium Sunday — {N}+ inches forecast" },
  { id: "fw02", category: "weather", emoji: "💨", headline: "30+ mph winds at the {Tc} game — both kickers warming up nervously" },
  { id: "fw03", category: "weather", emoji: "🌧️", headline: "Steady rain in {Tc} — fumbles likely, defenses licking chops" },
];

/** Run after simWeek(). Generates 2-4 events and appends to news. */
export function generateFootballDrama(lg: FootballLeague, count = 3): FootballNewsItem[] {
  const out: FootballNewsItem[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const remaining = TEMPLATES.filter(t => !used.has(t.id));
    if (remaining.length === 0) break;
    const tpl = remaining[Math.floor(rand() * remaining.length)];
    used.add(tpl.id);

    const player = tpl.needsPlayer ? pickBiasedPlayer(lg) : null;
    const team = player ? lg.teams.find(t => t.id === player.teamId) : pickBiasedTeam(lg);
    if (tpl.needsPlayer && !player) continue;

    const N = irnd(3, 50);
    const Days = irnd(1, 7);
    const fill = (s: string) => s
      .replace(/\{P\}/g, player?.name ?? "A player")
      .replace(/\{T\}/g, team?.name ?? "Team")
      .replace(/\{Tc\}/g, team?.city ?? "the city")
      .replace(/\{N\}/g, String(N))
      .replace(/\{Days\}/g, String(Days));

    // Apply effect
    if (tpl.effect && player) {
      if (tpl.effect === "moraleBoost") player.morale = Math.min(100, player.morale + (tpl.effectMag ?? 5));
      else if (tpl.effect === "moralePenalty") player.morale = Math.max(0, player.morale - (tpl.effectMag ?? 5));
      else if (tpl.effect === "hotBoost") player.hot = Math.min(10, player.hot + (tpl.effectMag ?? 5) / 2);
      else if (tpl.effect === "coldPenalty") player.hot = Math.max(-10, player.hot - (tpl.effectMag ?? 5) / 2);
      else if (tpl.effect === "injury" && !player.injury) {
        player.injury = { name: tpl.headline.slice(0, 30), weeksOut: Math.ceil((tpl.effectDuration ?? 7) / 7) };
      }
    }

    const item: FootballNewsItem = {
      id: `fd-${lg.week}-${lg.season}-${tpl.id}-${Math.floor(rand() * 1e4)}`,
      week: lg.week,
      season: lg.season,
      category: "Drama",
      headline: fill(tpl.headline).slice(0, 140),
      body: tpl.body ? fill(tpl.body) : undefined,
      teamIds: team ? [team.id] : undefined,
      playerIds: player ? [player.id] : undefined,
      emoji: tpl.emoji,
      important: tpl.category === "milestone" || tpl.effect === "injury" && (tpl.effectMag ?? 0) >= 8,
    };
    out.push(item);
  }
  lg.newsLog.unshift(...out);
  if (lg.newsLog.length > 200) lg.newsLog.length = 200;
  return out;
}

function pickBiasedPlayer(lg: FootballLeague): FootballPlayer | null {
  const active = lg.players.filter(p => p.teamId && !p.retired);
  if (active.length === 0) return null;
  const weighted: FootballPlayer[] = [];
  for (const p of active) {
    let w = 1;
    if (p.teamId === lg.userTeamId) w *= 2;
    if (p.overall >= 80) w *= 1.5;
    if (Math.abs(p.hot) >= 6) w *= 1.3;
    const ww = Math.max(1, Math.round(w));
    for (let i = 0; i < ww; i++) weighted.push(p);
  }
  return weighted[Math.floor(rand() * weighted.length)] ?? null;
}

function pickBiasedTeam(lg: FootballLeague): FootballTeam | null {
  if (lg.teams.length === 0) return null;
  const weighted: FootballTeam[] = [];
  for (const t of lg.teams) {
    let w = 1;
    if (t.id === lg.userTeamId) w *= 2;
    const ww = Math.max(1, Math.round(w));
    for (let i = 0; i < ww; i++) weighted.push(t);
  }
  return weighted[Math.floor(rand() * weighted.length)] ?? null;
}
