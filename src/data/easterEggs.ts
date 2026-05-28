// Easter egg catalog — 50+ hidden moments, jokes, and rare events
// scattered across Baseball / Football / Olympus. Some are functional
// (implemented inline in the relevant page/engine); others are
// flavor-only (documented here so Henry's dad knows what to look for).

export type EggGame = "baseball" | "football" | "olympus" | "arcade";
export type EggStatus = "implemented" | "flavor" | "rare";

export interface EasterEgg {
  id: string;
  game: EggGame;
  title: string;
  desc: string;
  status: EggStatus;
  /** Where in the app to look for it. */
  where?: string;
}

export const EASTER_EGGS: EasterEgg[] = [
  // ── Personal-for-Henry (1–10) ───────────────────────────────────────
  { id: "k01-henry-player",        game: "baseball", title: "The Henry Player",       desc: "Any player named 'Henry' gets the hidden Owner's Favorite trait + clutch boost.",          status: "implemented", where: "League players named Henry" },
  { id: "k02-lucky-number",        game: "baseball", title: "Lucky Number",            desc: "Welcome wizard asks for your favorite number; reserved on your team.",                   status: "implemented", where: "Welcome onboarding" },
  { id: "k03-birthday-mode",       game: "baseball", title: "Birthday Mode",           desc: "On the in-game day matching your birthday, your team gets +5 morale.",                  status: "implemented", where: "Sim a season day matching gmProfile.birthMMDD" },
  { id: "k04-hi-henry",            game: "baseball", title: "Hi Henry",                desc: "Rare chance (~0.8% per day) the news feed shouts your name during a game.",            status: "implemented", where: "Watch a sim day for booth-call flavor" },
  { id: "k05-henry-field",         game: "baseball", title: "Henry Field",             desc: "Name a stadium with 'Henry' in it for a premium template.",                              status: "flavor",      where: "Edit stadium names in CoachsCorner" },
  { id: "k06-family-names",        game: "baseball", title: "Family Name Pool",        desc: "Add up to 10 real family names — they appear randomly in generated players.",          status: "implemented", where: "Settings → Secrets → Family Name Pool" },
  { id: "k07-owner-card",          game: "baseball", title: "Owner Card",              desc: "Permanent stats card in your GM profile after first sim.",                                status: "flavor",      where: "Dashboard" },
  { id: "k08-phenom",              game: "baseball", title: "The Phenom",              desc: "~0.01% chance per draft of a generated rookie with all 99s.",                              status: "rare",        where: "Run many drafts" },
  { id: "k09-throwback-ghost",     game: "baseball", title: "Throwback Ghost",         desc: "Rare descendant of a HoFer shares their last name in a future draft.",                   status: "flavor",      where: "Multi-season careers" },
  { id: "k10-iron-man",            game: "baseball", title: "Iron Man",                desc: "A player playing every game in a season earns the badge + durability boost.",            status: "implemented", where: "Achievements" },

  // ── On-field rare moments (11–20) ───────────────────────────────────
  { id: "k11-walk-off-king",       game: "baseball", title: "Walk-Off King",           desc: "3+ walk-off HRs in one season earns a permanent trait + clutch boost.",                 status: "implemented", where: "Sim multiple seasons" },
  { id: "k12-underdog",            game: "baseball", title: "The Underdog",            desc: "Late-round draft pick becomes an All-Star → gold card frame.",                            status: "implemented", where: "Player profiles" },
  { id: "k13-phoenix",             game: "baseball", title: "The Phoenix",             desc: "Player returns from a season-ending injury and wins Comeback POY → flaming border.",   status: "flavor",      where: "Player profiles" },
  { id: "k14-hometown-hero",       game: "baseball", title: "Hometown Hero",           desc: "Player on the team in his actual birthplace gets +3 morale + badge.",                    status: "implemented", where: "Team rosters" },
  { id: "k15-cycle-club",          game: "baseball", title: "The Cycle Club",          desc: "Hitting for the cycle gets you engraved on the league museum wall.",                     status: "rare",        where: "Watch live games" },
  { id: "k16-perfect-27",          game: "baseball", title: "Perfect 27",              desc: "Pitcher with a perfect game gets a permanent ring icon on their card.",                  status: "rare",        where: "Watch live games" },
  { id: "k17-triple-crown",        game: "baseball", title: "Triple Crown Vault",      desc: "Triple Crown winners get a gold-trim locked vault on their card.",                      status: "rare",        where: "End-of-season awards" },
  { id: "k18-konami",              game: "arcade",   title: "Konami Code",             desc: "↑↑↓↓←→←→ B A on title screen unlocks Arcade Mode.",                                      status: "implemented", where: "Title screen, hit the Konami code" },
  { id: "k19-logo-tap-10",         game: "baseball", title: "Logo Tap × 10",           desc: "Tap any team logo 10 times for the throwback variant.",                                   status: "implemented", where: "Team page" },
  { id: "k20-trophy-press",        game: "baseball", title: "Long-Press Trophy",       desc: "5-second highlight reel from that championship season.",                                  status: "flavor",      where: "History page trophies" },

  // ── Hidden interactions (21–30) ─────────────────────────────────────
  { id: "k21-blimp-cam",           game: "baseball", title: "Blimp Cam",               desc: "Double-tap scoreboard in immersive view → overhead blimp camera angle.",                  status: "flavor",      where: "Immersive game watch" },
  { id: "k22-shake-shuffle",       game: "baseball", title: "Shake to Shuffle",        desc: "Shake the iPad on a roster screen to randomize the lineup.",                              status: "flavor",      where: "Team roster page" },
  { id: "k23-portrait-tap-7",     game: "baseball", title: "Portrait Tap × 7",        desc: "Tap a player portrait 7 times for hidden fun facts.",                                     status: "flavor",      where: "Player profile" },
  { id: "k24-three-finger",        game: "baseball", title: "Three-Finger Tap",        desc: "Reveals advanced stats overlay anywhere in the app.",                                     status: "flavor",      where: "Anywhere" },
  { id: "k25-pull-twice",          game: "baseball", title: "Pull Down Twice",         desc: "Standings → 'What if?' projection appears.",                                              status: "flavor",      where: "Standings page" },
  { id: "k26-1000-game",           game: "baseball", title: "The 1.000 Game",          desc: "~1 in 10,000 freak statistical game gets archived to a special museum entry.",          status: "rare",        where: "Sim many seasons" },
  { id: "k27-streaky-saturday",    game: "baseball", title: "Streaky Saturdays",       desc: "Every Saturday (in-game) has higher walk-off / drama chance.",                            status: "implemented", where: "Sim a Saturday game" },
  { id: "k28-chasing-300",         game: "baseball", title: "Chasing .300",            desc: "Hitter at .299 going into final game gets extra at-bats.",                                status: "flavor",      where: "End of season" },
  { id: "k29-retirement-hr",       game: "baseball", title: "Retirement HR",           desc: "HoF-caliber retiring legend's final AB has 30% chance of a HR.",                          status: "flavor",      where: "Last day of veteran's career" },
  { id: "k30-cinderella-run",     game: "baseball", title: "Cinderella Run",           desc: "Wild card → WS title earns a special banner + extended celebration.",                    status: "implemented", where: "Win it all from a low seed" },

  // ── Long-term achievements (31–40) ──────────────────────────────────
  { id: "k31-dynasty-decade",      game: "baseball", title: "Dynasty Decade",          desc: "3+ titles in 10 years unlocks the dynasty title variant.",                                status: "implemented", where: "Multi-decade play" },
  { id: "k32-comeback",            game: "baseball", title: "The Comeback",            desc: "Down 3-0 then winning a 7-game series → museum page.",                                   status: "implemented", where: "Playoffs" },
  { id: "k33-tied-legends",        game: "baseball", title: "Tied the Legends",        desc: "Match real MLB records (103 W, 60 HR, etc) — achievement.",                              status: "implemented", where: "Achievements" },
  { id: "k34-the-streak",          game: "baseball", title: "The Streak",              desc: "30+ game hit streak triggers daily hype headlines.",                                      status: "implemented", where: "Sim a hot streak" },
  { id: "k35-retro-mode",          game: "baseball", title: "Retro Mode",              desc: "Win 5 titles to unlock a sepia 1950s UI toggle.",                                          status: "flavor",      where: "Settings → Visual" },
  { id: "k36-future-mode",         game: "baseball", title: "Future Mode",             desc: "Win 10 titles to unlock the neon 2099 UI toggle.",                                        status: "flavor",      where: "Settings → Visual" },
  { id: "k37-mascot-race",         game: "baseball", title: "Mascot Race",             desc: "Tap to pick a mascot between innings for chemistry boost.",                              status: "flavor",      where: "Between innings on live games" },
  { id: "k38-manager-cam",         game: "baseball", title: "Manager Cam",             desc: "Long-press a manager's name to see their office.",                                        status: "flavor",      where: "Team page" },
  { id: "k39-stadium-tour",        game: "baseball", title: "Stadium Tour",            desc: "Hidden 360° tour of every ballpark.",                                                      status: "flavor",      where: "Team page → Stadium" },
  { id: "k40-organ-tune",          game: "baseball", title: "Hidden Soundtrack",       desc: "Tap year display 5 times for the organ-tune picker.",                                     status: "flavor",      where: "Top bar year text" },

  // ── Olympus eggs (41–55) ────────────────────────────────────────────
  { id: "k41-henry-birthmark",     game: "olympus",  title: "The Lightning Birthmark", desc: "A hero named exactly 'Henry' (any casing) carries a hidden lightning-bolt birthmark under the left collarbone. NPCs and gods notice it about 10% of the time.", status: "implemented", where: "Create a hero named Henry" },
  { id: "k42-berry-tag",           game: "olympus",  title: "Born of Berries",         desc: "A hero named 'Berry' (any casing) is hinted to be descended from a wine god's overlooked grandchild.", status: "implemented", where: "Create a hero named Berry" },
  { id: "k43-hermes-visit",        game: "olympus",  title: "Hermes Visits",           desc: "Once per real-week, Hermes appears in the news feed with a five-second cryptic message.", status: "flavor",      where: "Olympus news feed" },
  { id: "k44-wishing-well",        game: "olympus",  title: "The Wishing Well",        desc: "Each hero can find a wishing well once that grants one small permanent stat point.", status: "rare",        where: "Rare adventure scene" },
  { id: "k45-atlantis",            game: "olympus",  title: "Atlantis Discovery",      desc: "0.5% per sea voyage to discover Atlantis — triggers an epic side adventure.",            status: "rare",        where: "Sea voyages" },
  { id: "k46-time-capsule",        game: "olympus",  title: "Time Capsule",            desc: "Bury a note in Settings — surfaces 10 in-game seasons later.",                            status: "implemented", where: "Settings → Secrets" },
  { id: "k47-first-olive-tree",    game: "olympus",  title: "The First Olive Tree",    desc: "Find Athena's original olive tree, gain a permanent blessing.",                          status: "flavor",      where: "Athens adventures" },
  { id: "k48-talking-horse",       game: "olympus",  title: "Talking Horse",           desc: "Once per game, a horse reveals it can talk and gives one cryptic clue.",                 status: "rare",        where: "Travel encounters" },
  { id: "k49-beggar-king",         game: "olympus",  title: "The Beggar King",         desc: "A beggar in Athens is a deposed king — be kind and learn a state secret.",                status: "flavor",      where: "Athens adventures" },
  { id: "k50-echo-cave",           game: "olympus",  title: "Echo's Lonely Cave",      desc: "A cave where the nymph Echo still lingers, repeats your words back with sadness.",      status: "flavor",      where: "Mountain adventures" },
  { id: "k51-bald-eagle",          game: "olympus",  title: "The Sacred Eagle",        desc: "A bald eagle blesses the hero who waits in stillness for an hour.",                       status: "flavor",      where: "Wilderness adventures" },
  { id: "k52-three-fates",         game: "olympus",  title: "The Fates' Question",     desc: "Encounter the three Fates, ask one question, get a cryptic but true answer.",            status: "rare",        where: "Mythic adventures" },
  { id: "k53-cursed-sword",        game: "olympus",  title: "The Cursed Sword",        desc: "Powerful weapon that slowly drives owner mad. Tracked in profile.",                       status: "rare",        where: "Battle loot" },
  { id: "k54-bee-princess",        game: "olympus",  title: "The Bee Princess",        desc: "A swarm of bees follows a hero around — actually loyal protectors.",                     status: "flavor",      where: "Adventure flavor" },
  { id: "k55-time-lost-sailor",    game: "olympus",  title: "The Time-Lost Sailor",    desc: "Sailor in Corinth speaks of 'the future' — what he describes is genuinely from beyond your time.", status: "flavor", where: "Corinth port" },

  // ── Football + cross-game (56–62) ───────────────────────────────────
  { id: "k56-perfect-season",      game: "football", title: "Perfect Season",          desc: "Go 17-0 in the regular season for a permanent perfect-season banner.",                   status: "implemented", where: "Football multi-year play" },
  { id: "k57-no-pitch-clock",      game: "football", title: "The Bomb",                desc: "First pass of 50+ yards triggers a 'BOMB!' graphic on StatCast.",                        status: "implemented", where: "Football StatCast" },
  { id: "k58-meatball-sub",        game: "football", title: "Meatball Sub Re-Sign",    desc: "Rare drama event where a key veteran re-signs because of 'the best sub of his life'.", status: "implemented", where: "Football drama events" },
  { id: "k59-pizza-eject",         game: "football", title: "Pizza Ejection",          desc: "Player gets ejected after ordering pizza to the sideline mid-game.",                     status: "implemented", where: "Football drama events" },
  { id: "k60-three-game-switcher", game: "arcade",   title: "Three-Game Switcher",     desc: "Open all three games (Baseball / Football / Olympus) and Settings → About reveals a special note.", status: "flavor",      where: "Settings → About" },
  { id: "k61-version-tap-3",       game: "arcade",   title: "Dedication",              desc: "Tap version number 3 times on About → hidden 'Made with love for Henry' note.",        status: "implemented", where: "Settings → About" },
  { id: "k62-bedtime-mode",        game: "arcade",   title: "Bedtime Boss",            desc: "If played after 10 PM local time, the news ticker occasionally says 'perhaps it's time to rest, traveler'.", status: "implemented", where: "News ticker after 10 PM" },
];

export const EASTER_EGG_TOTAL = EASTER_EGGS.length;
