// Fallback content for every sub-app, used when no Anthropic API key
// is configured (or the call fails). Curated to be safe + funny + kid-
// friendly. The AI integration tops these up dynamically when on.

// ─── Mad Libs ────────────────────────────────────────────────

export interface MadLibTemplate {
  title: string;
  category: string;
  blanks: Array<{ id: number; type: string; prompt: string; hint?: string }>;
  template: string;  // uses [1], [2], etc.
}

export const MAD_LIB_TEMPLATES: MadLibTemplate[] = [
  {
    title: "The Cursed Pizza", category: "Food Adventures",
    blanks: [
      { id: 1, type: "adjective", prompt: "An ADJECTIVE", hint: "describing word" },
      { id: 2, type: "food", prompt: "A FOOD", hint: "anything to eat" },
      { id: 3, type: "verb-ed", prompt: "A VERB ending in -ED", hint: "like 'jumped'" },
      { id: 4, type: "body-part", prompt: "A BODY PART" },
      { id: 5, type: "number", prompt: "A NUMBER" },
      { id: 6, type: "animal", prompt: "AN ANIMAL (plural)" },
      { id: 7, type: "exclamation", prompt: "AN EXCLAMATION", hint: "like 'Yikes!'" },
      { id: 8, type: "verb-ing", prompt: "A VERB ending in -ING" },
    ],
    template: `One afternoon I ordered a [1] pizza with extra [2] on top. The delivery driver [3] it onto my [4]. When I opened the box, [5] tiny [6] flew out singing opera. "[7]" I yelled, [8] toward the door.`,
  },
  {
    title: "Greek God Field Trip", category: "Greek Mythology",
    blanks: [
      { id: 1, type: "god", prompt: "A GREEK GOD" }, { id: 2, type: "noun", prompt: "A NOUN" },
      { id: 3, type: "place", prompt: "A PLACE" }, { id: 4, type: "verb", prompt: "A VERB" },
      { id: 5, type: "adjective", prompt: "An ADJECTIVE" }, { id: 6, type: "weapon", prompt: "A WEAPON" },
      { id: 7, type: "color", prompt: "A COLOR" }, { id: 8, type: "monster", prompt: "A MONSTER" },
    ],
    template: `Our class field trip was to visit [1]. We took the bus to [3] and brought our lunches in a [2]. Zeus told us to [4] before we entered. The walls were [5] and decorated with shining [7] [6]s. Suddenly a [8] burst through the door! Luckily our teacher had snacks.`,
  },
  {
    title: "Henry's Big Save", category: "Baseball Game",
    blanks: [
      { id: 1, type: "number", prompt: "A NUMBER" }, { id: 2, type: "name", prompt: "A NAME" },
      { id: 3, type: "verb-ed", prompt: "VERB ending in -ED" }, { id: 4, type: "noun", prompt: "A NOUN" },
      { id: 5, type: "adjective", prompt: "An ADJECTIVE" }, { id: 6, type: "exclamation", prompt: "AN EXCLAMATION" },
      { id: 7, type: "verb-ing", prompt: "VERB ending in -ING" }, { id: 8, type: "body-part", prompt: "A BODY PART" },
    ],
    template: `Bottom of the [1]th inning, two outs, bases loaded. The batter [2] stepped up and [3] the pitch. The ball flew toward Henry like a [4]! Henry made a [5] dive. "[6]!" the crowd shouted. He came up with the ball still [7] in his [8]. Game over!`,
  },
  {
    title: "Spooky Sleepover", category: "Spooky Stories",
    blanks: [
      { id: 1, type: "adjective", prompt: "An ADJECTIVE" }, { id: 2, type: "noun", prompt: "A NOUN" },
      { id: 3, type: "animal", prompt: "AN ANIMAL" }, { id: 4, type: "verb-ed", prompt: "VERB ending in -ED" },
      { id: 5, type: "place", prompt: "A PLACE in your house" }, { id: 6, type: "exclamation", prompt: "AN EXCLAMATION" },
      { id: 7, type: "snack", prompt: "A SNACK" }, { id: 8, type: "color", prompt: "A COLOR" },
    ],
    template: `It was a [1] night. The wind rattled the [2] outside my window. Then I heard a [3] [4] in the [5]. "[6]" I whispered, gripping my [7]. The shadow moved closer — but it was just my dog, with [8] eyes glowing in the moonlight.`,
  },
  {
    title: "The Roller Coaster", category: "Roller Coaster Day",
    blanks: [
      { id: 1, type: "name", prompt: "A NAME" }, { id: 2, type: "adjective", prompt: "An ADJECTIVE" },
      { id: 3, type: "number", prompt: "A NUMBER" }, { id: 4, type: "verb-ed", prompt: "VERB -ED" },
      { id: 5, type: "noun-plural", prompt: "PLURAL NOUN" }, { id: 6, type: "exclamation", prompt: "EXCLAMATION" },
      { id: 7, type: "food", prompt: "A FOOD" }, { id: 8, type: "color", prompt: "A COLOR" },
    ],
    template: `[1] and I waited [3] minutes for the [2] roller coaster. As we [4] over the first hill, [5] flew out of my pockets! "[6]" I yelled, holding my [7] in the air. By the end, my face was [8] from screaming.`,
  },
  {
    title: "Superhero Origin", category: "Superhero Origin",
    blanks: [
      { id: 1, type: "name", prompt: "A NAME" }, { id: 2, type: "adjective", prompt: "An ADJECTIVE" },
      { id: 3, type: "object", prompt: "A NOUN" }, { id: 4, type: "verb-ed", prompt: "VERB -ED" },
      { id: 5, type: "superpower", prompt: "A SUPERPOWER" }, { id: 6, type: "villain", prompt: "A VILLAIN NAME" },
      { id: 7, type: "city", prompt: "A CITY" }, { id: 8, type: "exclamation", prompt: "EXCLAMATION" },
    ],
    template: `One day [1] was walking when a [2] [3] fell from the sky and [4] them. From that moment on, they had the power of [5]. They became the protector of [7], dedicated to stopping the evil [6]. Their catchphrase? "[8]"`,
  },
  {
    title: "Pirate Treasure", category: "Pirate Tales",
    blanks: [
      { id: 1, type: "adjective", prompt: "ADJECTIVE" }, { id: 2, type: "ship-name", prompt: "A SHIP'S NAME" },
      { id: 3, type: "number", prompt: "NUMBER" }, { id: 4, type: "animal", prompt: "ANIMAL" },
      { id: 5, type: "verb-ed", prompt: "VERB -ED" }, { id: 6, type: "treasure", prompt: "A TREASURE ITEM" },
      { id: 7, type: "exclamation", prompt: "PIRATE EXCLAMATION" }, { id: 8, type: "body-part", prompt: "BODY PART" },
    ],
    template: `Aboard the [1] ship "[2]", we sailed for [3] days. Our parrot, actually a [4], [5] every morning. The map led to an island where we found a chest full of [6]! "[7]" shouted the captain, kissing his [8] in joy.`,
  },
  {
    title: "Sci-Fi Disaster", category: "Sci-Fi Adventures",
    blanks: [
      { id: 1, type: "noun", prompt: "SPACESHIP NOUN" }, { id: 2, type: "planet", prompt: "A PLANET" },
      { id: 3, type: "alien-name", prompt: "AN ALIEN NAME" }, { id: 4, type: "verb-ed", prompt: "VERB -ED" },
      { id: 5, type: "adjective", prompt: "ADJECTIVE" }, { id: 6, type: "color", prompt: "COLOR" },
      { id: 7, type: "exclamation", prompt: "EXCLAMATION" }, { id: 8, type: "food", prompt: "FOOD" },
    ],
    template: `Our [1] crash-landed on [2]. A [5] [3] approached, [4] toward us. Their skin was [6] and they offered us a strange [8]. "[7]" we whispered, trying not to insult an alien with our reaction.`,
  },
  {
    title: "School Day Disaster", category: "School Day",
    blanks: [
      { id: 1, type: "subject", prompt: "A SCHOOL SUBJECT" }, { id: 2, type: "adjective", prompt: "ADJECTIVE" },
      { id: 3, type: "noun", prompt: "NOUN" }, { id: 4, type: "verb-ed", prompt: "VERB -ED" },
      { id: 5, type: "teacher-name", prompt: "A TEACHER NAME" }, { id: 6, type: "animal", prompt: "ANIMAL" },
      { id: 7, type: "number", prompt: "NUMBER" }, { id: 8, type: "exclamation", prompt: "EXCLAMATION" },
    ],
    template: `In [1] class today, Mr./Ms. [5] brought in a [2] [3]. Suddenly, [7] [6]s [4] out of it! "[8]" everyone yelled. Class was dismissed early. Best school day ever.`,
  },
  {
    title: "Dragon's Lair", category: "Fairy Tales",
    blanks: [
      { id: 1, type: "adjective", prompt: "ADJECTIVE" }, { id: 2, type: "noun", prompt: "NOUN" },
      { id: 3, type: "verb-ed", prompt: "VERB -ED" }, { id: 4, type: "color", prompt: "COLOR" },
      { id: 5, type: "weapon", prompt: "WEAPON" }, { id: 6, type: "exclamation", prompt: "EXCLAMATION" },
      { id: 7, type: "number", prompt: "NUMBER" }, { id: 8, type: "food", prompt: "FOOD" },
    ],
    template: `Once upon a time, a [1] knight rode toward the dragon's [2]. The dragon [3] smoke from its [4] nostrils. The knight raised their [5] and shouted, "[6]" The dragon, however, only wanted [7] pieces of [8]. They became best friends.`,
  },
];

// ─── Jokes ───────────────────────────────────────────────────

export interface JokeTemplate { setup: string; punchline: string; category: string }

export const JOKE_TEMPLATES: JokeTemplate[] = [
  // Knock-Knock
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nLettuce.\nLettuce who?", punchline: "Lettuce in! It's freezing out here!" },
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nBoo.\nBoo who?", punchline: "Don't cry, it's just a joke!" },
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nCows go.\nCows go who?", punchline: "No, cows go MOO!" },
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nNobel.\nNobel who?", punchline: "No bell, that's why I knocked!" },
  // Animal
  { category: "Animal", setup: "Why don't elephants use computers?", punchline: "They're afraid of the mouse." },
  { category: "Animal", setup: "What do you call a sleeping bull?", punchline: "A bulldozer." },
  { category: "Animal", setup: "How do you catch a squirrel?", punchline: "Climb a tree and act like a nut." },
  { category: "Animal", setup: "What do you call a fish with no eyes?", punchline: "A fsh." },
  // Food
  { category: "Food", setup: "Why did the tomato turn red?", punchline: "Because it saw the salad dressing!" },
  { category: "Food", setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese." },
  { category: "Food", setup: "Why did the cookie go to the doctor?", punchline: "Because it felt crummy." },
  // School
  { category: "School", setup: "Why was the math book sad?", punchline: "Because it had too many problems." },
  { category: "School", setup: "What's a teacher's favorite nation?", punchline: "Expla-nation." },
  { category: "School", setup: "Why don't skeletons ever go to school dances?", punchline: "They have no body to go with." },
  // Sports
  { category: "Sports", setup: "Why is Cinderella bad at baseball?", punchline: "She runs away from the ball." },
  { category: "Sports", setup: "What do you call a pig that does karate?", punchline: "A pork chop." },
  // Spooky
  { category: "Spooky", setup: "What's a vampire's favorite fruit?", punchline: "A neck-tarine." },
  { category: "Spooky", setup: "Why did the ghost go to the party?", punchline: "For the boos." },
  // Tech / Robot
  { category: "Robot/Tech", setup: "Why was the computer cold?", punchline: "It left its Windows open." },
  { category: "Robot/Tech", setup: "What's a robot's favorite snack?", punchline: "Computer chips." },
  // Dinosaur
  { category: "Dinosaur", setup: "What do you call a dinosaur that crashes its car?", punchline: "Tyrannosaurus wrecks." },
  { category: "Dinosaur", setup: "What do you call a dinosaur with a great vocabulary?", punchline: "A thesaurus." },
  // Pirate
  { category: "Pirate", setup: "Why couldn't the pirate play cards?", punchline: "He was sitting on the deck." },
  // Wizard
  { category: "Wizard/Magic", setup: "How does a wizard organize their books?", punchline: "By Hogwarts genre." },
  // Video Game
  { category: "Video Game", setup: "Why did the gamer break up with their controller?", punchline: "It wasn't responsive enough." },
  // Space
  { category: "Space", setup: "How does the moon cut its hair?", punchline: "Eclipse it." },
  { category: "Space", setup: "What do astronauts use to keep their pants up?", punchline: "Asteroid belts." },
  // Dad
  { category: "Dad Jokes", setup: "I'm reading a book about anti-gravity.", punchline: "It's impossible to put down." },
  { category: "Dad Jokes", setup: "Did you hear about the kidnapping at school?", punchline: "It's fine, they woke up." },
  // Puns
  { category: "Silly Puns", setup: "I used to be a banker, but I lost interest.", punchline: "Now I'm in a much better bank-er-uptcy." },
  // Science
  { category: "Science", setup: "Why can't you trust atoms?", punchline: "They make up everything." },
  { category: "Science", setup: "What did the scientist say when they found two isotopes of helium?", punchline: "HeHe." },
  // Music
  { category: "Music", setup: "Why did the music teacher need a ladder?", punchline: "To reach the high notes." },
];

// ─── Quiz Show ───────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  explanation: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Space
  { category: "Space", difficulty: "easy", question: "Which planet is closest to the sun?", options: ["Mercury", "Venus", "Earth", "Mars"], correctIdx: 0, explanation: "Mercury is closest, with temperatures reaching 800°F on its sunlit side." },
  { category: "Space", difficulty: "easy", question: "How many moons does Earth have?", options: ["Zero", "One", "Two", "Three"], correctIdx: 1, explanation: "Just the Moon — though scientists sometimes find tiny temporary mini-moons." },
  { category: "Space", difficulty: "medium", question: "Who was the first American to orbit Earth?", options: ["Neil Armstrong", "John Glenn", "Alan Shepard", "Buzz Aldrin"], correctIdx: 1, explanation: "John Glenn orbited Earth three times on Feb 20, 1962. He returned to space at age 77." },
  { category: "Space", difficulty: "hard", question: "What is the largest moon in our solar system?", options: ["Titan", "Europa", "Ganymede", "Io"], correctIdx: 2, explanation: "Ganymede orbits Jupiter and is bigger than the planet Mercury." },
  // Dinosaurs
  { category: "Dinosaurs", difficulty: "easy", question: "Which dinosaur is famous for its three horns?", options: ["T. Rex", "Stegosaurus", "Triceratops", "Velociraptor"], correctIdx: 2, explanation: "Triceratops had two large horns over its eyes and one on its nose — for defense and display." },
  { category: "Dinosaurs", difficulty: "medium", question: "What does 'Tyrannosaurus rex' mean?", options: ["King thunder lizard", "Tyrant lizard king", "Giant teeth king", "Royal hunter"], correctIdx: 1, explanation: "From Greek + Latin — 'tyrant lizard king'. Coined in 1905." },
  { category: "Dinosaurs", difficulty: "hard", question: "How many years ago did dinosaurs go extinct?", options: ["12 million", "66 million", "120 million", "240 million"], correctIdx: 1, explanation: "An asteroid strike 66 million years ago ended the dinosaur era — except birds, who are their living descendants." },
  // History
  { category: "History", difficulty: "easy", question: "Who was the first President of the United States?", options: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "Benjamin Franklin"], correctIdx: 2, explanation: "George Washington was inaugurated April 30, 1789. He refused to be called 'king' and stepped down after two terms." },
  { category: "History", difficulty: "medium", question: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctIdx: 2, explanation: "Japan surrendered on September 2, 1945, formally ending the war." },
  { category: "History", difficulty: "hard", question: "Which ancient wonder was located in Egypt?", options: ["The Hanging Gardens", "The Great Pyramid", "The Colossus", "The Lighthouse of Alexandria"], correctIdx: 1, explanation: "Both the Great Pyramid and the Lighthouse of Alexandria were in Egypt — the Pyramid is the oldest, and the only one still standing." },
  // Science
  { category: "Science", difficulty: "easy", question: "What gas do plants breathe in?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"], correctIdx: 2, explanation: "Plants take in CO2 and release oxygen during photosynthesis — that's why forests matter." },
  { category: "Science", difficulty: "easy", question: "What is H2O?", options: ["Hydrogen", "Oxygen", "Water", "Helium"], correctIdx: 2, explanation: "Two hydrogen atoms + one oxygen atom = water." },
  { category: "Science", difficulty: "medium", question: "What is the largest organ in the human body?", options: ["Brain", "Liver", "Lungs", "Skin"], correctIdx: 3, explanation: "Skin covers about 20 square feet and weighs ~8 pounds in an average adult." },
  { category: "Science", difficulty: "hard", question: "What is the speed of light in a vacuum?", options: ["186,000 miles/sec", "100,000 miles/sec", "1 million miles/sec", "70,000 miles/sec"], correctIdx: 0, explanation: "Exactly 299,792,458 meters per second — about 186,282 miles per second." },
  // Geography
  { category: "Geography", difficulty: "easy", question: "Which continent is Egypt on?", options: ["Asia", "Africa", "Europe", "South America"], correctIdx: 1, explanation: "Egypt is in northeastern Africa, with a small piece (Sinai Peninsula) technically in Asia." },
  { category: "Geography", difficulty: "easy", question: "What's the longest river in the world?", options: ["Amazon", "Nile", "Mississippi", "Yangtze"], correctIdx: 1, explanation: "The Nile, at about 4,132 miles. The Amazon is close behind." },
  { category: "Geography", difficulty: "medium", question: "How many US states are there?", options: ["48", "49", "50", "51"], correctIdx: 2, explanation: "50 states — Alaska (1959) and Hawaii (1959) were the most recent additions." },
  // Animals
  { category: "Animals", difficulty: "easy", question: "Which animal is known as the King of the Jungle?", options: ["Tiger", "Lion", "Elephant", "Gorilla"], correctIdx: 1, explanation: "Lions are actually grassland animals, but they earned the title for their majesty." },
  { category: "Animals", difficulty: "easy", question: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correctIdx: 1, explanation: "All spiders have 8 legs. Insects have 6 — that's how you tell them apart." },
  { category: "Animals", difficulty: "medium", question: "Which is the fastest land animal?", options: ["Lion", "Cheetah", "Antelope", "Greyhound"], correctIdx: 1, explanation: "Cheetahs can run up to 75 mph in short bursts." },
  // Mythology
  { category: "Mythology", difficulty: "easy", question: "Who is the king of the Greek gods?", options: ["Zeus", "Poseidon", "Hades", "Apollo"], correctIdx: 0, explanation: "Zeus rules Mount Olympus and the sky. His weapon is the lightning bolt." },
  { category: "Mythology", difficulty: "medium", question: "What is the name of the horse with wings in Greek mythology?", options: ["Centaur", "Pegasus", "Unicorn", "Hippogriff"], correctIdx: 1, explanation: "Pegasus was born from the blood of Medusa." },
  // Sports
  { category: "Sports", difficulty: "easy", question: "How many players are on a baseball team's field at once?", options: ["7", "8", "9", "10"], correctIdx: 2, explanation: "9 defensive players: pitcher, catcher, 4 infielders, 3 outfielders." },
  { category: "Sports", difficulty: "easy", question: "How many points is a touchdown worth?", options: ["3", "6", "7", "10"], correctIdx: 1, explanation: "6 points, plus 1 for the extra-point kick or 2 for a two-point conversion." },
  // Music
  { category: "Music", difficulty: "easy", question: "How many strings on a standard guitar?", options: ["4", "5", "6", "8"], correctIdx: 2, explanation: "6 strings, tuned E-A-D-G-B-E from low to high." },
];

// ─── Story Starters ──────────────────────────────────────────

export interface StoryStarter { title: string; opening: string; category: string }

export const STORY_STARTERS: StoryStarter[] = [
  { category: "Mystery", title: "The Empty Mailbox", opening: "The mailbox had been empty for three days in a row. Henry pulled the rusty door open one more time, just to be sure. This time, there was something inside — a small envelope, no stamp, no return address. The handwriting on the front looked exactly like his grandfather's. Which would be impossible, since his grandfather had been dead for ten years." },
  { category: "Spooky", title: "Below the Floorboards", opening: "The scratching started at midnight. At first, Mia thought it was a mouse. By Wednesday she was sure it wasn't. The sound came from beneath the floorboards in the hall — a slow, deliberate scrape, like something patient was trying to remember how to be polite. Tonight she'd brought a flashlight, a hammer, and her best friend. None of them were brave enough to lift the boards yet." },
  { category: "Superhero", title: "Wrong Number, Right Power", opening: "The text came at 7:42 AM: 'Your shipment of POWERS has arrived. Pickup window: 7:43-7:45.' Henry rolled his eyes and was about to delete it when his bedroom suddenly filled with a swirling blue light. By 7:45 he could fly. By 7:46 the doorbell rang. By 7:47 he was very, very late for school." },
  { category: "Fantasy Quest", title: "The Quill of Endings", opening: "Every story ends. That was the rule. But when Lyra opened the dusty book her grandmother had hidden in the attic, she found the last page was completely blank. There was no THE END. Just a single line at the top: 'You finish this one.' And as she watched, words began to form beneath her hovering finger." },
  { category: "Space", title: "The Day the Stars Blinked", opening: "Every star in the sky blinked off for exactly four seconds last Tuesday. Then they came back on. The news called it a glitch. Henry's grandmother, who had been an astronomer her whole life, called it a message. She just couldn't agree with anyone — including the rest of NASA — about what it said." },
  { category: "Time Travel", title: "Today, Yesterday", opening: "When Mia woke up Saturday morning, her phone said it was Friday. So did the calendar. So did the kitchen radio. Her mother packed her a school lunch even though it was the weekend. Mia went to school. She passed the math test she'd failed yesterday. By third period she realized: she was going to fail it again tomorrow unless she did something different this time." },
  { category: "Dinosaur Discovery", title: "What Came Out of the Lake", opening: "The reservoir was almost empty after the drought, exposing rocks no one had seen in fifty years. Henry's dad spotted the first bone on a Saturday hike. By Sunday they'd uncovered an entire skull — five feet long, two rows of teeth, and a kind of dinosaur no scientist in the world had ever named." },
  { category: "Mystery", title: "The Locker That Wouldn't Open", opening: "Locker 247 had been locked for three months. The combination didn't work. The school custodian said it had been jammed since the previous principal disappeared. But this morning, when Henry walked past, the lock clicked open all on its own. He stopped. He looked both ways. He opened the door." },
  { category: "Magical Art", title: "The Paintbrush That Painted Back", opening: "The art teacher said the antique paintbrush had once belonged to a famous painter. She said it was just for show. But the first time Henry borrowed it, his watercolor lion blinked at him from the page. The second time, it yawned. The third time, it stepped out of the painting and onto his desk." },
  { category: "High Seas", title: "The Compass That Pointed Wrong", opening: "The compass had pointed north for two hundred years, according to the museum plaque. The day Henry leaned in to read the plaque, the needle spun once and stopped pointing somewhere new. Northeast. Slightly down. As if north had shifted — and only this one compass had noticed." },
];

// ─── Fortune Cookie ──────────────────────────────────────────

export const FORTUNES: Array<{ fortune: string; category: string }> = [
  { category: "General", fortune: "A great adventure awaits you next Tuesday. Be prepared with snacks." },
  { category: "General", fortune: "The thing you're nervous about will turn out to be the thing you remember most." },
  { category: "General", fortune: "Someone you haven't seen in a long time will appear in your week." },
  { category: "Action", fortune: "Tomorrow, do one thing you've been putting off. Then keep going." },
  { category: "Action", fortune: "The next door you open will not be the one you expected." },
  { category: "Confidence", fortune: "You are stronger than the loudest voice in the room — even your own." },
  { category: "Confidence", fortune: "Trust your first instinct. It's been training your whole life." },
  { category: "Cryptic", fortune: "The wind remembers what the clouds forgot. So do you." },
  { category: "Cryptic", fortune: "Three is the lucky number this month. The other lucky number is also three." },
  { category: "Silly", fortune: "A pigeon will look at you with judgment. You deserve it. Stop feeding the dog from the table." },
  { category: "Silly", fortune: "Your refrigerator has secrets. Investigate the back of the bottom shelf." },
  { category: "Inspirational", fortune: "Small steps every day become miles by spring." },
  { category: "Inspirational", fortune: "Kindness costs nothing and pays a thousand times over. Spend freely." },
  { category: "Gamer", fortune: "You are about to find a critical hit IRL. Be ready." },
  { category: "Gamer", fortune: "Save your progress. Both in games and in life." },
  { category: "Sports", fortune: "Your next great catch is closer than you think. Keep your glove ready." },
  { category: "Sports", fortune: "The team that practices when no one is watching wins when everyone is." },
];

// ─── Magic 8-Ball canonical responses ────────────────────────

export const MAGIC_8_RESPONSES = [
  "It is certain.", "Without a doubt.", "Yes — definitely.", "You may rely on it.", "As I see it, yes.",
  "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
  "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
  "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful.",
];

// ─── Would You Rather ────────────────────────────────────────

export interface WYRPair { a: string; b: string; category: string }

export const WYR_PAIRS: WYRPair[] = [
  { category: "Funny", a: "Have hands that taste like marshmallows", b: "Have feet that smell like baked cookies" },
  { category: "Funny", a: "Sneeze glitter every time you laugh", b: "Have hair that changes color with your mood" },
  { category: "Funny", a: "Talk only in song lyrics for a day", b: "Only walk backwards for a week" },
  { category: "Superhero", a: "Be invisible but only when no one is looking", b: "Fly, but only at running speed" },
  { category: "Superhero", a: "Read minds but only of dogs", b: "Talk to plants but they're always sarcastic" },
  { category: "Hard Choices", a: "Win every game you ever play", b: "Be friends with every person you meet" },
  { category: "Hard Choices", a: "Know the future of one thing", b: "Change one moment in your past" },
  { category: "Food", a: "Eat only pizza for a year", b: "Eat anything you want but it always tastes like ketchup" },
  { category: "Food", a: "Have a personal chef who only makes breakfast", b: "Have a personal ice-cream truck driver" },
  { category: "Video Game", a: "Live inside Minecraft for a week", b: "Live inside a Mario level for a week" },
  { category: "Sports", a: "Hit a walk-off home run in the World Series", b: "Score the winning touchdown in the Super Bowl" },
  { category: "Sports", a: "Be the best player on a losing team", b: "Be a bench player on a championship team" },
  { category: "Travel", a: "Travel to any country for a day", b: "Travel to any country in history for an hour" },
  { category: "Travel", a: "Live one year in space", b: "Live one year underwater" },
  { category: "Mythology", a: "Have Hercules's strength", b: "Have Athena's wisdom" },
  { category: "Mythology", a: "Be best friends with Pegasus", b: "Be best friends with the Minotaur (the nice one)" },
  { category: "Magical", a: "Be able to teleport but only to bathrooms", b: "Be able to read minds but everyone's thoughts are about lunch" },
  { category: "Space", a: "Be the first kid on Mars", b: "Be the first kid to ride a comet" },
];

// ─── What Am I? Riddles ──────────────────────────────────────

export interface Riddle { answer: string; clues: string[]; category: string; difficulty: "easy" | "medium" | "hard"; fact?: string }

export const RIDDLES: Riddle[] = [
  { category: "Animals", difficulty: "easy", answer: "dolphin", clues: ["I live in groups called pods in the ocean.", "I'm very smart and playful.", "I'm a mammal that looks like a fish."], fact: "Dolphins call each other by name using unique whistles." },
  { category: "Animals", difficulty: "medium", answer: "octopus", clues: ["I have no bones.", "I can change my color and texture in a second.", "I have three hearts.", "I have eight arms.", "I'm a mollusk that's smarter than most mammals."], fact: "Octopuses can solve puzzles and recognize individual humans." },
  { category: "Animals", difficulty: "hard", answer: "platypus", clues: ["I'm a mammal but I lay eggs.", "I have a flat tail like a beaver.", "I have webbed feet like a duck.", "My beak is like a duck's bill.", "I produce venom from spurs on my back feet.", "I live in Australia.", "I'm one of only five egg-laying mammals on Earth."], fact: "When scientists first saw a platypus, they thought it was a hoax." },
  { category: "Space", difficulty: "easy", answer: "sun", clues: ["I'm a giant ball of hot gas.", "I'm at the center of our solar system.", "Without me, plants couldn't grow."], fact: "The Sun is 109 times wider than Earth." },
  { category: "Space", difficulty: "medium", answer: "saturn", clues: ["I'm a planet.", "I'm famous for my rings.", "I'm the second biggest in the solar system.", "I have over 80 moons.", "I'm named after a Roman god of agriculture."], fact: "Saturn would float in water — it's less dense than water." },
  { category: "Foods", difficulty: "easy", answer: "pizza", clues: ["I started in Italy.", "I'm round but cut into triangles.", "I'm popular for parties and sleepovers."] },
  { category: "Foods", difficulty: "medium", answer: "avocado", clues: ["I'm a fruit, not a vegetable.", "I'm green inside and outside.", "I have one big seed.", "I'm popular on toast.", "I'm technically a berry."] },
  { category: "Mythological Creatures", difficulty: "easy", answer: "unicorn", clues: ["I'm a magical creature.", "I look like a horse.", "I have one spiral horn on my head."], fact: "The unicorn is Scotland's national animal." },
  { category: "Mythological Creatures", difficulty: "medium", answer: "phoenix", clues: ["I'm a bird from mythology.", "I burst into flames.", "I rise from my own ashes.", "I'm a symbol of rebirth.", "Greeks and Egyptians both believed in me."] },
  { category: "Objects", difficulty: "easy", answer: "umbrella", clues: ["I open and close.", "You hold me by my handle.", "I keep you dry."] },
  { category: "Objects", difficulty: "medium", answer: "compass", clues: ["I have a needle but I don't sew.", "I always point one direction.", "Hikers and pirates rely on me.", "I work because of Earth's magnetic field.", "I'm older than a thousand years."] },
  { category: "Ocean Life", difficulty: "medium", answer: "starfish", clues: ["I live in the ocean.", "I have five arms.", "If I lose an arm, I grow it back.", "I'm not actually a fish.", "I eat by pushing my stomach OUT of my body."] },
  { category: "Sports", difficulty: "easy", answer: "basketball", clues: ["I'm played with one round ball.", "Players try to score by throwing the ball through a hoop.", "Games are 4 quarters long."] },
];

// ─── Improv Scenes ───────────────────────────────────────────

export interface ImprovScene { setting: string; userChar: string; aiChar: string; aiOpener: string; category: string }

export const IMPROV_SCENES: ImprovScene[] = [
  { category: "Outer Space", setting: "An astronaut just landed on a McDonald's drive-thru on Mars.", userChar: "the astronaut", aiChar: "the cashier", aiOpener: "Sir, this is the future. We don't accept Earth credit anymore. Do you have any moon rocks?" },
  { category: "School Day Gone Weird", setting: "A normal Tuesday math class — except today the textbook is talking back.", userChar: "a confused student", aiChar: "the talking textbook", aiOpener: "Excuse me, but your formula is wrong AGAIN. Please erase pages 47 through 52 and apologize." },
  { category: "Restaurant Disaster", setting: "A fancy dinner where the chef has ONLY made one giant pancake.", userChar: "the customer", aiChar: "the chef", aiOpener: "Madam, I have spent FORTY YEARS perfecting this pancake. Either eat it or leave my restaurant forever." },
  { category: "Theme Park Chaos", setting: "Inside a roller coaster that has come to a stop — at the very top.", userChar: "a brave kid", aiChar: "a worried parent", aiOpener: "Okay, do NOT look down. Just talk to me. Tell me about your day at school. Anything. PLEASE." },
  { category: "Royal Court", setting: "The throne room. The king has just lost his crown — literally lost it. Nobody knows where.", userChar: "a clever royal advisor", aiChar: "the embarrassed king", aiOpener: "I had it this morning at breakfast. I'm POSITIVE. Possibly. Don't tell the queen." },
  { category: "Time Travel Mishap", setting: "You've accidentally landed in a 1950s diner, dressed in modern clothes with a smartphone.", userChar: "a time-traveler", aiChar: "the waitress, who has never seen a phone", aiOpener: "Honey, you alright? That's a mighty strange-looking radio you got there. Want some pie?" },
  { category: "Mythology Encounter", setting: "You meet a centaur at a coffee shop. He's trying to order a complicated drink.", userChar: "the next customer in line", aiChar: "the impatient centaur", aiOpener: "Half oat milk, half almond milk, half soy, three pumps vanilla, light foam, extra hot. Is that complicated? I don't think so." },
  { category: "Video Game World", setting: "You've fallen into a video game. The boss is right in front of you. It looks tired.", userChar: "a confused new player", aiChar: "the final boss", aiOpener: "Listen kid. I've been doing this for fifteen years. Can we just SKIP the cutscene this time?" },
  { category: "Big Game Pressure", setting: "Bottom of the ninth, two outs, your team is down by one. You're up to bat.", userChar: "the batter", aiChar: "the catcher trying to psych you out", aiOpener: "You know, I had a kid look just like you once. He struck out on three pitches. You're not nervous, are you?" },
  { category: "Robot Misunderstanding", setting: "A friendly robot has decided it's your new pet. It does not understand the concept of 'pet'.", userChar: "you", aiChar: "the robot, very enthusiastic", aiOpener: "HELLO HUMAN OWNER. I HAVE PREPARED BREAKFAST. IT IS A BATTERY. EAT THE BATTERY." },
  { category: "Action Hero Moment", setting: "You're hanging from a helicopter ladder over a city. Your trainer is on the radio.", userChar: "the action hero", aiChar: "the trainer", aiOpener: "Don't think about how high up you are. Or how thin that ladder is. Or that I'm out of granola bars down here. Just focus." },
  { category: "Animal Conversation", setting: "You can suddenly understand your dog. They have OPINIONS.", userChar: "you", aiChar: "your dog", aiOpener: "First of all? The kibble. We need to talk about the kibble. Have you ever eaten it? HAVE YOU?" },
];

// ─── Conversation Starters ───────────────────────────────────

export const CONVO_STARTERS: Array<{ question: string; category: string }> = [
  { category: "Family Dinner", question: "If you could have dinner with any famous person from history, who would it be — and what would you ask them?" },
  { category: "Family Dinner", question: "What's something you learned this week that surprised you?" },
  { category: "Family Dinner", question: "If our family could take any vacation tomorrow, all expenses paid, where are we going?" },
  { category: "Deep Questions", question: "What do you think is the most important thing humans have invented?" },
  { category: "Deep Questions", question: "If you had to teach someone one skill so they could survive in the world, what would it be?" },
  { category: "Hopes & Dreams", question: "What's something you want to be really, really good at someday?" },
  { category: "Hopes & Dreams", question: "If you had to choose between being famous, rich, or remembered as kind — which?" },
  { category: "Funny Hypotheticals", question: "If pets could vote, what would they vote for first?" },
  { category: "Funny Hypotheticals", question: "What is the most embarrassing superpower someone could have?" },
  { category: "If You Could…", question: "If you could swap lives with anyone in this room for a day, who and why?" },
  { category: "If You Could…", question: "If you could rename one day of the week and what we do that day, what's the change?" },
  { category: "Storytelling Prompts", question: "Tell us about a time you were really brave — even if no one saw." },
  { category: "Storytelling Prompts", question: "What's the best story your grandparents ever told you?" },
  { category: "Get to Know", question: "What's a small thing that always makes your day better?" },
  { category: "Get to Know", question: "What's something you used to be afraid of but aren't anymore?" },
  { category: "Hero Questions", question: "Who is someone you admire who isn't famous? What did they do?" },
  { category: "Food Choices", question: "What's a food combination you love that grosses other people out?" },
  { category: "Animal Hypotheticals", question: "If you could speak to one animal species fluently, which one?" },
  { category: "Future Predictions", question: "What do you think will be totally normal in 20 years that we'd find weird now?" },
  { category: "What Would You Do?", question: "If you found a wallet on the sidewalk with $100 in it and no ID, what would you do?" },
  { category: "Game Theory", question: "If everyone in the world had to play one board game tonight, which should it be?" },
  { category: "World Building", question: "If you could add one rule to the world that everyone had to follow, what would it be?" },
];

// ─── Personality Quizzes ─────────────────────────────────────

export interface PersonalityQuiz {
  title: string;
  results: Array<{ key: "A" | "B" | "C" | "D"; name: string; description: string }>;
  questions: Array<{ id: number; question: string; options: Array<{ text: string; maps_to: "A" | "B" | "C" | "D" }> }>;
}

export const PERSONALITY_QUIZZES: Record<string, PersonalityQuiz> = {
  "Which Greek God Are You?": {
    title: "Which Greek God Are You?",
    results: [
      { key: "A", name: "Athena", description: "Wise, strategic, a natural problem-solver. People come to you for advice. You value knowledge above almost everything." },
      { key: "B", name: "Apollo", description: "Creative, charming, with a deep love of art, music, and the spotlight. You bring light wherever you go." },
      { key: "C", name: "Hermes", description: "Quick-witted, curious, a born communicator. You move fast, learn faster, and always have a clever plan." },
      { key: "D", name: "Ares", description: "Bold, fierce, fearless. You face challenges head-on and refuse to back down. Born to lead from the front." },
    ],
    questions: [
      { id: 1, question: "Your friends are stuck on a problem. What do you do?", options: [
        { text: "Think it through carefully, then present a clean solution", maps_to: "A" },
        { text: "Make a joke that lightens the mood, then brainstorm", maps_to: "B" },
        { text: "Try three different ideas fast and see what sticks", maps_to: "C" },
        { text: "Tell everyone what to do and lead the charge", maps_to: "D" },
      ]},
      { id: 2, question: "You'd rather spend a Saturday…", options: [
        { text: "Reading a really good book", maps_to: "A" },
        { text: "Painting, playing music, or making something", maps_to: "B" },
        { text: "On an adventure with no plan", maps_to: "C" },
        { text: "Competing in something — sports, games, anything", maps_to: "D" },
      ]},
      { id: 3, question: "It's a long road trip. What's your role?", options: [
        { text: "The thinker — read maps, find shortcuts", maps_to: "A" },
        { text: "The peacekeeper — keep everyone happy", maps_to: "B" },
        { text: "The wild one — making spontaneous detours", maps_to: "C" },
        { text: "The leader — I plan the whole thing", maps_to: "D" },
      ]},
      { id: 4, question: "Your superpower of choice?", options: [
        { text: "Photographic memory", maps_to: "A" },
        { text: "Inspire emotion in anyone", maps_to: "B" },
        { text: "Super speed", maps_to: "C" },
        { text: "Super strength", maps_to: "D" },
      ]},
      { id: 5, question: "Pick a weapon (don't worry, it's hypothetical):", options: [
        { text: "A book of ancient wisdom", maps_to: "A" },
        { text: "A golden lyre", maps_to: "B" },
        { text: "Winged sandals", maps_to: "C" },
        { text: "A spear and shield", maps_to: "D" },
      ]},
    ],
  },
  "Which Dinosaur Are You?": {
    title: "Which Dinosaur Are You?",
    results: [
      { key: "A", name: "T. rex", description: "Powerful, confident, the center of attention. You don't sneak — you arrive." },
      { key: "B", name: "Velociraptor", description: "Clever, fast, team-oriented. You plan three moves ahead." },
      { key: "C", name: "Triceratops", description: "Loyal, steady, fiercely defensive of your people. You aren't aggressive, but don't push you." },
      { key: "D", name: "Pterodactyl", description: "Free-spirited, observant, always looking at the bigger picture. You see things others miss." },
    ],
    questions: [
      { id: 1, question: "How do you enter a room?", options: [
        { text: "Loud and proud — everyone notices", maps_to: "A" },
        { text: "Quietly, then you find the best people fast", maps_to: "B" },
        { text: "With my close friends, walking together", maps_to: "C" },
        { text: "I scout first — check the vibe", maps_to: "D" },
      ]},
      { id: 2, question: "Your idea of a great day…", options: [
        { text: "Win something. Anything.", maps_to: "A" },
        { text: "Solve a tricky puzzle with friends", maps_to: "B" },
        { text: "Hang with your inner circle", maps_to: "C" },
        { text: "Explore somewhere new", maps_to: "D" },
      ]},
      { id: 3, question: "Conflict with a friend — your move?", options: [
        { text: "Hash it out face to face", maps_to: "A" },
        { text: "Talk to someone else first, then strategize", maps_to: "B" },
        { text: "Defend them no matter what", maps_to: "C" },
        { text: "Give it space and think it through", maps_to: "D" },
      ]},
      { id: 4, question: "Pick a snack:", options: [
        { text: "Steak", maps_to: "A" }, { text: "Crunchy chips", maps_to: "B" },
        { text: "Big plate of veggies and dip", maps_to: "C" }, { text: "Fruit you picked yourself", maps_to: "D" },
      ]},
      { id: 5, question: "Your motto:", options: [
        { text: "Go big or go home", maps_to: "A" }, { text: "Smarter, not harder", maps_to: "B" },
        { text: "Take care of your own", maps_to: "C" }, { text: "See what others miss", maps_to: "D" },
      ]},
    ],
  },
  "Which Superhero Are You?": {
    title: "Which Superhero Are You?",
    results: [
      { key: "A", name: "Spider-Type Hero", description: "Quick-witted, scrappy, full of jokes even when things are dire. You'd save your neighbor before anyone else." },
      { key: "B", name: "Tech Genius Hero", description: "Brilliant, slightly arrogant, you'd rather build the solution than fight your way to it. The plan is always your plan." },
      { key: "C", name: "Powerhouse Hero", description: "Steady, kind, immensely strong. You don't seek the spotlight — you just hold up the sky." },
      { key: "D", name: "Speedster Hero", description: "Energetic, optimistic, here-then-gone. You finish the mission before the credits roll." },
    ],
    questions: [
      { id: 1, question: "Trouble! What do you reach for first?", options: [
        { text: "A clever quip and a swing line", maps_to: "A" },
        { text: "My toolbox and laptop", maps_to: "B" },
        { text: "Nothing — my body IS the tool", maps_to: "C" },
        { text: "My running shoes", maps_to: "D" },
      ]},
      { id: 2, question: "When the team is splitting up — you take…", options: [
        { text: "The street-level rescue", maps_to: "A" },
        { text: "Mission control", maps_to: "B" },
        { text: "The frontline", maps_to: "C" },
        { text: "Recon — gone before anyone notices", maps_to: "D" },
      ]},
      { id: 3, question: "After the battle, you're…", options: [
        { text: "Cracking jokes with the EMTs", maps_to: "A" },
        { text: "Debriefing and rebuilding the suit", maps_to: "B" },
        { text: "Hugging civilians, thanking the team", maps_to: "C" },
        { text: "Already onto the next thing", maps_to: "D" },
      ]},
      { id: 4, question: "Favorite kind of mission?", options: [
        { text: "Saving the everyday people", maps_to: "A" },
        { text: "Solving the impossible puzzle", maps_to: "B" },
        { text: "Holding the line so others can flee", maps_to: "C" },
        { text: "Racing the clock", maps_to: "D" },
      ]},
      { id: 5, question: "Catchphrase vibe:", options: [
        { text: "Friendly neighborhood…", maps_to: "A" },
        { text: "Genius. Billionaire. Etc.", maps_to: "B" },
        { text: "I can do this all day", maps_to: "C" },
        { text: "See ya later!", maps_to: "D" },
      ]},
    ],
  },
};
