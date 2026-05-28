// Movie Mogul — engine. Time advancement, production progress,
// release simulation, box office, monthly burn, rivals, awards, news.

import type {
  Studio, Production, ReleasedMovie, Talent, NewsItem,
  RivalStudio, ProductionStage, AwardNomination, Genre, Script,
  ContentRating, ContentComfort, CaveatId,
} from "./types";
import { uid, rand, irnd, choice } from "../utils/rand";
import { refreshScriptMarket, generateRisingTalent } from "./generate";
import { EVENT_TEMPLATES, fillTemplate } from "./templates";
import {
  generateMonthlyNews, generateCriticReview,
  generateAcceptanceSpeech, mogulHasApiKey,
} from "./ai";

// ─── Time advancement ────────────────────────────────────────

export function advanceWeeks(s: Studio, weeks: number): void {
  // Resolve in week-sized steps so per-week box office accumulates
  // gradually rather than landing as one lump.
  for (let i = 0; i < weeks; i++) tickWeek(s);
}

export function advanceMonths(s: Studio, months: number): void {
  for (let i = 0; i < months; i++) tickMonth(s);
}

function tickWeek(s: Studio): void {
  // Continue weekly box office for releases still in theaters.
  for (const r of s.releases) {
    if (r.weeksOut < 10) runOneWeekOfBoxOffice(s, r);
  }
}

function tickMonth(s: Studio): void {
  // Productions progress one month.
  for (const p of s.productions) progressProduction(s, p);

  // Releases due this month get their opening weekend.
  releaseDueProductions(s);

  // Burn — overhead + salaries + monthly loan interest.
  const burn = monthlyBurn(s);
  s.player.cash -= burn;
  s.player.totalProfit -= burn;

  // Passive income — studio tours + theme park.
  const passive = passiveMonthlyIncome(s);
  if (passive > 0) {
    s.player.cash += passive;
    s.player.totalRevenue += passive;
    s.player.totalProfit += passive;
  }

  // Loan interest accrues monthly, principal due at maturity.
  if (s.player.loan > 0) {
    const monthlyInterest = (s.player.loan * s.player.loanRate) / 12;
    s.player.cash -= monthlyInterest;
    s.player.loanMonthsLeft -= 1;
    if (s.player.loanMonthsLeft <= 0) {
      // Balloon repayment due.
      if (s.player.cash >= s.player.loan) {
        s.player.cash -= s.player.loan;
        pushNews(s, "Info", `${s.player.name} repays $${s.player.loan.toFixed(1)}M bank loan in full.`, "💼");
        s.player.loan = 0;
        s.player.loanRate = 0;
      } else {
        // Default — eat what we can, mark a default, refinance the rest.
        s.player.defaults += 1;
        const paid = Math.max(0, s.player.cash);
        s.player.cash = 0;
        s.player.loan = Math.max(0, s.player.loan - paid);
        s.player.loanRate = Math.min(0.18, s.player.loanRate + 0.04);
        s.player.loanMonthsLeft = 24;
        pushNews(s, "Scandal", `${s.player.name} defaults — debt rolled over at ${(s.player.loanRate * 100).toFixed(0)}%. Bank watching closely.`, "🚨", true);
      }
    }
  }

  // Roll the calendar.
  s.month += 1;
  if (s.month > 12) {
    s.month = 1;
    s.year += 1;
    onYearRollover(s);
  }

  // Monthly housekeeping.
  refreshScriptMarket(s, 2);
  // Each rival might greenlight a new movie.
  for (const r of s.rivals) maybeRivalGreenlight(s, r);

  // Random monthly event ~30% chance.
  if (rand() < 0.3) generateRandomEvent(s);

  // Fire AI for fresh industry headlines if a key is configured.
  // We do this opportunistically and ignore failures — the templates
  // already cover the floor.
  if (mogulHasApiKey() && rand() < 0.6) {
    generateMonthlyNews(s).then(items => {
      if (!items || items.length === 0) return;
      // Mutate the live studio via the bound store helper. Since this
      // is an async fire-and-forget we have to grab the store directly.
      try {
        const win: any = window;
        const store = win.__dd_mogul_store;
        if (store && typeof store.getState === "function") {
          store.getState().mutate((studio: Studio) => {
            for (const it of items) studio.newsLog.unshift({ ...it, studioIds: undefined });
            if (studio.newsLog.length > 250) studio.newsLog.length = 250;
          });
        }
      } catch {}
    }).catch(() => {});
  }

  // Awards ceremony happens in March of each year.
  if (s.month === 3) maybeRunAwardsCeremony(s);

  // Black List of unproduced scripts drops in December of each year.
  if (s.month === 12 && !s.blackList) buildBlackList(s);

  s.modifiedAt = Date.now();
}

/** Passive monthly income from studio tours + theme parks. */
function passiveMonthlyIncome(s: Studio): number {
  const f = s.player.facilities;
  let income = 0;
  if (f.studioTours === 1) income += 0.5;
  if (f.studioTours === 2) income += 1.2;
  if (f.themePark === 1) income += 4;
  return income;
}

function onYearRollover(s: Studio): void {
  // Age everyone 1 year. Retire those who hit the wall.
  for (const t of s.talent) {
    if (t.retired) continue;
    t.age += 1;
    if (shouldRetire(t)) {
      t.retired = true;
      const prevStudio = t.studioId;
      t.studioId = null;
      t.contractMoviesLeft = 0;
      s.retiredTalent.push(t);
      pushNews(s, "Talent", `${t.name} (${prettyRole(t.role)}) retires after a ${t.hits + t.flops}-film career.`, "🎬", t.hits >= 3, prevStudio ? [prevStudio] : undefined);
    }
  }
  // Drop retired from active pool.
  s.talent = s.talent.filter(t => !t.retired);
  // New talent — 6 actors, 2 directors, 1 writer per year.
  for (let i = 0; i < 6; i++) s.talent.push(generateRisingTalent("actor"));
  for (let i = 0; i < 2; i++) s.talent.push(generateRisingTalent("director"));
  s.talent.push(generateRisingTalent("writer"));
  // Drop very old released movies from the active log to keep memory tight.
  s.releases = s.releases.filter(r => r.releaseYear >= s.year - 8);
  // Queue a Golden Reels nomination set for the year that just ended.
  buildNominations(s, s.year - 1);
  pushNews(s, "Info", `${s.year} kicks off in Hollywood. New blood enters the talent pool.`, "🌅");
}

export function monthlyBurn(s: Studio): number {
  // Base overhead + sound stages + script dept + marketing dept.
  let burn = 0.4;
  burn += s.player.facilities.soundStages * 0.15;
  burn += s.player.facilities.backlots * 0.1;
  burn += s.player.facilities.scriptDept * 0.2;
  burn += s.player.facilities.marketingDept * 0.25;
  // Contracts (talent under contract draws a small retainer).
  const undercontract = s.talent.filter(t => t.studioId === s.player.id);
  for (const t of undercontract) burn += t.fee * 0.02;  // 2% per month retainer
  return Math.round(burn * 100) / 100;
}

// ─── Production progress ─────────────────────────────────────

function progressProduction(s: Studio, p: Production): void {
  if (p.stage === "released" || p.stage === "cancelled") return;
  p.monthsLeftInStage -= 1;
  // Each stage adds to quality.
  if (p.monthsLeftInStage <= 0) {
    const next = nextStage(p.stage);
    if (next === "released") {
      // Don't auto-release here — wait for the scheduled month so the
      // calendar respects release-date strategy. Stage will sit at
      // "postProduction" with 0 months left until release month hits.
      return;
    }
    p.stage = next;
    p.monthsLeftInStage = stageLength(next, s, p);
    // Each stage transition costs a chunk of the budget.
    const chunkCost = stageCost(p, next);
    p.spent += chunkCost;
    s.player.cash -= chunkCost;
    s.player.totalProfit -= chunkCost;
    // Stage transition adds quality based on talent + facilities.
    p.qualityScore = Math.min(100, p.qualityScore + stageQualityAdd(s, p, next));
    if (next === "filming") {
      pushNews(s, "Production", `"${p.title}" begins principal photography.`, "🎥", false, [p.studioId]);
    }
    if (next === "postProduction") {
      pushNews(s, "Production", `"${p.title}" wraps shooting and enters post.`, "✂️", false, [p.studioId]);
    }
  }
}

function nextStage(stage: ProductionStage): ProductionStage {
  switch (stage) {
    case "development": return "preProduction";
    case "preProduction": return "filming";
    case "filming": return "postProduction";
    case "postProduction": return "released";
    default: return stage;
  }
}

function stageLength(stage: ProductionStage, s: Studio, p: Production): number {
  // Facilities speed up later stages.
  const post = s.player.facilities.postProduction;
  switch (stage) {
    case "development": return irnd(1, 2);
    case "preProduction": return irnd(2, 3);
    case "filming": return p.budget.fx > 10 ? irnd(4, 6) : irnd(3, 4);
    case "postProduction": return Math.max(1, 4 - post);
    default: return 1;
  }
}

function stageCost(p: Production, stage: ProductionStage): number {
  // Spread production+fx across filming + post. Marketing only at release.
  const total = p.budget.production + p.budget.fx;
  switch (stage) {
    case "development": return Math.round(total * 0.05 * 10) / 10;
    case "preProduction": return Math.round(total * 0.20 * 10) / 10;
    case "filming": return Math.round(total * 0.55 * 10) / 10;
    case "postProduction": return Math.round(total * 0.20 * 10) / 10;
    default: return 0;
  }
}

function stageQualityAdd(s: Studio, p: Production, stage: ProductionStage): number {
  const script = s.scripts.find(sc => sc.id === p.scriptId);
  const dir = s.talent.find(t => t.id === p.directorId) ?? s.retiredTalent.find(t => t.id === p.directorId);
  const star = s.talent.find(t => t.id === p.starId) ?? s.retiredTalent.find(t => t.id === p.starId);
  const supporting = p.supportingIds
    .map(id => s.talent.find(t => t.id === id) ?? s.retiredTalent.find(t => t.id === id))
    .filter(Boolean) as Talent[];

  const scriptQ = script ? script.trueQuality * 10 : 30;       // 10..50
  const dirQ = dir ? dir.trueRating * 0.20 : 8;                 // 8..20
  const starQ = star ? star.trueRating * 0.18 : 7;              // 7..18
  const supportQ = supporting.reduce((sum, t) => sum + t.trueRating * 0.04, 0); // 0..20

  // Director style match bonus.
  const dirMatch = dir && dir.specialties.includes(p.genre) ? 6 : 0;
  const starMatch = star && star.specialties.includes(p.genre) ? 4 : 0;

  // FX investment helps Action/SciFi/Fantasy.
  const fxBoost = (p.genre === "Action" || p.genre === "SciFi" || p.genre === "Fantasy")
    ? Math.min(8, p.budget.fx * 0.3)
    : 0;

  // Casting chemistry — pairs that have worked well together amplify;
  // pairs that have clashed drag it down. Sums across star + supporting.
  let chemistryBoost = 0;
  if (star) {
    for (const sup of supporting) {
      const c = (star.chemistry?.[sup.id] ?? 0) + (sup.chemistry?.[star.id] ?? 0);
      chemistryBoost += c * 1.5; // each chemistry point is worth ~1.5 quality
    }
  }
  // Director-star chemistry counts double weight.
  if (dir && star) {
    const c = (dir.chemistry?.[star.id] ?? 0) + (star.chemistry?.[dir.id] ?? 0);
    chemistryBoost += c * 2.0;
  }

  // Caveat-grant bonus — when the studio gave the talent their asks,
  // the talent shows up more invested. Folded in at the filming +
  // post-production stages where their work actually lands on screen.
  const caveatBoost = stage === "filming" || stage === "postProduction"
    ? caveatQualityBonus(p) * (stage === "filming" ? 0.6 : 0.4)
    : 0;

  // Distribute across stages — bigger gains in filming + post.
  const stageWeight: Record<ProductionStage, number> = {
    development: 0.1, preProduction: 0.15, filming: 0.45, postProduction: 0.3, released: 0, cancelled: 0,
  };
  const base = (scriptQ + dirQ + starQ + supportQ + dirMatch + starMatch + fxBoost + chemistryBoost) * (stageWeight[stage] ?? 0);
  // Sprinkle randomness so two identical productions can land differently.
  return Math.round(base + caveatBoost + (rand() - 0.5) * 4);
}

// ─── Release & box office ────────────────────────────────────

function releaseDueProductions(s: Studio): void {
  for (const p of s.productions.slice()) {
    if (p.stage === "released" || p.stage === "cancelled") continue;
    if (p.stage !== "postProduction") continue;
    if (p.monthsLeftInStage > 0) continue;
    if (p.releaseYear !== s.year || p.releaseMonth !== s.month) continue;
    releaseProduction(s, p);
  }
}

function releaseProduction(s: Studio, p: Production): void {
  // Final quality clamp.
  const quality = Math.max(10, Math.min(100, p.qualityScore));
  // Critic + audience scores derived from quality + marketing.
  const criticScore = Math.max(10, Math.min(100, quality + irnd(-12, 8)));
  const audienceScore = Math.max(10, Math.min(100, quality + irnd(-8, 12)));
  // Opening weekend $M — scaled to quality, marketing, genre, and star power.
  const star = s.talent.find(t => t.id === p.starId) ?? s.retiredTalent.find(t => t.id === p.starId);
  const starBoost = star ? (star.star - 1) * 8 : 0;
  const marketingBoost = Math.min(40, p.budget.marketing * 2.5);
  // Press tours give a smaller-but-cumulative awareness bump.
  const pressTour = p.budget.pressTour ?? 0;
  const pressBoost = Math.min(15, pressTour * 4);
  const genreMult = openingMultiplier(p.genre);
  // Apply rating reach — PG-13 broad; R/NC-17 narrows the box.
  const ratingMod = ratingReachModifier(p.targetRating ?? "PG-13");
  let opening = (quality * 0.4 + starBoost + marketingBoost + pressBoost) * genreMult * ratingMod;
  // Audience tracking effects via test screening (if any).
  if (p.testScreened && p.testScreenScore) opening *= 1 + (p.testScreenScore - 70) / 200;
  // Counter-programming: dampen opening if another release the same month.
  const sameMonth = s.releases.filter(r => r.releaseYear === p.releaseYear && r.releaseMonth === p.releaseMonth).length;
  opening *= Math.max(0.6, 1 - sameMonth * 0.07);
  // Randomness.
  opening *= 0.85 + rand() * 0.3;
  opening = Math.max(1, Math.round(opening * 10) / 10);

  // Foreign markets — modern era only (1990+). Total foreign matches
  // ~60% of domestic with genre-specific tilts (action plays huge in
  // China; comedy plays smaller abroad).
  const foreign = s.year >= 1990 ? buildForeignMarkets(opening, p.genre) : undefined;

  const totalBudget = p.spent + p.budget.marketing + pressTour;
  const movie: ReleasedMovie = {
    id: p.id,
    title: p.title,
    genre: p.genre,
    studioId: p.studioId,
    releaseYear: p.releaseYear,
    releaseMonth: p.releaseMonth,
    quality,
    budget: totalBudget,
    opening,
    totalBO: opening + (foreign ? foreign.china + foreign.europe + foreign.japan + foreign.southAmerica : 0),
    weeksOut: 1,
    criticScore,
    audienceScore,
    awards: [],
    directorId: p.directorId,
    starId: p.starId,
    supportingIds: p.supportingIds.slice(),
    franchiseId: undefined,
    profit: 0, // set below
    foreign,
  };
  movie.profit = movie.totalBO - totalBudget;
  s.releases.unshift(movie);
  p.stage = "released";

  // Pay marketing + press tour now.
  s.player.cash -= p.budget.marketing + pressTour;
  p.spent += p.budget.marketing + pressTour;
  s.player.totalProfit -= p.budget.marketing + pressTour;
  // Domestic opening + foreign land immediately (foreign is treated as
  // a separate windowed-release happening over the same theatrical run,
  // simplification for V1).
  if (movie.studioId === s.player.id) {
    // Opening + foreign lump-sum land in the studio account on release
    // weekend. The weekly box-office loop adds the rest of the
    // domestic run on top (weeks 2-10) into cash/revenue/profit.
    s.player.cash += movie.totalBO;
    s.player.totalRevenue += movie.totalBO;
    s.player.totalProfit += movie.totalBO;
  }

  // Update talent hit/flop tally + reveal hidden rating + chemistry.
  const isHit = movie.profit > 0 && quality >= 60;
  const isFlop = movie.profit < 0 && quality < 50;
  const attached = [p.starId, p.directorId, ...p.supportingIds].filter(Boolean) as string[];
  for (const id of attached) {
    const t = s.talent.find(tt => tt.id === id);
    if (!t) continue;
    t.revealed = true;
    if (isHit) { t.hits += 1; t.hot = Math.min(5, t.hot + 1); }
    if (isFlop) { t.flops += 1; t.hot = Math.max(-5, t.hot - 1); }
    // Rising star → may upgrade tier.
    if (t.hits >= 3 && t.star < 5) t.star = (t.star + 1) as 1 | 2 | 3 | 4 | 5;
    if (t.flops >= 3 && t.star > 1) t.star = (t.star - 1) as 1 | 2 | 3 | 4 | 5;

    // Walk of Fame — earn a star at 5 hits (only on your studio's films).
    if (t.hits >= 5 && !t.walkOfFame && p.studioId === s.player.id) {
      t.walkOfFame = true;
      if (!s.player.walkOfFame.includes(t.id)) s.player.walkOfFame.push(t.id);
      pushNews(s, "Talent", `⭐ ${t.name} earns a star on the Hollywood Walk of Fame — five career hits at ${s.player.name}.`, "⭐", true, [s.player.id], [t.id]);
    }
  }
  // Chemistry — every co-starring pair shifts by +1 on a hit, -1 on a flop.
  for (const a of attached) {
    for (const b of attached) {
      if (a === b) continue;
      const ta = s.talent.find(tt => tt.id === a);
      if (!ta) continue;
      ta.chemistry = ta.chemistry ?? {};
      const delta = isHit ? 1 : isFlop ? -1 : 0;
      ta.chemistry[b] = Math.max(-3, Math.min(3, (ta.chemistry[b] ?? 0) + delta));
    }
  }

  // Records.
  if (!s.records.biggestOpening || opening > s.records.biggestOpening.amount) {
    s.records.biggestOpening = { movieId: movie.id, amount: opening };
  }
  if (!s.records.biggestTotalBO || movie.totalBO > s.records.biggestTotalBO.amount) {
    s.records.biggestTotalBO = { movieId: movie.id, amount: movie.totalBO };
  }

  // News.
  const verdict = quality >= 75 ? "a triumph" : quality >= 55 ? "a solid hit" : quality >= 40 ? "mixed reviews" : "a critical flop";
  pushNews(s, "Box Office",
    `"${movie.title}" opens to $${opening.toFixed(1)}M${foreign ? ` (+$${(movie.totalBO - opening).toFixed(0)}M foreign)` : ""} — ${verdict}.`,
    quality >= 70 ? "🌟" : quality >= 45 ? "🎬" : "📉",
    quality >= 70 || quality < 35,
    [p.studioId],
    [p.starId, p.directorId].filter(Boolean) as string[],
  );

  // Fire AI critic review opportunistically. If it returns we stitch
  // it onto the released movie via the store mutation.
  if (mogulHasApiKey()) {
    generateCriticReview(s, movie).then(review => {
      if (!review) return;
      try {
        const win: any = window;
        const store = win.__dd_mogul_store;
        if (store && typeof store.getState === "function") {
          store.getState().mutate((studio: Studio) => {
            const rel = studio.releases.find(r => r.id === movie.id);
            if (rel) {
              rel.criticReview = { critic: review.critic, quote: review.quote };
              rel.criticScore = review.score;
            }
            studio.newsLog.unshift({
              id: uid("nw"),
              year: studio.year,
              month: studio.month,
              category: "Box Office",
              emoji: "🎟️",
              headline: `${review.critic}: "${review.quote}"`,
              studioIds: [p.studioId],
            });
          });
        }
      } catch {}
    }).catch(() => {});
  }
}

/** Build the foreign-market split. Genres tilt the distribution. */
function buildForeignMarkets(opening: number, g: Genre): { china: number; europe: number; japan: number; southAmerica: number } {
  // Total foreign as a multiplier on opening.
  const totalMult = g === "Action" || g === "SciFi" || g === "Fantasy" ? 0.85 : g === "Drama" || g === "Romance" ? 0.45 : g === "Horror" ? 0.4 : 0.55;
  const total = opening * totalMult * (0.85 + rand() * 0.3);
  // China loves action/fantasy; Europe loves drama; Japan loves anime-y
  // genres (sci-fi/fantasy); SA likes broad comedy/action.
  const weights: Record<string, [number, number, number, number]> = {
    Action: [0.40, 0.25, 0.18, 0.17],
    Drama: [0.18, 0.45, 0.20, 0.17],
    Comedy: [0.22, 0.28, 0.20, 0.30],
    Thriller: [0.28, 0.32, 0.22, 0.18],
    Horror: [0.25, 0.30, 0.25, 0.20],
    Romance: [0.20, 0.40, 0.22, 0.18],
    SciFi: [0.32, 0.25, 0.28, 0.15],
    Fantasy: [0.30, 0.28, 0.27, 0.15],
    Family: [0.25, 0.28, 0.22, 0.25],
    Documentary: [0.10, 0.45, 0.25, 0.20],
  };
  const w = weights[g] ?? [0.25, 0.30, 0.22, 0.23];
  return {
    china: Math.round(total * w[0] * 10) / 10,
    europe: Math.round(total * w[1] * 10) / 10,
    japan: Math.round(total * w[2] * 10) / 10,
    southAmerica: Math.round(total * w[3] * 10) / 10,
  };
}

function openingMultiplier(g: Genre): number {
  switch (g) {
    case "Action": return 1.15;
    case "SciFi": return 1.1;
    case "Fantasy": return 1.1;
    case "War": return 1.05;
    case "Family": return 1.05;
    case "Comedy": return 1.0;
    case "Sports": return 1.0;
    case "Thriller": return 0.95;
    case "Musical": return 0.9;
    case "Horror": return 0.9;
    case "Western": return 0.85;
    case "Drama": return 0.85;
    case "Romance": return 0.85;
    case "Documentary": return 0.4;
    default: return 1.0;
  }
}

function runOneWeekOfBoxOffice(s: Studio, r: ReleasedMovie): void {
  if (r.weeksOut >= 10) return;
  // Decay curve — week 1 = opening; subsequent weeks taper.
  // Quality affects legs (better movies hold up longer).
  const legFactor = 0.5 + (r.quality / 200);  // 0.55..1.0
  const decay = Math.pow(legFactor, r.weeksOut);
  const weekly = r.opening * 0.55 * decay;
  const w = Math.max(0, Math.round(weekly * 10) / 10);
  r.totalBO += w;
  r.weeksOut += 1;
  // Money lands in the studio's pocket.
  if (r.studioId === s.player.id) {
    s.player.cash += w;
    s.player.totalRevenue += w;
    s.player.totalProfit += w;
    r.profit = r.totalBO - r.budget;
  }
  // Record check.
  if (!s.records.biggestTotalBO || r.totalBO > s.records.biggestTotalBO.amount) {
    s.records.biggestTotalBO = { movieId: r.id, amount: r.totalBO };
  }
}

// ─── Rivals ──────────────────────────────────────────────────

function maybeRivalGreenlight(s: Studio, r: RivalStudio): void {
  // Limit each rival to ~2 in-flight productions.
  if (r.activeProductions.length >= 2) return;
  // Probability to greenlight scales with aggression.
  if (rand() > 0.25 + r.personality.aggression * 0.4) return;
  const genre = rand() < 0.55 ? choice(r.personality.favoredGenres) : choice(["Action", "Drama", "Comedy", "Thriller", "SciFi"] as Genre[]);
  const budget = Math.round((10 + r.personality.quality * 40 + r.personality.aggression * 30) * (0.8 + rand() * 0.4) * 10) / 10;
  // Pick a release window 4-9 months out.
  const monthsOut = irnd(4, 9);
  const releaseDate = addMonths(s.year, s.month, monthsOut);
  const id = uid("rivprod");
  const title = generateRivalTitle(genre);
  r.activeProductions.push({ id, title, genre, releaseYear: releaseDate.year, releaseMonth: releaseDate.month, budget });

  // We model rival releases by adding a "phantom production" into the
  // calendar — when its release date arrives we resolve a quick BO and
  // turn it into a ReleasedMovie.
  const prod: Production = {
    id,
    title,
    genre,
    studioId: r.id,
    scriptId: "rival-script",
    stage: "preProduction",
    cast: {},
    directorId: null,
    starId: null,
    supportingIds: [],
    grantedCaveats: {},
    targetRating: "PG-13",
    budget: { production: budget * 0.7, fx: budget * 0.2, marketing: budget * 0.15 },
    spent: 0,
    qualityScore: 30 + r.personality.quality * 40 + irnd(-10, 10),
    monthsLeftInStage: monthsOut,
    releaseYear: releaseDate.year,
    releaseMonth: releaseDate.month,
  };
  s.productions.push(prod);
}

function generateRivalTitle(g: Genre): string {
  // Quick stock titles; the script-title bank lives in generate.ts but
  // re-imitating it inline keeps engine.ts self-contained.
  const baseA = ["The", "Last", "Crimson", "Eternal", "Silver", "Quantum", "Hidden", "Stellar"];
  const baseB = {
    Action: "Strike", Drama: "Heart", Comedy: "Folly", Thriller: "Code",
    Horror: "Whispers", Romance: "Promise", SciFi: "Horizon", Fantasy: "Throne",
    Family: "Journey", Documentary: "Truth",
    Western: "Frontier", Musical: "Anthem", War: "Hill", Sports: "Victory",
  }[g] ?? "Tale";
  return `${choice(baseA)} ${baseB}`;
}

function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  let y = year, m = month + n;
  while (m > 12) { m -= 12; y += 1; }
  return { year: y, month: m };
}

// ─── Awards ──────────────────────────────────────────────────

const AWARD_CATEGORIES = [
  "Best Picture", "Best Director", "Best Actor", "Best Actress",
  "Best Screenplay", "Best Cinematography", "Best Visual Effects",
];

function buildNominations(s: Studio, year: number): void {
  if (s.awards.some(a => a.year === year)) return;
  const eligible = s.releases.filter(r => r.releaseYear === year);
  if (eligible.length === 0) return;
  const top = eligible.slice().sort((a, b) => b.quality - a.quality);
  const nominations: AwardNomination[] = AWARD_CATEGORIES.map(cat => {
    const picks = top.slice(0, 5);
    return {
      category: cat,
      year,
      nominees: picks.map(m => ({ movieId: m.id, studioId: m.studioId, talentId: pickTalentForCategory(s, m, cat) })),
      winnerIdx: null,
    };
  });
  s.awards.unshift({ year, nominations, ceremonyDone: false });
  pushNews(s, "Award", `🏛️ Golden Reel nominations announced for ${year} — ceremony in March.`, "🏛️", true);
}

function pickTalentForCategory(s: Studio, m: ReleasedMovie, cat: string): string | undefined {
  if (cat === "Best Director") return m.directorId ?? undefined;
  if (cat === "Best Actor" || cat === "Best Actress") return m.starId ?? undefined;
  return undefined;
}

function maybeRunAwardsCeremony(s: Studio): void {
  const award = s.awards[0];
  if (!award || award.ceremonyDone) return;
  // Run the ceremony — pick a winner per category weighted by quality.
  for (const nom of award.nominations) {
    if (nom.nominees.length === 0) continue;
    const weights = nom.nominees.map(n => {
      const m = s.releases.find(r => r.id === n.movieId);
      return m ? Math.max(1, m.quality - 30) : 1;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let winnerIdx = 0;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { winnerIdx = i; break; } }
    nom.winnerIdx = winnerIdx;
    const winnerNom = nom.nominees[winnerIdx];
    const movie = s.releases.find(rr => rr.id === winnerNom.movieId);
    if (movie) {
      movie.awards.push(nom.category);
      if (winnerNom.studioId === s.player.id) {
        s.player.awardsWon += 1;
        if (s.player.prestige < 5) s.player.prestige = (s.player.prestige + 1) as 1 | 2 | 3 | 4 | 5;
      }
    }
  }
  award.ceremonyDone = true;
  const myWins = award.nominations.filter(n => n.winnerIdx != null && n.nominees[n.winnerIdx!].studioId === s.player.id).length;
  if (myWins > 0) {
    pushNews(s, "Award", `🏆 ${s.player.name} sweeps ${myWins} Golden Reel${myWins > 1 ? "s" : ""} at the ${award.year} ceremony.`, "🏆", true, [s.player.id]);
  } else {
    pushNews(s, "Award", `🏛️ The ${award.year} Golden Reels are handed out. ${s.player.name} comes up empty this year.`, "🏛️", false, [s.player.id]);
  }

  // Fire AI for acceptance speeches on the categories we won. Stitched
  // onto award.speeches once they return.
  if (mogulHasApiKey()) {
    award.speeches = award.speeches ?? {};
    for (const nom of award.nominations) {
      if (nom.winnerIdx == null) continue;
      const winnerNom = nom.nominees[nom.winnerIdx];
      const movie = s.releases.find(r => r.id === winnerNom.movieId);
      if (!movie) continue;
      const t = winnerNom.talentId
        ? s.talent.find(x => x.id === winnerNom.talentId) ?? s.retiredTalent.find(x => x.id === winnerNom.talentId) ?? null
        : null;
      generateAcceptanceSpeech(nom.category, t, movie.title).then(speech => {
        if (!speech) return;
        try {
          const win: any = window;
          const store = win.__dd_mogul_store;
          if (store && typeof store.getState === "function") {
            store.getState().mutate((studio: Studio) => {
              const a = studio.awards.find(aa => aa.year === award.year);
              if (a) {
                a.speeches = a.speeches ?? {};
                a.speeches[nom.category] = speech;
              }
            });
          }
        } catch {}
      }).catch(() => {});
    }
  }
}

/** Annual Black List — 5 elite scripts drop in December. The user can
 *  bid on them; CPU studios occasionally snipe before the user acts. */
function buildBlackList(s: Studio): void {
  // Generate 5 quality-4-or-5 scripts. They use the same Script shape
  // but with a known higher quality; price is steep.
  const list: Script[] = [];
  for (let i = 0; i < 5; i++) {
    const trueQuality: 4 | 5 = rand() < 0.4 ? 5 : 4;
    const scoutedQuality: 4 | 5 = trueQuality;  // pre-vetted; no hidden
    const genres: Genre[] = ["Drama", "Thriller", "SciFi", "Action", "Comedy", "Horror", "Romance", "Fantasy"];
    const genre = choice(genres);
    const titles: Record<Genre, string[]> = {
      Drama: ["A Lonely Country", "The Mercy Walk", "Coda for Two", "After the Storm"],
      Thriller: ["The 9:17", "Surveillance", "Black Tape", "The Operator"],
      SciFi: ["Galileo's Ghost", "Edge of the Tower", "The Long Migration", "Quantum Drift"],
      Action: ["Ghost Run", "Knife's Edge", "Last Vector", "Bone Country"],
      Comedy: ["Best Worst Wedding", "Office Mythology", "The Reunion Tape", "Dad Pact"],
      Horror: ["The Bone Bell", "Under the House", "Sister", "Quiet Hill"],
      Romance: ["Two Weeks in Madrid", "Slow Letter", "The Promise Year", "Always Sunday"],
      Fantasy: ["Wolfgift", "Crown of Salt", "The Twelve Doors", "The Final Quill"],
      Family: ["The Big Year", "Dog and Mouse", "Camp Coyote", "The Comet"],
      Documentary: ["Voices of the Strike", "The Town That Built Cars"],
      Western: ["High Desert Mercy", "The Sundown Pact"],
      Musical: ["Singing in the Smoke", "Curtain Song"],
      War: ["The Last Beach", "Cold Trench"],
      Sports: ["Final Inning", "The Comeback Bench"],
    };
    list.push({
      id: uid("bls"),
      title: choice(titles[genre]),
      genre,
      trueQuality,
      scoutedQuality,
      coverageRuns: 3,  // pre-vetted
      price: Math.round((trueQuality * 1.8 + irnd(1, 4)) * 10) / 10,
      studioId: null,
      source: "template",
      used: false,
      premise: "From this year's Black List — pre-vetted screenplay; the bidding war is on.",
      rating: "R",  // Black List scripts skew adult / prestige
      requirements: { violence: 2, nudity: 1, sexuality: 2, language: 3, drugs: 1 },
      requiredRoles: [
        { label: "Lead", slot: "lead", gender: "any", isLead: true },
        { label: "Supporting", slot: "supp", gender: "any" },
      ],
    });
  }
  s.scripts.push(...list);
  s.blackList = {
    year: s.year,
    scriptIds: list.map(sc => sc.id),
    resolved: false,
  };
  pushNews(s, "Production", `📜 The ${s.year} Black List drops — 5 elite unproduced screenplays now in play.`, "📜", true);
}

// ─── Events / news ───────────────────────────────────────────

function generateRandomEvent(s: Studio): void {
  const tpl = choice(EVENT_TEMPLATES);
  if (!tpl) return;
  // Resolve interpolation tokens using current studio state.
  const star = choice(s.talent.filter(t => t.role === "actor" && t.star >= 3));
  const dir = choice(s.talent.filter(t => t.role === "director" && t.star >= 3));
  const rival = choice(s.rivals);
  if (!star || !dir || !rival) return;
  const headline = fillTemplate(tpl.headline, {
    actor: star.name,
    director: dir.name,
    studio: s.player.name,
    rival: rival.name,
    yourMovie: s.releases[0]?.title ?? "your latest film",
  });
  pushNews(s, tpl.category, headline, tpl.emoji, tpl.important);
  // Apply effect, if any.
  if (tpl.effect === "scandal" && star) star.hot = Math.max(-5, star.hot - 2);
  if (tpl.effect === "hotStreak" && star) star.hot = Math.min(5, star.hot + 2);
}

function shouldRetire(t: Talent): boolean {
  // Hard caps by role.
  const cap = t.role === "actor" ? 72 : t.role === "director" ? 78 : 70;
  if (t.age >= cap) return true;
  // Voluntary: older + cold + few hits → retires.
  if (t.age >= 55 && t.hot <= -2 && t.hits < t.flops && rand() < 0.05) return true;
  return false;
}

function prettyRole(r: Talent["role"]): string {
  return r === "actor" ? "Actor" : r === "director" ? "Director" : "Writer";
}

export function pushNews(
  s: Studio,
  category: NewsItem["category"],
  headline: string,
  emoji?: string,
  important?: boolean,
  studioIds?: string[],
  talentIds?: string[],
): void {
  s.newsLog.unshift({
    id: uid("nw"),
    year: s.year,
    month: s.month,
    category,
    emoji,
    headline,
    important,
    studioIds,
    talentIds,
  });
  // Cap to keep storage tight.
  if (s.newsLog.length > 200) s.newsLog.length = 200;
}

// ─── User actions ────────────────────────────────────────────

/** Buy a script off the open market — pays the asking price, transfers
 *  ownership to the user's studio. */
export function buyScript(s: Studio, scriptId: string): "ok" | "noFunds" | "missing" {
  const sc = s.scripts.find(x => x.id === scriptId);
  if (!sc || sc.studioId) return "missing";
  if (s.player.cash < sc.price) return "noFunds";
  s.player.cash -= sc.price;
  s.player.totalProfit -= sc.price;
  sc.studioId = s.player.id;
  pushNews(s, "Production", `${s.player.name} acquires "${sc.title}" (${sc.genre}) for $${sc.price.toFixed(1)}M.`, "📝", false, [s.player.id]);
  return "ok";
}

/** Run script coverage — tightens the scouted quality estimate. */
export function runCoverage(s: Studio, scriptId: string): void {
  const sc = s.scripts.find(x => x.id === scriptId);
  if (!sc) return;
  const cost = 0.2;
  if (s.player.cash < cost) return;
  s.player.cash -= cost;
  sc.coverageRuns += 1;
  // Pull scouted toward truth.
  const err = sc.trueQuality - sc.scoutedQuality;
  sc.scoutedQuality = Math.max(1, Math.min(5, sc.scoutedQuality + Math.sign(err))) as 1 | 2 | 3 | 4 | 5;
  if (sc.coverageRuns >= 3) sc.scoutedQuality = sc.trueQuality;
}

/** Sign a free-agent talent. Pays a small signing bonus. */
export function signTalent(s: Studio, talentId: string, contractMovies: number = 3): "ok" | "noFunds" | "missing" | "taken" {
  const t = s.talent.find(x => x.id === talentId);
  if (!t) return "missing";
  if (t.studioId && t.studioId !== s.player.id) return "taken";
  const bonus = t.fee * 0.5;
  if (s.player.cash < bonus) return "noFunds";
  s.player.cash -= bonus;
  s.player.totalProfit -= bonus;
  t.studioId = s.player.id;
  t.contractMoviesLeft = contractMovies;
  pushNews(s, "Talent", `${s.player.name} signs ${t.name} (${prettyRole(t.role)}, ${"★".repeat(t.star)}) — $${bonus.toFixed(1)}M signing bonus.`, "✍️", t.star >= 4, [s.player.id], [t.id]);
  return "ok";
}

/** Release a talent (drop them back to FA). */
export function dropTalent(s: Studio, talentId: string): void {
  const t = s.talent.find(x => x.id === talentId);
  if (!t || t.studioId !== s.player.id) return;
  t.studioId = null;
  t.contractMoviesLeft = 0;
}

/** Greenlight a production from an owned script. V2: takes a cast
 *  map keyed by required-role slot, an optional grantedCaveats map,
 *  and a targetRating (which defaults to the script's natural rating). */
export function greenlightMovie(s: Studio, opts: {
  scriptId: string;
  directorId: string | null;
  starId: string | null;
  supportingIds: string[];
  /** Optional V2 cast map — slot → talentId. If absent, falls back to
   *  starId + supportingIds for back-compat. */
  cast?: Record<string, string>;
  /** Optional caveats granted at hire time, talentId → CaveatId[]. */
  grantedCaveats?: Record<string, CaveatId[]>;
  /** Release rating. Defaults to the script's natural rating. */
  targetRating?: ContentRating;
  budgetProduction: number;
  budgetFx: number;
  budgetMarketing: number;
  budgetPressTour?: number;
  releaseMonthsOut: number;
}): { ok: true; production: Production } | { ok: false; reason: string } {
  const sc = s.scripts.find(x => x.id === opts.scriptId);
  if (!sc) return { ok: false, reason: "Script not found." };
  if (sc.studioId !== s.player.id) return { ok: false, reason: "You don't own that script." };
  if (sc.used) return { ok: false, reason: "Script already produced." };
  const totalBudget = opts.budgetProduction + opts.budgetFx + opts.budgetMarketing;
  if (s.player.cash < totalBudget * 0.1) {
    return { ok: false, reason: "Not enough cash to begin production." };
  }
  // Pay talent up-front fees (50% on signing).
  const star = opts.starId ? s.talent.find(t => t.id === opts.starId) : null;
  const dir = opts.directorId ? s.talent.find(t => t.id === opts.directorId) : null;
  const upfront = (star?.fee ?? 0) * 0.5 + (dir?.fee ?? 0) * 0.5;
  if (s.player.cash < upfront) return { ok: false, reason: "Not enough to pay talent up-front." };
  s.player.cash -= upfront;
  s.player.totalProfit -= upfront;
  if (star) star.contractMoviesLeft = Math.max(0, star.contractMoviesLeft - 1);
  if (dir) dir.contractMoviesLeft = Math.max(0, dir.contractMoviesLeft - 1);
  sc.used = true;
  const release = addMonths(s.year, s.month, opts.releaseMonthsOut);
  const prod: Production = {
    id: uid("prod"),
    title: sc.title,
    genre: sc.genre,
    studioId: s.player.id,
    scriptId: sc.id,
    stage: "development",
    cast: opts.cast ?? {},
    directorId: opts.directorId,
    starId: opts.starId,
    supportingIds: opts.supportingIds.slice(),
    grantedCaveats: opts.grantedCaveats ?? {},
    targetRating: opts.targetRating ?? sc.rating ?? "PG-13",
    budget: {
      production: opts.budgetProduction,
      fx: opts.budgetFx,
      marketing: opts.budgetMarketing,
      pressTour: opts.budgetPressTour ?? 0,
    },
    spent: upfront,
    qualityScore: 10,
    monthsLeftInStage: stageLength("development", s, { budget: { fx: opts.budgetFx } } as Production),
    releaseYear: release.year,
    releaseMonth: release.month,
  };
  s.productions.push(prod);
  pushNews(s, "Production", `${s.player.name} greenlights "${sc.title}" — ${(opts.budgetProduction + opts.budgetFx).toFixed(0)}M production budget, release ${release.year}-${String(release.month).padStart(2, "0")}.`, "🎬", true, [s.player.id]);
  return { ok: true, production: prod };
}

/** Run a paid test screening — reveals quality and a chance to reshoot. */
export function runTestScreening(s: Studio, productionId: string): void {
  const p = s.productions.find(x => x.id === productionId);
  if (!p) return;
  if (p.stage !== "postProduction") return;
  if (s.player.cash < 0.5) return;
  s.player.cash -= 0.5;
  p.testScreened = true;
  p.testScreenScore = Math.max(20, Math.min(95, Math.round(p.qualityScore + irnd(-5, 5))));
}

/** Take out a bank loan. */
export function takeLoan(s: Studio, amount: number, months: number = 36): "ok" | "tooMuch" | "rejected" {
  if (amount <= 0) return "rejected";
  const maxLoan = s.player.cash * 2 + 5;
  if (amount > maxLoan) return "tooMuch";
  s.player.cash += amount;
  s.player.loan += amount;
  // Rate: base 0.08 + 0.02 per prior default.
  s.player.loanRate = Math.min(0.18, 0.08 + s.player.defaults * 0.02);
  s.player.loanMonthsLeft = months;
  pushNews(s, "Info", `${s.player.name} secures a $${amount.toFixed(1)}M loan at ${(s.player.loanRate * 100).toFixed(0)}% APR.`, "🏦", false, [s.player.id]);
  return "ok";
}

/** Repay a chunk of an outstanding loan. */
export function repayLoan(s: Studio, amount: number): void {
  if (amount <= 0) return;
  const pay = Math.min(amount, s.player.loan, s.player.cash);
  s.player.cash -= pay;
  s.player.loan -= pay;
  if (s.player.loan <= 0) {
    s.player.loan = 0;
    s.player.loanMonthsLeft = 0;
    s.player.loanRate = 0;
  }
}

/** Upgrade a facility. Returns false if can't afford or maxed. */
export function upgradeFacility(s: Studio, kind: keyof Studio["player"]["facilities"]): boolean {
  const f = s.player.facilities;
  const costs: Record<keyof typeof f, { max: number; cost: number; requires?: () => boolean }> = {
    soundStages:    { max: 5, cost: 8 },
    backlots:       { max: 3, cost: 5 },
    postProduction: { max: 3, cost: 3 },
    scriptDept:     { max: 2, cost: 2 },
    marketingDept:  { max: 2, cost: 4 },
    studioTours:    { max: 2, cost: 10, requires: () => s.player.prestige >= 2 },
    themePark:      { max: 1, cost: 300, requires: () => s.player.prestige >= 4 && s.player.totalRevenue >= 800 },
  };
  const cur = f[kind];
  const meta = costs[kind];
  if (cur >= meta.max) return false;
  if (meta.requires && !meta.requires()) return false;
  if (s.player.cash < meta.cost) return false;
  s.player.cash -= meta.cost;
  s.player.totalProfit -= meta.cost;
  (f as any)[kind] = cur + 1;
  if (kind === "themePark") {
    pushNews(s, "Info", `🎢 ${s.player.name} opens a theme park — passive empire income unlocked.`, "🎢", true, [s.player.id]);
  } else if (kind === "studioTours") {
    pushNews(s, "Info", `🚌 ${s.player.name} ${cur === 0 ? "opens" : "expands"} studio tours — passive monthly revenue boost.`, "🚌", false, [s.player.id]);
  } else {
    pushNews(s, "Info", `${s.player.name} upgrades ${prettyFacility(kind)} → tier ${cur + 1}.`, "🏗️", false, [s.player.id]);
  }
  return true;
}

/** Release a soundtrack album for a movie. Pays out a small revenue
 *  stream based on box office and quality. One-time action per movie. */
export function releaseSoundtrack(s: Studio, movieId: string): "ok" | "missing" | "alreadyOut" | "notYours" {
  const m = s.releases.find(r => r.id === movieId);
  if (!m) return "missing";
  if (m.studioId !== s.player.id) return "notYours";
  if (m.soundtrack?.released) return "alreadyOut";
  // Revenue scales with audience score + box office: ~3-15% of opening.
  const factor = 0.03 + (m.audienceScore / 1000);  // 0.03..0.13
  const revenue = Math.max(0.5, Math.round(m.opening * factor * 10) / 10);
  m.soundtrack = { released: true, revenue };
  s.player.cash += revenue;
  s.player.totalRevenue += revenue;
  s.player.totalProfit += revenue;
  pushNews(s, "Box Office", `🎵 "${m.title}" soundtrack drops — adds $${revenue.toFixed(1)}M to the bottom line.`, "🎵", false, [s.player.id]);
  return "ok";
}

function prettyFacility(k: string): string {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

/** Is the player effectively bankrupt? (Triggers game-over UI.) */
export function isBankrupt(s: Studio): boolean {
  return s.player.defaults >= 3 || (s.player.cash < -10 && s.player.loan > 30);
}

// ─── V2: Casting compatibility & negotiation ─────────────────

/** Check whether a talent will accept a role at the script's target
 *  rating, given the script's content requirements. Returns either
 *  ok=true (they accept), or ok=false with reason citing the axis
 *  that's incompatible. */
export function checkCastingCompat(t: Talent, requirements: ContentComfort): { ok: true } | { ok: false; reason: string } {
  if (!t.comfort) return { ok: true };  // writers, legacy talent
  const axes: Array<keyof ContentComfort> = ["violence", "nudity", "sexuality", "language", "drugs"];
  for (const a of axes) {
    if (requirements[a] > t.comfort[a]) {
      return { ok: false, reason: `${t.name} declines ${a} content at this level.` };
    }
  }
  return { ok: true };
}

/** Compute what the talent will accept given an offer. The caller
 *  decides which of the talent's caveats to grant. Returns:
 *  - accepted: list of caveat ids they consider satisfied
 *  - missing: caveats they wanted that weren't granted (each carries weight)
 *  - acceptanceProb: 0..1 likelihood they'll sign with this exact bundle
 *  - feeAdjust: $M discount/premium relative to base fee */
export function evaluateOffer(t: Talent, granted: CaveatId[]): {
  accepted: CaveatId[];
  missing: { id: CaveatId; weight: number; label: string }[];
  acceptanceProb: number;
  feeAdjust: number;
} {
  const caveats = t.caveats ?? [];
  const missing: { id: CaveatId; weight: number; label: string }[] = [];
  let unmetWeight = 0;
  let grantedWeight = 0;
  for (const c of caveats) {
    if (granted.includes(c.id)) {
      grantedWeight += c.weight;
    } else {
      missing.push({ id: c.id, weight: c.weight, label: c.label });
      unmetWeight += c.weight;
    }
  }
  // Probability: 1.0 if all granted; 0.4 baseline if all refused.
  const total = caveats.reduce((sum, c) => sum + c.weight, 0) || 1;
  const acceptanceProb = caveats.length === 0 ? 1 : Math.max(0.25, 1 - unmetWeight / (total + 0.5));
  // Granting "small" caveats is free; "medium" costs $0.5M flexibility;
  // "large" costs $2M. We surface this back to the caller as a fee delta.
  let feeAdjust = 0;
  for (const c of caveats) {
    if (granted.includes(c.id)) {
      if (c.cost === "small") feeAdjust -= 0.2;  // happy talent → small discount
      if (c.cost === "medium") feeAdjust += 0;   // wash
      if (c.cost === "large") feeAdjust += 1;   // they take less cash but bigger ask
    }
  }
  return { accepted: granted, missing, acceptanceProb, feeAdjust };
}

/** Quality bonus from caveats the studio granted across all attached
 *  talent on a production. Granted-caveat talent perform better because
 *  they got their asks; small bonus per granted, larger for "large" cost. */
export function caveatQualityBonus(production: Production): number {
  const granted = production.grantedCaveats ?? {};
  let bonus = 0;
  for (const ids of Object.values(granted)) {
    bonus += (ids?.length ?? 0) * 1.5;
  }
  return Math.min(15, bonus);
}

/** Audience-reach modifier from the target content rating. PG-13 is
 *  the broadest; G slightly narrows (kids movies miss adult dollars);
 *  R cuts ~25%; NC-17 cuts ~50%. */
export function ratingReachModifier(rating: ContentRating): number {
  switch (rating) {
    case "G":     return 0.85;
    case "PG":    return 0.95;
    case "PG-13": return 1.00;
    case "R":     return 0.75;
    case "NC-17": return 0.50;
  }
}
