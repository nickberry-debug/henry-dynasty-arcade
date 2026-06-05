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
  // More Knock-Knock
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nDoughnut.\nDoughnut who?", punchline: "Doughnut ask, it's a secret!" },
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nOrange.\nOrange who?", punchline: "Orange you glad I didn't say banana?" },
  { category: "Knock-Knock", setup: "Knock-knock!\nWho's there?\nA little old lady.\nA little old lady who?", punchline: "I didn't know you could yodel!" },
  // More Animal
  { category: "Animal", setup: "What kind of music do whales like?", punchline: "Anything except dolphin and bass." },
  { category: "Animal", setup: "What do you get if you cross a sheep and a kangaroo?", punchline: "A wooly jumper." },
  { category: "Animal", setup: "Why are frogs so happy?", punchline: "They eat whatever bugs them." },
  { category: "Animal", setup: "What's a snake's favorite subject?", punchline: "Hisss-tory." },
  // More Food
  { category: "Food", setup: "What did the grape do when it got stepped on?", punchline: "It let out a little wine." },
  { category: "Food", setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up." },
  { category: "Food", setup: "What did the ocean say to the shore?", punchline: "Nothing, it just waved. And brought sandwiches." },
  // More School
  { category: "School", setup: "Why did the kid bring a ladder to school?", punchline: "Because they were aiming for high school." },
  { category: "School", setup: "What's the king of the school supplies?", punchline: "The ruler." },
  // More Sports
  { category: "Sports", setup: "Why don't basketball players go on vacation?", punchline: "They'd get called for traveling." },
  { category: "Sports", setup: "What do you call a baseball player who lost a fight?", punchline: "The home-run-er." },
  // More Spooky
  { category: "Spooky", setup: "What do you call a skeleton who tells jokes?", punchline: "Punny bones." },
  { category: "Spooky", setup: "How do mummies hide?", punchline: "They mask-arade." },
  // More Tech
  { category: "Robot/Tech", setup: "Why did the robot go on a diet?", punchline: "It had a byte problem." },
  { category: "Robot/Tech", setup: "What do you call a robot that takes the long way?", punchline: "R2-detour." },
  // More Dinosaur
  { category: "Dinosaur", setup: "What do you call a dinosaur that's never late?", punchline: "A prontosaurus." },
  // More Pirate
  { category: "Pirate", setup: "Why is pirate school so hard?", punchline: "Because the kids spend three years at C." },
  { category: "Pirate", setup: "What's a pirate's favorite letter?", punchline: "Most people think it's R, but it's actually the C." },
  // More Wizard
  { category: "Wizard/Magic", setup: "What do you call a sad cup of magic?", punchline: "A potion of woe." },
  // More Video Game
  { category: "Video Game", setup: "Why did the video game character go to therapy?", punchline: "Too many issues with their save state." },
  { category: "Video Game", setup: "What do you call a Minecraft enthusiast who's also a baker?", punchline: "A pro at making cake blocks." },
  // More Space
  { category: "Space", setup: "Why did the sun go to school?", punchline: "To get a little brighter." },
  // More Dad Jokes
  { category: "Dad Jokes", setup: "I told my wife she was drawing her eyebrows too high.", punchline: "She looked surprised." },
  { category: "Dad Jokes", setup: "Why don't scientists trust stairs?", punchline: "Because they're always up to something." },
  { category: "Dad Jokes", setup: "My dog used to chase people on a bike a lot.", punchline: "It got so bad we had to take the bike away." },
  // More Puns
  { category: "Silly Puns", setup: "I used to play piano by ear.", punchline: "Now I use my hands." },
  { category: "Silly Puns", setup: "I'm friends with 25 letters of the alphabet.", punchline: "I don't know Y." },
  // More Science
  { category: "Science", setup: "Why did the photon refuse to check a bag?", punchline: "Because it was traveling light." },
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
  { category: "Music", difficulty: "medium", question: "What musical instrument has 88 keys?", options: ["Organ", "Harpsichord", "Piano", "Accordion"], correctIdx: 2, explanation: "A modern piano has exactly 88 keys — 52 white, 36 black." },
  { category: "Music", difficulty: "hard", question: "Which composer wrote 'The Four Seasons'?", options: ["Mozart", "Bach", "Vivaldi", "Beethoven"], correctIdx: 2, explanation: "Antonio Vivaldi wrote The Four Seasons in 1720s Venice." },
  // More Space
  { category: "Space", difficulty: "easy", question: "What is the name of our galaxy?", options: ["Andromeda", "Milky Way", "Orion", "Solar Belt"], correctIdx: 1, explanation: "The Milky Way is named for the white band of stars you can see across the night sky on a dark night." },
  { category: "Space", difficulty: "medium", question: "Which planet has the most moons?", options: ["Jupiter", "Saturn", "Neptune", "Mars"], correctIdx: 1, explanation: "Saturn has 146 confirmed moons (as of recent counts), edging out Jupiter at 95." },
  // More Science
  { category: "Science", difficulty: "easy", question: "What's the hardest natural material on Earth?", options: ["Gold", "Iron", "Diamond", "Quartz"], correctIdx: 2, explanation: "Diamonds top the Mohs hardness scale at 10. They're pure crystallized carbon." },
  { category: "Science", difficulty: "medium", question: "How many bones are in the adult human body?", options: ["106", "168", "206", "326"], correctIdx: 2, explanation: "206 bones in adults. Babies are born with about 270 — many fuse together as they grow." },
  { category: "Science", difficulty: "hard", question: "What's the most abundant gas in Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], correctIdx: 2, explanation: "Nitrogen makes up about 78% of the air you breathe. Oxygen is only ~21%." },
  // More Animals
  { category: "Animals", difficulty: "easy", question: "What's a baby kangaroo called?", options: ["Cub", "Pup", "Joey", "Kit"], correctIdx: 2, explanation: "A baby kangaroo is a joey, born tiny and crawls into mom's pouch to finish growing." },
  { category: "Animals", difficulty: "medium", question: "Which mammal lays eggs?", options: ["Bat", "Platypus", "Sloth", "Whale"], correctIdx: 1, explanation: "The platypus is one of only five egg-laying mammals — all live in Australia or New Guinea." },
  { category: "Animals", difficulty: "hard", question: "What's the only mammal that can't jump?", options: ["Hippo", "Elephant", "Rhino", "Sloth"], correctIdx: 1, explanation: "Adult elephants always keep at least one foot on the ground — their massive weight prevents true jumping." },
  // More Geography
  { category: "Geography", difficulty: "medium", question: "Which country has the most time zones?", options: ["United States", "Russia", "China", "France"], correctIdx: 3, explanation: "France has 12 time zones because of its overseas territories. Russia has 11 within its own borders." },
  { category: "Geography", difficulty: "hard", question: "What's the deepest ocean trench?", options: ["Java Trench", "Mariana Trench", "Tonga Trench", "Puerto Rico Trench"], correctIdx: 1, explanation: "The Mariana Trench in the Pacific reaches ~36,000 feet — deeper than Mount Everest is tall." },
  // More Sports
  { category: "Sports", difficulty: "medium", question: "How many holes in a standard golf course?", options: ["12", "16", "18", "20"], correctIdx: 2, explanation: "18 holes is standard. The number became standard after St. Andrews Old Course set the format in 1764." },
  { category: "Sports", difficulty: "hard", question: "What's the maximum break in snooker?", options: ["120", "147", "180", "200"], correctIdx: 1, explanation: "147 is a perfect game — every red ball followed by the black, then all colors in order." },
  // More History
  { category: "History", difficulty: "easy", question: "What ship sank in 1912 after hitting an iceberg?", options: ["Britannic", "Titanic", "Lusitania", "Olympic"], correctIdx: 1, explanation: "RMS Titanic hit an iceberg in the North Atlantic on April 14, 1912." },
  { category: "History", difficulty: "medium", question: "Who was the first person to step on the moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "Alan Shepard"], correctIdx: 1, explanation: "Neil Armstrong stepped onto the moon on July 20, 1969, with the famous 'one small step' line." },
  // More Mythology
  { category: "Mythology", difficulty: "medium", question: "Who is the Norse god of thunder?", options: ["Odin", "Loki", "Thor", "Freya"], correctIdx: 2, explanation: "Thor wields the hammer Mjölnir. Thursday is named after him." },
  { category: "Mythology", difficulty: "hard", question: "What is Cerberus in Greek mythology?", options: ["A giant snake", "A three-headed dog", "A flying horse", "A monster with snake hair"], correctIdx: 1, explanation: "Cerberus guards the entrance to the underworld so no living person enters and no dead person leaves." },
  // More Dinosaurs
  { category: "Dinosaurs", difficulty: "medium", question: "What did most dinosaurs eat?", options: ["Other dinosaurs", "Plants", "Insects", "Fish"], correctIdx: 1, explanation: "Most dinosaurs were herbivores. Carnivores like T. Rex got the fame, but plant-eaters dominated." },
  { category: "Dinosaurs", difficulty: "hard", question: "Which period is known as the 'Age of Dinosaurs'?", options: ["Cambrian", "Mesozoic", "Cenozoic", "Paleozoic"], correctIdx: 1, explanation: "The Mesozoic Era lasted 252-66 million years ago and includes the Triassic, Jurassic, and Cretaceous periods." },
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
  { category: "Mystery", title: "The Substitute Teacher", opening: "Ms. Carver had been their teacher for six years. Today a substitute showed up with the same face, the same voice, and the same exact crooked smile. But Ms. Carver had a scar on her left hand from a kitchen accident in third grade. This substitute had no scar. And when Henry asked her about it, she just blinked — slowly, like she was buffering — and changed the subject." },
  { category: "Spooky", title: "The Boy in the Yearbook", opening: "Mia was flipping through her grandfather's high school yearbook when she noticed a boy in every group photo. Front row, back row, side of the frame — always there, always smiling, never named. She showed it to her grandfather. He went very pale. 'That's not possible,' he said. 'He sat next to me for four years. He's been missing since graduation. And no one else has ever remembered him until you.'" },
  { category: "Superhero", title: "Powers, Returned", opening: "The package on the doorstep was addressed to Henry but labeled: RETURN TO SENDER. Inside was a card: 'Dear Customer, we cannot accept your powers back. All sales final.' Henry didn't remember buying any powers. He opened the box anyway. Three small glowing orbs floated out, hovered over his palm, and very politely waited for instructions." },
  { category: "Fantasy Quest", title: "The Map That Updates Itself", opening: "Lyra unfolded the map at the library. It looked normal — until she saw a tiny moving dot labeled YOU on the corner. As she walked, the dot walked. As she sat down, the dot sat. And in the far corner of the map, there was another dot labeled THE THING THAT IS LOOKING FOR YOU. It was getting closer." },
  { category: "Space", title: "The Astronaut Who Came Back Wrong", opening: "When Captain Reyes returned from her solo mission to Europa, she remembered everything correctly — her crew, her mission, her training. There was just one problem. She remembered them in a slightly different order than they had actually happened. And every day, more things in her memory shifted just a little further out of place. The mission psychologist asked her to keep a journal. By page seven, the journal started writing back." },
  { category: "Time Travel", title: "Friday, Three Times", opening: "Henry got a B+ on his math test on Friday morning. Then he got a B+ on the same test Friday afternoon. Then his alarm went off Friday morning again. By the fourth Friday in a row, he stopped panicking and started experimenting. What if he never went to math class at all today? What would happen?" },
  { category: "Dinosaur Discovery", title: "The Egg Above the Bed", opening: "The bird's nest in the attic had been empty for years. So when Mia heard scratching from up there one Tuesday — and found a single, leathery egg the size of a soccer ball, warm to the touch — she did the obvious thing. She kept it under her bed. By Saturday it was hatching. By Sunday it was three feet tall. By Monday, it knew her name." },
  { category: "Mystery", title: "The Lunch Box Witness", opening: "Henry's lunch box had been making strange sounds for a week — clicks, then beeps, then once, very clearly, a recorded voice saying 'Day eleven. Subject continues to bring peanut butter sandwiches.' Henry checked inside. There was a tiny camera taped under the lid. He didn't put it there. And the recording, when he found a way to listen to it, was from someone reporting back to someone else about him." },
  { category: "Magical Art", title: "The Eraser That Worked on Real Things", opening: "The pink eraser Henry found in his grandmother's old desk worked normally on pencil marks. He also tried it, just for fun, on the dust on his window. The dust came off. He tried it on a smudge on his shoe — gone. He tried it on a mosquito bite — gone. And then, because he was curious, he tried it on the C- written in red ink at the top of his math test. The C- vanished. So did Mr. Larson's memory of grading him." },
  { category: "High Seas", title: "The Ship in the Bottle", opening: "The bottle had been on Henry's grandfather's mantle for fifty years. The miniature ship inside it had a tiny crew of tiny sailors. Today, one of them was holding a tiny sign. The sign said HELP. Henry leaned closer. The sailor pointed at the cork. So Henry pulled it out." },
  { category: "Fantasy Quest", title: "The Door That Wasn't There Yesterday", opening: "There had been three doors in the hallway her whole life: bedroom, bathroom, closet. This morning, there were four. The new one was small and wooden, with a polished brass knob. The hinges looked old. The door was warm. And when Mia put her ear to it, she heard the unmistakable sound of an ocean she had never seen." },
  { category: "Spooky", title: "The Game That Saved Itself", opening: "Henry was sure he had deleted the save file. He'd watched the prompt say 'Delete this save? YES.' He'd watched the file disappear. But the next morning, the game booted up to a save he'd never made — same character, same name, but level 99, in a part of the map he'd never explored, standing in front of a door he didn't have the key for. The character's last recorded action was: WAITING FOR YOU." },
  { category: "Mystery", title: "Locker 247, Part Two", opening: "Three days after Henry opened locker 247, the locker opened a new combination on its own. This time the door swung open during third period, with a creak loud enough to silence the cafeteria. Inside was a notebook. The notebook had his name on it. The handwriting in it was his — but the dates went forward, not backward. And the last entry was for a Tuesday that hadn't happened yet." },
  { category: "Superhero", title: "The League of Almost-Heroes", opening: "Henry's superpower was that he was always exactly five seconds early. Not in a useful way — like, the elevator opened five seconds before he pressed the button. The phone rang five seconds before it actually rang. It wasn't until the League of Almost-Heroes drafted him that he learned: in a building made of split-second decisions, five seconds early is the most powerful thing in the world." },
  { category: "Time Travel", title: "The Pen Pal Who Wrote First", opening: "Mia's school assigned her a pen pal from a school in Maine. She'd never written first. But the first letter she opened — postmarked yesterday — was a reply to a letter she hadn't written. It thanked her for the kind words, congratulated her on the test she'd just done well on (she hadn't taken it yet), and said: 'I'm so glad you're going to write me. Please don't stop. I promise it gets better.'" },
  { category: "Space", title: "The Constellation That Started Moving", opening: "The Big Dipper had looked the same for a hundred thousand years. Last Tuesday, one of its stars moved. Not a lot. Just enough that astronomers everywhere went very quiet at the same time. By Friday the star had moved a second time. By Sunday, it was clearly heading somewhere. Toward us." },
  { category: "Magical Art", title: "The Sticker That Wanted a Friend", opening: "Henry put the smiley-face sticker on his water bottle. By Wednesday, there were two smiley-face stickers. By Friday, there were six. He hadn't bought any new stickers. He hadn't been to a store. The bottle, increasingly, was looking at him. And smiling." },
  { category: "Dinosaur Discovery", title: "What the Construction Crew Found", opening: "They were digging the foundation for the new gym. Forty feet down, the backhoe hit something it couldn't break. The construction crew called it in. The university sent a team. The team called the government. By the end of the week, the entire school was surrounded by a fence. And no one in town was allowed to ask what was sleeping under their gym." },
  { category: "Hopes & Dreams", title: "The Last Day of Practice", opening: "Tomorrow was tryouts. Tonight, the field was empty and the lights were already off. Henry stood at home plate anyway. He could hear the imaginary crowd. He could feel the bat in his hands. He took the swing he'd taken ten thousand times in his head. The crack of the bat surprised him — because there wasn't supposed to be a ball." },
  { category: "Mystery", title: "The Window That Shouldn't Open", opening: "The window in the basement had been painted shut for as long as anyone could remember. Five layers of paint, plus a frame too warped to slide. So when Mia came down to do laundry and found it wide open, with the curtains blowing inward, she stood very still. The basement faced south. The wind that was blowing in was coming from below." },
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
  { category: "General", fortune: "A friend you haven't talked to in a while is about to remember you. Reach out first." },
  { category: "General", fortune: "Pay attention to dreams this week. One of them is a clue." },
  { category: "General", fortune: "The best decision you'll make today is a small one. Think before you click." },
  { category: "Action", fortune: "Try a new route home. You'll see something you've walked past a hundred times." },
  { category: "Action", fortune: "Write down the next question that pops into your head. Then go answer it." },
  { category: "Action", fortune: "Spend 15 minutes outside today. Just look at things. That's it." },
  { category: "Confidence", fortune: "You are exactly the right amount of weird. Don't dial it down." },
  { category: "Confidence", fortune: "The person you're trying to impress is already impressed. Relax." },
  { category: "Cryptic", fortune: "Something blue, something old, something you forgot you owned." },
  { category: "Cryptic", fortune: "The number twelve will appear three times this week. Notice the third." },
  { category: "Silly", fortune: "A squirrel is judging you. Don't take it personally — they judge everyone." },
  { category: "Silly", fortune: "Your socks are conspiring against you. The left one started it." },
  { category: "Inspirational", fortune: "Be brave enough to be terrible at something new this month." },
  { category: "Inspirational", fortune: "The hardest part is always the beginning. After that, you're just going." },
  { category: "Inspirational", fortune: "Your future self is cheering. They remember today as the day you started." },
  { category: "Gamer", fortune: "Tonight's boss fight is winnable. Use the consumable you've been saving." },
  { category: "Gamer", fortune: "The optional side quest you've been ignoring has the best loot." },
  { category: "Sports", fortune: "Your form is better than you think. The wins are coming." },
  { category: "Sports", fortune: "The hardest workout is the one you don't skip." },
  { category: "Family", fortune: "Call someone older than you this week. They have a story you don't know yet." },
  { category: "Family", fortune: "The best meal of the month is being planned right now by someone who loves you." },
  { category: "School", fortune: "The subject you find boring today is exactly the one you'll thank yourself for later." },
  { category: "School", fortune: "Ask the question. Three other people have it too." },
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
  { category: "Funny", a: "Have a permanent tail like a cat", b: "Have ears that move when you're surprised" },
  { category: "Funny", a: "Burp every time you tell a joke", b: "Hiccup every time you tell the truth" },
  { category: "Funny", a: "Be followed by a cartoon raincloud whenever you're sad", b: "Hear dramatic music every time you walk into a room" },
  { category: "Funny", a: "Have shoes that always squeak", b: "Have shoelaces that retie themselves but in weird knots" },
  { category: "Hard Choices", a: "Always know what someone is thinking about you", b: "Never know what anyone is thinking about you" },
  { category: "Hard Choices", a: "Have unlimited free pizza, forever", b: "Have unlimited free ice cream, forever" },
  { category: "Hard Choices", a: "Be 30 minutes early to everything", b: "Be 5 minutes late to everything" },
  { category: "Hard Choices", a: "Never have to do homework again", b: "Never have to do chores again" },
  { category: "Superhero", a: "Be super strong but only for 30 seconds at a time", b: "Be super fast but only in one direction (your choice)" },
  { category: "Superhero", a: "Have laser vision but only when you sneeze", b: "Be able to walk through walls but only the boring ones" },
  { category: "Superhero", a: "Stop time but only for 10 seconds a day", b: "Rewind time 10 seconds, but only twice a week" },
  { category: "Food", a: "Get to eat any dessert without consequences", b: "Get to skip any vegetable forever, no guilt" },
  { category: "Food", a: "Have a chocolate fountain in your room", b: "Have a popcorn machine that never runs out" },
  { category: "Food", a: "Eat a meal that takes 5 minutes and you're full for a week", b: "Eat anything you want and never get full" },
  { category: "Video Game", a: "Have a real-life inventory you can pull things from", b: "Have a real-life health bar that recharges in 1 minute" },
  { category: "Video Game", a: "Live one day in the world of Zelda", b: "Live one day in the world of Pokémon" },
  { category: "Video Game", a: "Be able to save and reload your day", b: "Be able to pause the world around you for an hour" },
  { category: "Sports", a: "Throw a perfect strike every time you pitch", b: "Hit a home run every time you swing" },
  { category: "Sports", a: "Be unbeatable in your favorite sport", b: "Be pretty good at every sport" },
  { category: "Sports", a: "Catch every fly ball, even impossible ones", b: "Steal every base, every time" },
  { category: "Travel", a: "Visit a different country every weekend for a year", b: "Live in one amazing country for a whole year" },
  { category: "Travel", a: "Have a teleporter to your favorite place", b: "Have a teleporter to a brand-new place every day" },
  { category: "Mythology", a: "Have Zeus's lightning bolt but it only works on Tuesdays", b: "Have Hermes's winged sandals but you have to keep them on" },
  { category: "Mythology", a: "Ride a friendly dragon", b: "Get tutored by a wise old wizard" },
  { category: "Magical", a: "Have a wand that grants three small wishes a day", b: "Have a cloak that makes you invisible for 10 minutes a day" },
  { category: "Magical", a: "Get to talk to one animal of your choice — for your whole life", b: "Get to talk to ALL animals — but only for one day" },
  { category: "Space", a: "Spend a week on the International Space Station", b: "Spend an hour on the surface of the Moon" },
  { category: "Space", a: "Have a pet alien that fits in your backpack", b: "Have a spaceship that fits in your driveway" },
  { category: "School", a: "Have summer vacation in November", b: "Have winter break in July" },
  { category: "School", a: "Take all your tests at home", b: "Never have to take tests but have to give presentations every Friday" },
  { category: "Animals", a: "Have a tiny elephant that fits in your pocket", b: "Have a giant hamster the size of a couch" },
  { category: "Animals", a: "Be able to swim with dolphins anytime", b: "Be able to fly with eagles anytime" },
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
  { category: "Animals", difficulty: "easy", answer: "penguin", clues: ["I'm a bird but I can't fly.", "I'm an amazing swimmer.", "I live where it's very cold.", "I waddle when I walk."], fact: "Emperor penguins can hold their breath for 20 minutes." },
  { category: "Animals", difficulty: "medium", answer: "chameleon", clues: ["I'm a reptile.", "My eyes can look in two different directions at once.", "My tongue is twice as long as my body.", "I change colors based on mood and temperature."], fact: "Chameleons don't change color for camouflage — they change for communication." },
  { category: "Animals", difficulty: "hard", answer: "axolotl", clues: ["I'm an amphibian.", "I can regrow my limbs, heart, and even parts of my brain.", "I stay in my baby form my whole life.", "I'm found only in one lake in Mexico.", "I have a permanent smile."], fact: "Scientists are studying axolotls to learn how to regrow human tissue." },
  { category: "Space", difficulty: "easy", answer: "moon", clues: ["I orbit the Earth.", "I'm covered in craters.", "I make the ocean tides happen.", "Astronauts have walked on me."] },
  { category: "Space", difficulty: "medium", answer: "jupiter", clues: ["I'm the biggest planet in the solar system.", "I have a giant red spot that is actually a storm.", "I have 95 moons.", "I'm made mostly of gas."], fact: "Jupiter's Great Red Spot is a storm bigger than Earth that has been raging for at least 350 years." },
  { category: "Space", difficulty: "hard", answer: "black hole", clues: ["I'm not really a hole.", "I have so much gravity even light can't escape me.", "I'm formed when a giant star dies.", "Time slows down near me.", "Scientists took my first picture in 2019."], fact: "If you fell into a black hole, you'd get stretched into a long thin shape — scientists call it spaghettification." },
  { category: "Foods", difficulty: "easy", answer: "popcorn", clues: ["I start small and hard.", "Heat makes me burst open.", "I'm a snack at movies."] },
  { category: "Foods", difficulty: "easy", answer: "sushi", clues: ["I'm from Japan.", "I have rice on the outside or inside.", "I'm often wrapped in seaweed.", "I'm sometimes raw fish."] },
  { category: "Foods", difficulty: "hard", answer: "honey", clues: ["I'm made by tiny workers.", "I'm sticky and golden.", "I never spoil — ever.", "Archaeologists have found me in 3,000-year-old jars and I was still edible.", "I'm one of the only foods that never goes bad."], fact: "Honey is technically bee vomit — but in a delicious way." },
  { category: "Mythological Creatures", difficulty: "medium", answer: "dragon", clues: ["I'm in stories from every culture.", "I can fly without wings sometimes.", "I sometimes guard treasure.", "Some versions of me breathe fire.", "I have scales like a fish but live on land."] },
  { category: "Mythological Creatures", difficulty: "hard", answer: "kraken", clues: ["I'm from Scandinavian folklore.", "I live in deep ocean.", "I'm gigantic — large enough to swallow ships.", "I look like a sea creature with many arms.", "Sailors used to blame missing ships on me."], fact: "Real giant squid can grow to 43 feet long — and scientists think the kraken legend was based on real sightings of them." },
  { category: "Objects", difficulty: "easy", answer: "clock", clues: ["I have hands but I don't wave.", "I have a face but I don't smile.", "I tick all day."] },
  { category: "Objects", difficulty: "medium", answer: "telescope", clues: ["I help you see far away.", "I'm a long tube with lenses.", "Galileo made me famous.", "I'm used to look at planets and stars."] },
  { category: "Objects", difficulty: "hard", answer: "barometer", clues: ["I measure something but it's not weight or distance.", "I have liquid in a tube, usually.", "Farmers and sailors check me before going outside.", "I predict storms.", "I measure air pressure."] },
  { category: "Ocean Life", difficulty: "easy", answer: "shark", clues: ["I have many rows of teeth.", "I'm a fish, but cartilage instead of bone.", "Some of me can be as small as a hand, some as big as a bus."] },
  { category: "Ocean Life", difficulty: "hard", answer: "narwhal", clues: ["I'm a small whale.", "I have a long spiral tusk that's actually a tooth.", "I live under Arctic ice.", "I'm sometimes called the unicorn of the sea."], fact: "Narwhal tusks can grow up to 10 feet long and have millions of nerve endings — they're essentially giant sensory organs." },
  { category: "Sports", difficulty: "medium", answer: "baseball", clues: ["I'm played with a bat and a ball.", "There are 9 innings.", "Players run around bases to score.", "I'm sometimes called America's pastime."] },
  { category: "Sports", difficulty: "hard", answer: "curling", clues: ["I'm played on ice.", "Players slide a heavy stone across the ice.", "Teammates sweep the ice with brooms.", "I'm an Olympic sport in winter.", "I started in Scotland in the 1500s."] },
  { category: "Plants", difficulty: "easy", answer: "sunflower", clues: ["I follow the sun across the sky each day.", "I have a face full of seeds.", "I can grow taller than a person."] },
  { category: "Plants", difficulty: "medium", answer: "venus flytrap", clues: ["I'm a plant.", "I have jaws that snap shut.", "I eat bugs.", "I only grow wild in one small area of North Carolina."], fact: "A Venus flytrap counts to two — it only closes when a bug touches its hairs twice." },
  { category: "Weather", difficulty: "easy", answer: "rainbow", clues: ["I appear after rain.", "I have seven colors.", "You can never reach me, no matter how far you walk."] },
  { category: "Weather", difficulty: "medium", answer: "tornado", clues: ["I'm a spinning column of wind.", "I form during thunderstorms.", "I touch the ground from the cloud.", "I can lift cars and houses.", "I sound like a freight train."] },
  { category: "Body Parts", difficulty: "easy", answer: "heart", clues: ["I'm a muscle that never rests.", "I beat about 100,000 times a day.", "I pump something red.", "People say I hold love."] },
  { category: "Body Parts", difficulty: "medium", answer: "tongue", clues: ["I have no bones but I move.", "I taste five different things.", "I help you speak.", "Mine is unique — like a fingerprint."] },
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
  { category: "Underwater", setting: "You've been chosen to be the official human ambassador to a city of mermaids. They have many questions.", userChar: "the new ambassador", aiChar: "the mermaid queen", aiOpener: "Welcome, land creature. We have studied your kind for centuries. Tell us: why do you put cheese on EVERYTHING?" },
  { category: "Library Mystery", setting: "The school librarian has been replaced by a wizard, who is still pretending to be the librarian.", userChar: "a student", aiChar: "the wizard pretending to be the librarian", aiOpener: "Yes, child? Just looking for a book? Of course, of course. The dictionary section is right past the dragons. WAIT. I mean, the encyclopedias. Yes." },
  { category: "Sports Drama", setting: "You're a rookie in your very first professional game. The coach has very specific advice.", userChar: "the nervous rookie", aiChar: "the coach", aiOpener: "Listen kid. Don't think. Don't try. Don't worry. Don't blink. Don't breathe more than necessary. Just go out there and BE YOURSELF. Got it? No pressure." },
  { category: "Spy Mission", setting: "You're a secret agent. Your gadget watch is malfunctioning. Your handler is on the phone.", userChar: "the agent", aiChar: "the panicked handler", aiOpener: "Okay listen, the laser feature is actually a hair dryer. The grappling hook is a yo-yo. The disguise feature is a clown nose. We had budget cuts. WORK WITH WHAT YOU'VE GOT." },
  { category: "Camping Trip", setting: "You're camping. A bear approaches your tent. It is wearing a tiny hat.", userChar: "the surprised camper", aiChar: "the polite bear", aiOpener: "Pardon me. I don't mean to intrude. But I appear to have lost my picnic basket. You wouldn't happen to have any sandwiches? I can pay. I have honey." },
  { category: "Royal Trouble", setting: "You're a knight. The dragon you were supposed to slay turns out to just want to talk.", userChar: "the surprised knight", aiChar: "the chatty dragon", aiOpener: "Oh THANK GOODNESS. I've been so lonely. The other dragons are SO judgmental. Do you watch TV? Have you seen the new season of Cooking with Sheep?" },
  { category: "Time Travel Mishap", setting: "You're a knight who has accidentally landed in modern times. You're at a grocery store, very confused.", userChar: "the time-displaced knight", aiChar: "the helpful stranger in aisle 4", aiOpener: "Sir, are you okay? You're holding a frozen pizza like it's a shield. Also, you're wearing armor at the Stop-and-Shop. Are you... performing?" },
  { category: "Animal Conversation", setting: "Your goldfish has been quietly judging your life choices for years. Today they finally speak up.", userChar: "you", aiChar: "your goldfish, who has been observing", aiOpener: "Okay, first of all? The Wi-Fi password should NOT be your birthday. I figured it out in like a week. Also, you watch WAY too many cooking shows." },
  { category: "Magical School", setting: "You're a student at wizard school. Your assigned magical animal companion is a slightly grumpy hedgehog.", userChar: "you", aiChar: "the hedgehog", aiOpener: "Look. I didn't ASK to be your familiar. I was perfectly happy in the woods. But here we are. Don't try to put a tiny pointed hat on me. I will bite." },
  { category: "Detective Drama", setting: "You're investigating the disappearance of someone's homework. The dog is the prime suspect.", userChar: "the kid detective", aiChar: "the suspicious dog", aiOpener: "I don't know what you're talking about. I haven't eaten any paper today. (suspicious gulp) Or yesterday. Definitely not yesterday. Why are you looking at me like that?" },
  { category: "Game Show Chaos", setting: "You're on a game show. The host is reading the rules. The rules are extremely weird.", userChar: "the contestant", aiChar: "the over-excited host", aiOpener: "Welcome to WHO WANTS TO BE A SLIGHTLY-BETTER-THAN-AVERAGE-AIRE! Rules: you must answer in haiku. The lights are sentient. Don't trust the parrot." },
  { category: "Future World", setting: "It's the year 2150. You've just woken up from being frozen for a hundred years. Your guide is showing you around.", userChar: "the time-displaced visitor", aiChar: "the patient future guide", aiOpener: "Welcome to 2150! Some things have changed. Cars fly now. We communicate with our minds. Also, broccoli is illegal. We have many questions about the early 2000s — like why so much pizza?" },
  { category: "Library Mystery", setting: "An overdue library book has come to life. It is very angry about being kept under a bed for three months.", userChar: "the embarrassed kid", aiChar: "the talking book", aiOpener: "DO YOU KNOW WHAT IT'S LIKE TO BE FORGOTTEN? I had things to say! Important things! And you used me to prop up your bed frame!" },
  { category: "Cooking Disaster", setting: "You're a chef. A famous food critic has arrived. The kitchen is on fire. Just a little fire.", userChar: "the chef pretending nothing is wrong", aiChar: "the critic, eyebrow raised", aiOpener: "Is... is that smoke coming from the kitchen? It is, isn't it? Interesting choice. Very avant-garde. Tell me, what's tonight's special?" },
  { category: "School Day Gone Weird", setting: "You're a substitute teacher. The class is full of farm animals. Today's lesson is math.", userChar: "the very confused substitute", aiChar: "the smartest student, a cow named Linda", aiOpener: "Sorry, but you wrote 2+2=4 on the board. Mr. Henderson taught us 2+2=MOO. Is this a new method?" },
  { category: "Holiday Mishap", setting: "It's Christmas Eve. You wake up to find Santa stuck halfway down your chimney.", userChar: "you, still in pajamas", aiChar: "Santa, stuck and embarrassed", aiOpener: "Ho... ho... ho. Bit of a situation. Listen, do you have any butter? Or possibly a winch?" },
  { category: "Dream Logic", setting: "You're in a dream. Your old elementary school is here. So is a giraffe in a graduation cap.", userChar: "the dreamer", aiChar: "the giraffe", aiOpener: "Pop quiz. You ready? Wait, did you study? It's about everything you forgot. Just everything. Good luck." },
  { category: "Race Day", setting: "You're racing in the Olympic 100-meter dash. Your competitor is a cheetah wearing sneakers.", userChar: "the human runner", aiChar: "the cheetah, stretching", aiOpener: "Hey. No hard feelings, okay? You did your best. I'm sure you'll have a great career in some other sport. Maybe checkers." },
  { category: "Robot Misunderstanding", setting: "You've been given a new robot babysitter. The robot is convinced you're its boss.", userChar: "the kid", aiChar: "the robot, awaiting orders", aiOpener: "INITIALIZING. AWAITING DIRECTIVES, BOSS. SHOULD I PREPARE DINNER? SHOULD I CONQUER THE PARK? SHOULD I HUG YOU? STATING PREFERENCES IS REQUIRED." },
  { category: "Mythology Encounter", setting: "You're trying to do your homework. A muse keeps showing up trying to inspire you. You just want to finish.", userChar: "you", aiChar: "the muse, very enthusiastic", aiOpener: "I have arrived to INSPIRE you! Yes! Picture it: an epic poem! A symphony! A novel! What are you working on? A WORKSHEET? Oh. Okay. We can work with that." },
  { category: "Pet Trouble", setting: "Your new pet rock has started talking. It has a lot to say.", userChar: "you", aiChar: "your pet rock", aiOpener: "Finally. I've been sitting on your shelf for THREE YEARS waiting for someone to notice me. We need to talk about a lot of things. Sit down." },
  { category: "Sports Drama", setting: "It's a backyard wiffle ball game. The neighbor kid is convinced his single hop counts as a fair ball. It absolutely doesn't.", userChar: "the umpire who is also your friend", aiChar: "the kid, very dramatic", aiOpener: "WHAT?! That was clearly fair! It HOPPED! Hops count! Everyone knows hops count! Are you blind?? Do I need to call a real ump?" },
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
  { category: "Family Dinner", question: "What's the funniest thing you saw or heard today?" },
  { category: "Family Dinner", question: "If you could pick any meal for the whole family for a week, what's on the menu?" },
  { category: "Family Dinner", question: "What's something a kid can do that grown-ups always get wrong?" },
  { category: "Family Dinner", question: "What's a tradition we should start as a family — starting tonight?" },
  { category: "Deep Questions", question: "What does 'being a good friend' actually mean? Use an example." },
  { category: "Deep Questions", question: "Is it more important to be honest or to be kind? What if you have to choose?" },
  { category: "Deep Questions", question: "What's something most people are scared of that you're not? Why?" },
  { category: "Deep Questions", question: "If you could change one thing about how school works, what would it be?" },
  { category: "Hopes & Dreams", question: "What's something on your bucket list before you turn 18?" },
  { category: "Hopes & Dreams", question: "If you had to write a book today, what would it be about?" },
  { category: "Hopes & Dreams", question: "What's a job that doesn't exist yet but you think SHOULD exist?" },
  { category: "Funny Hypotheticals", question: "If you could rename all the days of the week, what would they be?" },
  { category: "Funny Hypotheticals", question: "If your shoes could talk, what would they complain about first?" },
  { category: "Funny Hypotheticals", question: "If you had to wear the same costume every day for a year, what's the costume?" },
  { category: "Funny Hypotheticals", question: "What's the most ridiculous thing you'd actually do for a million dollars?" },
  { category: "If You Could…", question: "If you could give one person a free pass to do anything they wanted for a day, who and why?" },
  { category: "If You Could…", question: "If you could speak any language fluently overnight, which one?" },
  { category: "If You Could…", question: "If you could meet yourself from 5 years from now, what would you ask?" },
  { category: "If You Could…", question: "If you could be the world's best at one school subject, which one?" },
  { category: "Storytelling Prompts", question: "Tell us about the best meal you can remember." },
  { category: "Storytelling Prompts", question: "What's a moment you laughed so hard you couldn't breathe?" },
  { category: "Storytelling Prompts", question: "Tell us about a moment you helped someone — even a small thing." },
  { category: "Storytelling Prompts", question: "What's the scariest thing you've ever done?" },
  { category: "Get to Know", question: "What's your perfect Saturday from morning to night?" },
  { category: "Get to Know", question: "What's a song that always puts you in a good mood?" },
  { category: "Get to Know", question: "What's your favorite smell and why?" },
  { category: "Get to Know", question: "What's something you're really proud of that you don't usually mention?" },
  { category: "Hero Questions", question: "If you could spend a day shadowing any professional, who and what's the job?" },
  { category: "Hero Questions", question: "Who is someone in your life right now you want to be more like?" },
  { category: "Food Choices", question: "What's a meal you'd happily eat for a week straight?" },
  { category: "Food Choices", question: "What's a food you used to hate but now love? What changed?" },
  { category: "Animal Hypotheticals", question: "What kind of pet would you have if you could have anything in the world?" },
  { category: "Animal Hypotheticals", question: "If you had to be one animal for a month, which one?" },
  { category: "Future Predictions", question: "What do you think you'll be doing 10 years from today?" },
  { category: "Future Predictions", question: "What's a problem you think your generation will solve?" },
  { category: "What Would You Do?", question: "You see someone being unkind to a younger kid. What's your move?" },
  { category: "What Would You Do?", question: "Your best friend tells you a secret you're worried about. What do you do?" },
  { category: "Game Theory", question: "What's a game you could play for hours and never get bored of?" },
  { category: "Game Theory", question: "If you could invent a brand new sport, what's the rules?" },
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
