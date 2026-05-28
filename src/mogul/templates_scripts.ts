// Real-movie-inspired script template library. Each template is a
// loose nod to a real Hollywood classic — same era, same genre, same
// archetypal feel — with titles changed to avoid defamation. Players
// recognize the "type" of movie without us using real IP.
//
// Templates are matched to era at script-market generation time so the
// world stays grounded (no rom-coms in Golden Age westerns, etc.).

import type { Genre, ContentRating, Era, RequiredRole, ContentComfort } from "./types";

export interface ScriptTemplate {
  id: string;
  title: string;
  genre: Genre;
  era: Era;
  rating: ContentRating;
  quality: 1 | 2 | 3 | 4 | 5;
  themes: string[];
  premise: string;
  requiredRoles: RequiredRole[];
  requirements: ContentComfort;
}

// Shorthand helpers
const lead = (label: string, gender: "M" | "F" | "any", ageBand?: "young" | "middleAged" | "older"): RequiredRole =>
  ({ label, slot: "lead", gender, ageBand, isLead: true });
const co = (label: string, slot: string, gender: "M" | "F" | "any", ageBand?: "young" | "middleAged" | "older"): RequiredRole =>
  ({ label, slot, gender, ageBand });

const comfort = (v: number, n: number, s: number, l: number, d: number): ContentComfort => ({
  violence: v as 0 | 1 | 2 | 3,
  nudity: n as 0 | 1 | 2 | 3,
  sexuality: s as 0 | 1 | 2 | 3,
  language: l as 0 | 1 | 2 | 3,
  drugs: d as 0 | 1 | 2 | 3,
});

// ─── GOLDEN AGE (1955-1970) ───────────────────────────────────
const GOLDEN: ScriptTemplate[] = [
  {
    id: "g-western-01", title: "Dust at Sundown", genre: "Western", era: "golden", rating: "PG", quality: 4,
    themes: ["honor", "vengeance", "frontier"],
    premise: "A retired sharpshooter returns to settle one last score in a dying frontier town.",
    requiredRoles: [lead("Aging Gunfighter", "M", "older"), co("Town Sheriff", "sheriff", "M", "middleAged"), co("Bar Owner", "bar", "F", "middleAged")],
    requirements: comfort(2, 0, 0, 1, 0),
  },
  {
    id: "g-western-02", title: "The Lonesome Trail", genre: "Western", era: "golden", rating: "G", quality: 3,
    themes: ["coming of age", "homestead", "courage"],
    premise: "A young homesteader defends his family ranch against a land baron's hired men.",
    requiredRoles: [lead("Young Rancher", "M", "young"), co("Land Baron", "baron", "M", "older"), co("Ranch Hand", "hand", "M", "middleAged")],
    requirements: comfort(1, 0, 0, 0, 0),
  },
  {
    id: "g-musical-01", title: "Stars on Broadway", genre: "Musical", era: "golden", rating: "G", quality: 4,
    themes: ["romance", "stardom", "perseverance"],
    premise: "A small-town singer braves Broadway in pursuit of a lead role and the producer who scorns her.",
    requiredRoles: [lead("Ingenue Singer", "F", "young"), co("Hardened Producer", "producer", "M", "older"), co("Stage Manager", "manager", "M", "middleAged")],
    requirements: comfort(0, 0, 1, 0, 0),
  },
  {
    id: "g-musical-02", title: "Rain on the Avenue", genre: "Musical", era: "golden", rating: "G", quality: 5,
    themes: ["love triangle", "showbiz", "comedy"],
    premise: "Two song-and-dance partners adjust to the talkie era while a starlet drives a wedge between them.",
    requiredRoles: [lead("Charismatic Dancer", "M", "middleAged"), co("Partner Singer", "partner", "M", "middleAged"), co("Rising Starlet", "starlet", "F", "young")],
    requirements: comfort(0, 0, 1, 0, 0),
  },
  {
    id: "g-drama-01", title: "Twelve Voices", genre: "Drama", era: "golden", rating: "PG", quality: 5,
    themes: ["justice", "prejudice", "civic duty"],
    premise: "A lone holdout juror challenges his peers to reconsider a slum boy's murder conviction.",
    requiredRoles: [lead("Architect Juror", "M", "middleAged"), co("Hot-Tempered Juror", "hot", "M", "older"), co("Foreman", "foreman", "M", "older")],
    requirements: comfort(1, 0, 0, 1, 0),
  },
  {
    id: "g-drama-02", title: "Streetcar Tales", genre: "Drama", era: "golden", rating: "PG-13", quality: 5,
    themes: ["family", "delusion", "tragedy"],
    premise: "A fading southern belle arrives at her sister's New Orleans apartment, where her brother-in-law's truth shatters her.",
    requiredRoles: [lead("Fading Belle", "F", "middleAged"), co("Brother-in-Law", "bil", "M", "young"), co("Sister", "sis", "F", "young")],
    requirements: comfort(1, 1, 2, 1, 1),
  },
  {
    id: "g-war-01", title: "Bridge Across the Quai", genre: "War", era: "golden", rating: "PG", quality: 5,
    themes: ["sacrifice", "duty", "futility"],
    premise: "British POWs forced to build a strategic bridge collide with a daring commando raid.",
    requiredRoles: [lead("British Colonel", "M", "older"), co("Saboteur Major", "saboteur", "M", "middleAged"), co("Japanese Commander", "japcom", "M", "middleAged")],
    requirements: comfort(2, 0, 0, 1, 0),
  },
  {
    id: "g-romance-01", title: "Letters from Lisbon", genre: "Romance", era: "golden", rating: "PG", quality: 4,
    themes: ["fate", "wartime", "sacrifice"],
    premise: "A nightclub owner in neutral Lisbon must choose between an old flame and helping her freedom-fighter husband escape.",
    requiredRoles: [lead("Club Owner", "M", "middleAged"), co("Old Flame", "flame", "F", "middleAged"), co("Husband", "husband", "M", "middleAged")],
    requirements: comfort(1, 0, 1, 0, 0),
  },
  {
    id: "g-thriller-01", title: "Window into Madness", genre: "Thriller", era: "golden", rating: "PG", quality: 5,
    themes: ["voyeurism", "paranoia", "mystery"],
    premise: "A photographer convalescing in a wheelchair suspects a neighbor across the courtyard has murdered his wife.",
    requiredRoles: [lead("Photographer", "M", "middleAged"), co("Girlfriend", "gf", "F", "young"), co("Suspect Neighbor", "neighbor", "M", "older")],
    requirements: comfort(2, 0, 0, 0, 0),
  },
  {
    id: "g-comedy-01", title: "Some Like It Hot Plate", genre: "Comedy", era: "golden", rating: "PG", quality: 5,
    themes: ["mistaken identity", "gangsters", "farce"],
    premise: "Two struggling musicians witness a mob hit and disguise themselves in an all-female band to escape.",
    requiredRoles: [lead("Sax Player", "M", "young"), co("Bass Player", "bass", "M", "young"), co("Lead Singer", "singer", "F", "young")],
    requirements: comfort(1, 0, 1, 0, 0),
  },
];

// ─── NEW HOLLYWOOD (1971-1986) ────────────────────────────────
const NEW_HOLLYWOOD: ScriptTemplate[] = [
  {
    id: "nh-thriller-01", title: "Echo of the Gulf", genre: "Thriller", era: "newHollywood", rating: "PG", quality: 5,
    themes: ["man vs nature", "small town", "obsession"],
    premise: "A small-town sheriff hunts a colossal shark terrorizing a beach resort with the help of a marine biologist.",
    requiredRoles: [lead("Sheriff", "M", "middleAged"), co("Marine Biologist", "bio", "M", "young"), co("Salty Captain", "captain", "M", "older")],
    requirements: comfort(2, 0, 0, 1, 0),
  },
  {
    id: "nh-drama-01", title: "Once a Family", genre: "Drama", era: "newHollywood", rating: "R", quality: 5,
    themes: ["family business", "loyalty", "corruption"],
    premise: "The reluctant son of a Sicilian crime patriarch inherits the family's bloody empire.",
    requiredRoles: [lead("Reluctant Son", "M", "young"), co("Aging Patriarch", "patriarch", "M", "older"), co("Older Brother", "bro", "M", "middleAged")],
    requirements: comfort(3, 1, 1, 2, 1),
  },
  {
    id: "nh-scifi-01", title: "Long Night, Tomorrow", genre: "SciFi", era: "newHollywood", rating: "R", quality: 4,
    themes: ["dystopia", "memory", "noir"],
    premise: "A retired blade-running detective is pulled back in to hunt synthetic humans hiding in a rain-soaked future LA.",
    requiredRoles: [lead("Detective", "M", "middleAged"), co("Synthetic Femme Fatale", "synth", "F", "young"), co("Lead Replicant", "rep", "M", "middleAged")],
    requirements: comfort(2, 2, 2, 2, 1),
  },
  {
    id: "nh-action-01", title: "Crimson Sky", genre: "Action", era: "newHollywood", rating: "PG-13", quality: 4,
    themes: ["aviation", "rivalry", "loss"],
    premise: "An ace navy pilot navigates rivalry, romance, and tragedy at an elite flight school.",
    requiredRoles: [lead("Hotshot Pilot", "M", "young"), co("Civilian Instructor", "ci", "F", "young"), co("Rival Pilot", "rival", "M", "young")],
    requirements: comfort(2, 1, 1, 2, 0),
  },
  {
    id: "nh-horror-01", title: "Halloween Vigil", genre: "Horror", era: "newHollywood", rating: "R", quality: 4,
    themes: ["slasher", "babysitter", "evil"],
    premise: "A psychotic killer escapes the asylum and stalks a suburban babysitter on Halloween night.",
    requiredRoles: [lead("Babysitter", "F", "young"), co("Psychiatrist", "doc", "M", "older"), co("Friend", "friend", "F", "young")],
    requirements: comfort(3, 1, 1, 2, 0),
  },
  {
    id: "nh-drama-02", title: "Hollow Heart", genre: "Drama", era: "newHollywood", rating: "R", quality: 5,
    themes: ["boxing", "redemption", "family"],
    premise: "A washed-up middleweight gets one improbable shot at the heavyweight title.",
    requiredRoles: [lead("Aging Boxer", "M", "middleAged"), co("Shy Girlfriend", "gf", "F", "young"), co("Hard-Nosed Trainer", "coach", "M", "older")],
    requirements: comfort(2, 0, 1, 2, 0),
  },
  {
    id: "nh-thriller-02", title: "The Manchurian Letter", genre: "Thriller", era: "newHollywood", rating: "R", quality: 4,
    themes: ["conspiracy", "cold war", "memory"],
    premise: "A returning Korean War vet uncovers a brainwashing plot reaching to the highest political office.",
    requiredRoles: [lead("Veteran", "M", "middleAged"), co("Mother", "mom", "F", "older"), co("Senator", "sen", "M", "older")],
    requirements: comfort(2, 0, 0, 2, 0),
  },
  {
    id: "nh-romance-01", title: "Hannah's Year", genre: "Romance", era: "newHollywood", rating: "PG-13", quality: 4,
    themes: ["sisters", "infidelity", "manhattan"],
    premise: "Three sisters in 1980s Manhattan navigate love, illness, and overlapping affairs across one calendar year.",
    requiredRoles: [lead("Eldest Sister", "F", "middleAged"), co("Middle Sister", "mid", "F", "middleAged"), co("Younger Sister", "young", "F", "young")],
    requirements: comfort(0, 1, 2, 1, 1),
  },
  {
    id: "nh-comedy-01", title: "The Big Sleep-In", genre: "Comedy", era: "newHollywood", rating: "R", quality: 3,
    themes: ["college", "rebellion", "fraternity"],
    premise: "A misfit fraternity at a stuffy 1960s college rebels against the administration in a year-long prank war.",
    requiredRoles: [lead("Frat Leader", "M", "young"), co("Square Dean", "dean", "M", "older"), co("Sorority Girl", "soror", "F", "young")],
    requirements: comfort(1, 2, 2, 3, 2),
  },
  {
    id: "nh-war-01", title: "Apocalypse Yesterday", genre: "War", era: "newHollywood", rating: "R", quality: 5,
    themes: ["madness", "war", "imperialism"],
    premise: "A jaded Army captain travels up a Vietnamese river to assassinate a rogue colonel gone native.",
    requiredRoles: [lead("Mission Captain", "M", "middleAged"), co("Rogue Colonel", "rogue", "M", "older"), co("Photo Journalist", "photo", "M", "middleAged")],
    requirements: comfort(3, 1, 1, 3, 2),
  },
];

// ─── BLOCKBUSTER ERA (1987-2005) ──────────────────────────────
const BLOCKBUSTER: ScriptTemplate[] = [
  {
    id: "bb-action-01", title: "Hard Day at Nakatomi", genre: "Action", era: "blockbuster", rating: "R", quality: 5,
    themes: ["one-man-army", "siege", "wit"],
    premise: "A New York cop crashes his estranged wife's office Christmas party — and finds it taken over by terrorists.",
    requiredRoles: [lead("NYPD Cop", "M", "middleAged"), co("Lead Terrorist", "terr", "M", "middleAged"), co("Estranged Wife", "wife", "F", "middleAged")],
    requirements: comfort(3, 0, 0, 3, 0),
  },
  {
    id: "bb-action-02", title: "T2: Future Past", genre: "Action", era: "blockbuster", rating: "R", quality: 5,
    themes: ["time travel", "mother-son", "machines"],
    premise: "A reprogrammed killer cyborg protects a teenage boy and his mother from a more advanced shape-shifting assassin.",
    requiredRoles: [lead("Cyborg Protector", "M", "middleAged"), co("Teenage Boy", "boy", "M", "young"), co("Tough Mother", "mom", "F", "middleAged")],
    requirements: comfort(3, 0, 1, 3, 0),
  },
  {
    id: "bb-scifi-01", title: "Mesozoic Garden", genre: "SciFi", era: "blockbuster", rating: "PG-13", quality: 5,
    themes: ["hubris", "dinosaurs", "wonder"],
    premise: "Scientists trapped in an experimental dinosaur theme park fight to escape after security collapses.",
    requiredRoles: [lead("Paleontologist", "M", "middleAged"), co("Geneticist", "gen", "F", "middleAged"), co("Park Owner", "owner", "M", "older")],
    requirements: comfort(2, 0, 0, 1, 0),
  },
  {
    id: "bb-romance-01", title: "Iceberg, Right Ahead", genre: "Romance", era: "blockbuster", rating: "PG-13", quality: 5,
    themes: ["class", "tragedy", "ocean"],
    premise: "A poor artist and a wealthy first-class passenger fall in love on the maiden voyage of an ill-fated luxury liner.",
    requiredRoles: [lead("Penniless Artist", "M", "young"), co("Engaged Heiress", "heir", "F", "young"), co("Cruel Fiancé", "fiance", "M", "young")],
    requirements: comfort(1, 1, 2, 1, 0),
  },
  {
    id: "bb-drama-01", title: "Shawshank Echo", genre: "Drama", era: "blockbuster", rating: "R", quality: 5,
    themes: ["friendship", "patience", "hope"],
    premise: "A banker wrongfully convicted of murder befriends a lifer and slowly, patiently, plots his own freedom.",
    requiredRoles: [lead("Wronged Banker", "M", "middleAged"), co("Lifer Friend", "friend", "M", "older"), co("Warden", "warden", "M", "older")],
    requirements: comfort(3, 1, 1, 3, 1),
  },
  {
    id: "bb-thriller-01", title: "The Silence", genre: "Thriller", era: "blockbuster", rating: "R", quality: 5,
    themes: ["serial killer", "fbi", "psychology"],
    premise: "A young FBI trainee enlists an imprisoned cannibal psychiatrist to hunt another active serial killer.",
    requiredRoles: [lead("FBI Trainee", "F", "young"), co("Imprisoned Doctor", "doc", "M", "older"), co("Active Killer", "killer", "M", "middleAged")],
    requirements: comfort(3, 1, 0, 2, 0),
  },
  {
    id: "bb-comedy-01", title: "Some Awful Day", genre: "Comedy", era: "blockbuster", rating: "PG", quality: 4,
    themes: ["time loop", "redemption", "love"],
    premise: "A cynical weatherman covering a small-town festival relives the same February day over and over.",
    requiredRoles: [lead("Cynical Weatherman", "M", "middleAged"), co("Producer Love Interest", "love", "F", "middleAged"), co("Goofy Cameraman", "cam", "M", "young")],
    requirements: comfort(0, 0, 1, 1, 0),
  },
  {
    id: "bb-horror-01", title: "Witch Tape", genre: "Horror", era: "blockbuster", rating: "R", quality: 3,
    themes: ["found footage", "folklore", "isolation"],
    premise: "Three film students disappear in the Maryland woods after a 1999 documentary about a local witch legend.",
    requiredRoles: [lead("Director Student", "F", "young"), co("Cameraman", "cam", "M", "young"), co("Soundman", "snd", "M", "young")],
    requirements: comfort(2, 0, 0, 3, 0),
  },
  {
    id: "bb-fantasy-01", title: "The Stone of Power", genre: "Fantasy", era: "blockbuster", rating: "PG-13", quality: 5,
    themes: ["fellowship", "quest", "darkness"],
    premise: "A small-statured hero from a peaceful homeland sets out to destroy an evil artifact in a volcanic wasteland.",
    requiredRoles: [lead("Reluctant Hero", "M", "young"), co("Wizard Mentor", "wiz", "M", "older"), co("Loyal Companion", "comp", "M", "young")],
    requirements: comfort(2, 0, 0, 1, 0),
  },
  {
    id: "bb-action-03", title: "Speed Bomb", genre: "Action", era: "blockbuster", rating: "R", quality: 4,
    themes: ["high concept", "bus", "bomb"],
    premise: "An LA cop must keep a city bus above 50 mph, or a bomb will detonate.",
    requiredRoles: [lead("Bomb Cop", "M", "young"), co("Reluctant Driver", "driver", "F", "young"), co("Bomber", "bomber", "M", "older")],
    requirements: comfort(3, 0, 1, 2, 0),
  },
  {
    id: "bb-drama-02", title: "Two Quarts Low", genre: "Drama", era: "blockbuster", rating: "R", quality: 4,
    themes: ["father-son", "baseball", "memory"],
    premise: "An Iowa farmer hears a voice in his cornfield and builds a baseball diamond to summon his father's ghost.",
    requiredRoles: [lead("Iowa Farmer", "M", "middleAged"), co("Father's Ghost", "ghost", "M", "older"), co("Wife", "wife", "F", "middleAged")],
    requirements: comfort(0, 0, 0, 1, 0),
  },
];

// ─── MODERN (2006-PRESENT) ────────────────────────────────────
const MODERN: ScriptTemplate[] = [
  {
    id: "m-superhero-01", title: "Iron Throne Rises", genre: "Action", era: "modern", rating: "PG-13", quality: 4,
    themes: ["billionaire", "tech", "redemption"],
    premise: "A weapons-magnate genius held hostage in a desert cave builds a flying mech suit to escape — and becomes a reluctant icon.",
    requiredRoles: [lead("Billionaire Inventor", "M", "middleAged"), co("Loyal Assistant", "asst", "F", "young"), co("Mentor Villain", "vill", "M", "older")],
    requirements: comfort(2, 0, 1, 2, 0),
  },
  {
    id: "m-thriller-01", title: "Dark Mirror Society", genre: "Thriller", era: "modern", rating: "R", quality: 5,
    themes: ["surveillance", "social media", "paranoia"],
    premise: "A tech worker discovers her smart-home assistant has been manipulating her relationships for years.",
    requiredRoles: [lead("Tech Worker", "F", "young"), co("Tech CEO", "ceo", "M", "middleAged"), co("Best Friend", "friend", "F", "young")],
    requirements: comfort(2, 1, 1, 2, 0),
  },
  {
    id: "m-drama-01", title: "Once a Land", genre: "Drama", era: "modern", rating: "R", quality: 5,
    themes: ["hollywood", "nostalgia", "violence"],
    premise: "A fading TV actor and his stunt-double sidekick navigate late-1960s Hollywood as a notorious cult lurks next door.",
    requiredRoles: [lead("Fading Actor", "M", "middleAged"), co("Stunt Double", "stunt", "M", "middleAged"), co("Rising Starlet", "starlet", "F", "young")],
    requirements: comfort(3, 1, 1, 3, 2),
  },
  {
    id: "m-scifi-01", title: "Tessellation", genre: "SciFi", era: "modern", rating: "PG-13", quality: 5,
    themes: ["dreams", "heist", "reality"],
    premise: "A specialist who steals secrets from dreams takes one last impossible job: plant an idea instead of stealing one.",
    requiredRoles: [lead("Dream Thief", "M", "middleAged"), co("Architect", "arch", "F", "young"), co("Ex-Wife in Limbo", "exwife", "F", "middleAged")],
    requirements: comfort(2, 0, 0, 1, 0),
  },
  {
    id: "m-romance-01", title: "Two Stars Crossing", genre: "Romance", era: "modern", rating: "PG-13", quality: 4,
    themes: ["bookstore", "indie", "London"],
    premise: "An ordinary London bookshop owner falls for the world's biggest movie star.",
    requiredRoles: [lead("Bookstore Owner", "M", "middleAged"), co("Movie Star", "star", "F", "young"), co("Goofy Roommate", "room", "M", "middleAged")],
    requirements: comfort(1, 1, 2, 1, 0),
  },
  {
    id: "m-horror-01", title: "Get Away", genre: "Horror", era: "modern", rating: "R", quality: 5,
    themes: ["race", "psychological", "satire"],
    premise: "A young Black photographer visits his white girlfriend's parents for the weekend — and uncovers something terrible.",
    requiredRoles: [lead("Photographer", "M", "young"), co("Girlfriend", "gf", "F", "young"), co("Father-in-Law", "fil", "M", "older")],
    requirements: comfort(3, 0, 1, 2, 0),
  },
  {
    id: "m-family-01", title: "Up & Over", genre: "Family", era: "modern", rating: "PG", quality: 5,
    themes: ["grief", "adventure", "balloons"],
    premise: "A grieving widower fulfills his late wife's dream by floating his house to South America via thousands of balloons.",
    requiredRoles: [lead("Old Widower", "M", "older"), co("Boy Scout Stowaway", "scout", "M", "young"), co("Talking Dog Sidekick", "dog", "any", "young")],
    requirements: comfort(1, 0, 0, 0, 0),
  },
  {
    id: "m-comedy-01", title: "The Wedding Wedding", genre: "Comedy", era: "modern", rating: "R", quality: 3,
    themes: ["weddings", "crashers", "redemption"],
    premise: "Two unrepentant divorce mediators routinely crash weddings — until one falls for the bride's sister.",
    requiredRoles: [lead("Cynical Mediator", "M", "middleAged"), co("Wingman Mediator", "wing", "M", "middleAged"), co("Bride's Sister", "sis", "F", "young")],
    requirements: comfort(1, 2, 3, 3, 1),
  },
  {
    id: "m-sports-01", title: "Money Pitch", genre: "Sports", era: "modern", rating: "PG-13", quality: 5,
    themes: ["statistics", "underdog", "baseball"],
    premise: "A small-market baseball GM uses statistical analysis to compete with billion-dollar teams.",
    requiredRoles: [lead("Penniless GM", "M", "middleAged"), co("Yale Math Nerd", "nerd", "M", "young"), co("Veteran Scout", "scout", "M", "older")],
    requirements: comfort(0, 0, 0, 2, 0),
  },
  {
    id: "m-drama-02", title: "Birdwoman", genre: "Drama", era: "modern", rating: "R", quality: 5,
    themes: ["theater", "ego", "comeback"],
    premise: "A washed-up superhero-movie actor mounts a Broadway play to reclaim his artistic credibility.",
    requiredRoles: [lead("Comeback Actor", "M", "older"), co("Method Co-Star", "co", "M", "middleAged"), co("Estranged Daughter", "daughter", "F", "young")],
    requirements: comfort(2, 1, 1, 3, 2),
  },
  {
    id: "m-musical-01", title: "Whirlwind", genre: "Musical", era: "modern", rating: "PG-13", quality: 5,
    themes: ["jazz", "ambition", "love"],
    premise: "A struggling jazz pianist and an aspiring actress in modern LA fall for each other while chasing their dreams.",
    requiredRoles: [lead("Jazz Pianist", "M", "young"), co("Actress", "act", "F", "young"), co("Best Friend", "friend", "F", "young")],
    requirements: comfort(0, 0, 1, 1, 0),
  },
  {
    id: "m-action-02", title: "Maxine: Fury Highway", genre: "Action", era: "modern", rating: "R", quality: 5,
    themes: ["wasteland", "rescue", "feminism"],
    premise: "An imperial wife flees a tyrant warlord across the post-apocalyptic desert with five reluctant brides in tow.",
    requiredRoles: [lead("Imperial Wife", "F", "middleAged"), co("Drifter", "drift", "M", "middleAged"), co("Warlord", "war", "M", "older")],
    requirements: comfort(3, 0, 1, 2, 0),
  },
];

export const ALL_SCRIPT_TEMPLATES: ScriptTemplate[] = [
  ...GOLDEN, ...NEW_HOLLYWOOD, ...BLOCKBUSTER, ...MODERN,
];

export function templatesForEra(era: Era): ScriptTemplate[] {
  return ALL_SCRIPT_TEMPLATES.filter(t => t.era === era);
}
