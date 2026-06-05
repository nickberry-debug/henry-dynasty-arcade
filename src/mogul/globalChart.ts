// Movie Mogul — family-shared Top 50 Highest Grossing chart.
//
// Every profile contributes to the SAME global list: when any family
// member releases a movie, it gets pushed to /rooms/{code}/globalChart/
// movies (no profile prefix — this is the only mogul collection that's
// intentionally shared across the whole arcade). To keep the chart
// interesting from day one, the module also seeds a roster of AI-flavored
// "filler" movies the first time the cloud chart is read; real player
// releases displace filler from the top 50 as they earn more box office.
//
// Updates are last-writer-wins by movie id (so the same movie's updated
// totalBO after additional theatrical weeks replaces the prior entry,
// not stacks).

import { ensureAnonAuth, getDb, getRoomCode } from "../sync/firebase";
import { markSyncedNow } from "../sync/cloudBlob";
import { doc, setDoc, getDocs, collection, onSnapshot, type DocumentData, type Unsubscribe } from "firebase/firestore";
import type { ReleasedMovie } from "./types";

/** Entry written to the shared chart. The full ReleasedMovie is too
 *  heavy and exposes player-private details; we only push the public
 *  scoreboard view. */
export interface ChartEntry {
  id: string;
  title: string;
  genre: string;
  releaseYear: number;
  totalBO: number;
  /** Critic + audience scores so the chart can show quality alongside gross. */
  criticScore: number;
  audienceScore: number;
  /** "real" = an actual player release; "filler" = seeded AI flavor. */
  source: "real" | "filler";
  /** Owner profile id for real releases (null for filler). Used for
   *  attribution badges, not filtering. */
  profileId: string | null;
  /** Display label for who released it (player handle for real, "—" or
   *  studio name for filler). */
  releasedBy: string;
  /** Sortable timestamp of last update. */
  updatedAt: number;
}

const COLL = "globalChart";

function chartColl() {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return collection(fdb, "rooms", code, COLL);
}

function chartDoc(id: string) {
  const code = getRoomCode();
  const fdb = getDb();
  if (!code || !fdb) return null;
  return doc(fdb, "rooms", code, COLL, id);
}

function sanitize<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(sanitize) as any;
  if (typeof v === "object") {
    const out: any = {};
    for (const [k, x] of Object.entries(v as any)) {
      if (x === undefined) continue;
      out[k] = sanitize(x);
    }
    return out;
  }
  return v;
}

/** Push (or update) one real movie release to the family chart. */
export async function pushRealRelease(
  movie: ReleasedMovie,
  profileId: string,
  releasedBy: string,
): Promise<void> {
  if (!(await ensureAnonAuth())) return;
  const ref = chartDoc(movie.id);
  if (!ref) return;
  const entry: ChartEntry = {
    id: movie.id,
    title: movie.title,
    genre: String(movie.genre),
    releaseYear: movie.releaseYear,
    totalBO: Math.round(movie.totalBO * 10) / 10,
    criticScore: Math.round(movie.criticScore),
    audienceScore: Math.round(movie.audienceScore),
    source: "real",
    profileId,
    releasedBy,
    updatedAt: Date.now(),
  };
  try { await setDoc(ref, sanitize(entry)); }
  catch (err) { console.warn("[chart] push real failed", err); }
}

/** Live-subscribe to the chart collection. The callback fires on every
 *  remote change with the top N entries already sorted, so the page
 *  re-renders without polling. Returns an unsubscribe. */
export function subscribeTopGrossing(limit: number, cb: (entries: ChartEntry[]) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  (async () => {
    if (!(await ensureAnonAuth())) return;
    if (cancelled) return;
    const coll = chartColl();
    if (!coll) return;
    unsub = onSnapshot(coll, snap => {
      const all: ChartEntry[] = [];
      snap.forEach(d => {
        const e = d.data() as DocumentData as ChartEntry;
        if (e && typeof e.totalBO === "number" && typeof e.title === "string") all.push(e);
      });
      all.sort((a, b) => b.totalBO - a.totalBO);
      markSyncedNow();
      cb(all.slice(0, limit));
    }, err => console.warn("[chart] live subscribe error", err));
  })();
  return () => {
    cancelled = true;
    if (unsub) { try { unsub(); } catch { /* ignore */ } unsub = null; }
  };
}

/** Bulk pull the chart; returns the top N by totalBO descending. */
export async function topGrossing(limit = 50): Promise<ChartEntry[]> {
  if (!(await ensureAnonAuth())) return [];
  const coll = chartColl();
  if (!coll) return [];
  try {
    const snap = await getDocs(coll);
    const all: ChartEntry[] = [];
    snap.forEach(d => {
      const e = d.data() as DocumentData as ChartEntry;
      if (e && typeof e.totalBO === "number" && typeof e.title === "string") all.push(e);
    });
    all.sort((a, b) => b.totalBO - a.totalBO);
    return all.slice(0, limit);
  } catch (err) {
    console.warn("[chart] read failed", err);
    return [];
  }
}

// ── Filler movies ──────────────────────────────────────────────────────────
// Original, fictional placeholder films seeded on first read so the chart
// is full of plausible competition from day one. Player releases displace
// filler as they earn more gross. Titles and box office are made up — no
// real franchises, no real numbers — to keep this deploy-clean (no IP).

const FILLER: Omit<ChartEntry, "id" | "source" | "profileId" | "releasedBy" | "updatedAt">[] = [
  { title: "Twin Suns of Avela", genre: "scifi",     releaseYear: 2019, totalBO: 1820.4, criticScore: 88, audienceScore: 92 },
  { title: "The Velvet Verdict", genre: "drama",     releaseYear: 2014, totalBO: 1455.7, criticScore: 94, audienceScore: 86 },
  { title: "Crown of Embers",    genre: "fantasy",   releaseYear: 2017, totalBO: 1402.1, criticScore: 81, audienceScore: 89 },
  { title: "Operation Halftime", genre: "action",    releaseYear: 2021, totalBO: 1325.6, criticScore: 76, audienceScore: 84 },
  { title: "Lights Out, Kid",    genre: "comedy",    releaseYear: 2018, totalBO: 1278.2, criticScore: 72, audienceScore: 90 },
  { title: "Glasshouse",         genre: "thriller",  releaseYear: 2020, totalBO: 1190.0, criticScore: 89, audienceScore: 81 },
  { title: "Marigold Heights",   genre: "drama",     releaseYear: 2013, totalBO: 1142.8, criticScore: 91, audienceScore: 78 },
  { title: "Asteroid Diner",     genre: "scifi",     releaseYear: 2022, totalBO: 1098.5, criticScore: 79, audienceScore: 87 },
  { title: "Bandit Country",     genre: "western",   releaseYear: 2015, totalBO: 1064.3, criticScore: 85, audienceScore: 80 },
  { title: "Silver Hour",        genre: "romance",   releaseYear: 2016, totalBO:  998.7, criticScore: 83, audienceScore: 91 },
  { title: "Nine Lives of Mira", genre: "fantasy",   releaseYear: 2019, totalBO:  951.2, criticScore: 77, audienceScore: 88 },
  { title: "Switchback Pass",    genre: "thriller",  releaseYear: 2018, totalBO:  912.9, criticScore: 80, audienceScore: 79 },
  { title: "Last Light Battalion",genre: "action",   releaseYear: 2017, totalBO:  894.0, criticScore: 70, audienceScore: 82 },
  { title: "Cardboard Kings",    genre: "comedy",    releaseYear: 2021, totalBO:  860.6, criticScore: 74, audienceScore: 86 },
  { title: "The Long Quiet",     genre: "horror",    releaseYear: 2020, totalBO:  843.1, criticScore: 88, audienceScore: 74 },
  { title: "Greenhouse Girl",    genre: "drama",     releaseYear: 2012, totalBO:  812.7, criticScore: 92, audienceScore: 75 },
  { title: "Skystone",           genre: "fantasy",   releaseYear: 2015, totalBO:  789.4, criticScore: 78, audienceScore: 83 },
  { title: "Final Stride",       genre: "drama",     releaseYear: 2019, totalBO:  765.0, criticScore: 86, audienceScore: 82 },
  { title: "Riot Season",        genre: "action",    releaseYear: 2014, totalBO:  741.3, criticScore: 68, audienceScore: 80 },
  { title: "Paper Cathedrals",   genre: "drama",     releaseYear: 2011, totalBO:  720.6, criticScore: 95, audienceScore: 73 },
  { title: "Big Magic Friday",   genre: "comedy",    releaseYear: 2022, totalBO:  701.5, criticScore: 71, audienceScore: 88 },
  { title: "The 9:14 to Truro",  genre: "thriller",  releaseYear: 2017, totalBO:  688.2, criticScore: 84, audienceScore: 78 },
  { title: "Saltbreaker",        genre: "action",    releaseYear: 2020, totalBO:  667.0, criticScore: 73, audienceScore: 80 },
  { title: "Hollow Moon",        genre: "horror",    releaseYear: 2018, totalBO:  640.4, criticScore: 81, audienceScore: 72 },
  { title: "Glassworks",         genre: "drama",     releaseYear: 2016, totalBO:  622.8, criticScore: 90, audienceScore: 77 },
  { title: "Backyard Empire",    genre: "comedy",    releaseYear: 2013, totalBO:  600.0, criticScore: 75, audienceScore: 84 },
  { title: "Outrunner",          genre: "scifi",     releaseYear: 2015, totalBO:  581.1, criticScore: 76, audienceScore: 86 },
  { title: "The Cartographer",   genre: "drama",     releaseYear: 2014, totalBO:  560.3, criticScore: 89, audienceScore: 74 },
  { title: "Heat Lightning",     genre: "thriller",  releaseYear: 2019, totalBO:  544.7, criticScore: 82, audienceScore: 79 },
  { title: "Tin Hearts",         genre: "romance",   releaseYear: 2021, totalBO:  529.2, criticScore: 80, audienceScore: 88 },
  { title: "Last Day at Camp",   genre: "horror",    releaseYear: 2016, totalBO:  512.6, criticScore: 78, audienceScore: 73 },
  { title: "Pageant of Birds",   genre: "fantasy",   releaseYear: 2018, totalBO:  500.0, criticScore: 84, audienceScore: 81 },
  { title: "Tradewinds",         genre: "action",    releaseYear: 2017, totalBO:  486.4, criticScore: 72, audienceScore: 79 },
  { title: "The Quiet Engineer", genre: "drama",     releaseYear: 2020, totalBO:  470.1, criticScore: 91, audienceScore: 76 },
  { title: "Bone & Bramble",     genre: "horror",    releaseYear: 2022, totalBO:  455.3, criticScore: 79, audienceScore: 74 },
  { title: "Mile Marker 12",     genre: "thriller",  releaseYear: 2015, totalBO:  440.8, criticScore: 83, audienceScore: 77 },
  { title: "Daylight Auction",   genre: "drama",     releaseYear: 2013, totalBO:  425.0, criticScore: 87, audienceScore: 70 },
  { title: "Reef Knight",        genre: "scifi",     releaseYear: 2019, totalBO:  411.7, criticScore: 74, audienceScore: 81 },
  { title: "Backyard Astronauts",genre: "comedy",    releaseYear: 2021, totalBO:  398.2, criticScore: 76, audienceScore: 87 },
  { title: "Hexline",            genre: "fantasy",   releaseYear: 2016, totalBO:  384.6, criticScore: 73, audienceScore: 79 },
  { title: "Stormwhistle",       genre: "action",    releaseYear: 2014, totalBO:  371.9, criticScore: 68, audienceScore: 78 },
  { title: "Velvet & Vinegar",   genre: "comedy",    releaseYear: 2018, totalBO:  360.4, criticScore: 77, audienceScore: 83 },
  { title: "Ironwood",           genre: "drama",     releaseYear: 2012, totalBO:  348.0, criticScore: 88, audienceScore: 71 },
  { title: "Roomful of Wolves",  genre: "thriller",  releaseYear: 2020, totalBO:  335.6, criticScore: 80, audienceScore: 75 },
  { title: "Atlas of Small Things",genre: "drama",   releaseYear: 2017, totalBO:  322.4, criticScore: 92, audienceScore: 72 },
  { title: "Big Sun Festival",   genre: "comedy",    releaseYear: 2019, totalBO:  311.0, criticScore: 70, audienceScore: 80 },
  { title: "Black Lake Crossing",genre: "horror",    releaseYear: 2015, totalBO:  299.8, criticScore: 75, audienceScore: 70 },
  { title: "Spire of Mornings",  genre: "fantasy",   releaseYear: 2013, totalBO:  287.5, criticScore: 81, audienceScore: 76 },
  { title: "Highwire",           genre: "action",    releaseYear: 2020, totalBO:  274.2, criticScore: 69, audienceScore: 75 },
  { title: "Petals of the Storm",genre: "romance",   releaseYear: 2018, totalBO:  261.7, criticScore: 78, audienceScore: 84 },
  { title: "Postcard from the End",genre: "drama",   releaseYear: 2014, totalBO:  250.0, criticScore: 86, audienceScore: 73 },
];

const SEED_FLAG = "dd_mogul_chart_seeded_v1";

/** Seed the filler movies once per room — idempotent. Called by the
 *  Chart page on first read so the leaderboard is never empty even before
 *  the family has released their own films. */
export async function ensureFillerSeeded(): Promise<void> {
  if (typeof localStorage !== "undefined" && localStorage.getItem(SEED_FLAG) === getRoomCode()) return;
  if (!(await ensureAnonAuth())) return;
  try {
    // Check if filler already present — count cheaply.
    const existing = await topGrossing(1);
    if (existing.some(e => e.source === "filler")) {
      try { localStorage.setItem(SEED_FLAG, getRoomCode() ?? ""); } catch {}
      return;
    }
    const fdb = getDb();
    const code = getRoomCode();
    if (!fdb || !code) return;
    const now = Date.now();
    await Promise.all(FILLER.map((f, i) => {
      const id = `filler_${i.toString().padStart(2, "0")}`;
      const entry: ChartEntry = {
        ...f, id, source: "filler", profileId: null,
        releasedBy: "—", updatedAt: now,
      };
      return setDoc(doc(fdb, "rooms", code, COLL, id), sanitize(entry));
    }));
    try { localStorage.setItem(SEED_FLAG, code); } catch {}
  } catch (err) {
    console.warn("[chart] seed failed", err);
  }
}
