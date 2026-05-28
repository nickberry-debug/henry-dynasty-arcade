// 50+ unique random traits — flavor only, not stat-altering. Two are
// rolled at hero creation and become permanent character lore.
//
// Traits should be specific, evocative, and never overpowered. They show
// up in AI prompts so the model can weave them into narration.

export const TRAITS: string[] = [
  "Born during a lightning storm — Zeus took notice at the cradle.",
  "Can speak with crows. They don't always have useful things to say.",
  "Allergic to wool. Cannot wear traditional Spartan cloaks comfortably.",
  "Has a small birthmark shaped like a laurel leaf.",
  "Naturally good with horses but terrible with cats.",
  "Smells faintly of olive oil no matter how often they bathe.",
  "Once survived a fall that should have killed them. Doesn't remember how.",
  "Can hold their breath for an unnaturally long time.",
  "Hates the sound of bronze bells. Won't enter temples that ring them.",
  "Always knows which direction is north, even underground.",
  "Sleeps with eyes half-open. Other travelers find this disturbing.",
  "Cannot tell a lie convincingly — face gives them away every time.",
  "Eats anything, including things they probably shouldn't.",
  "Has never been bitten by a mosquito. No one knows why.",
  "Hums old folk songs when nervous, unconsciously.",
  "Owns a small wooden charm from childhood, refuses to part with it.",
  "Can read Phoenician script despite never being taught.",
  "Was raised partly by an aunt who told them the future would be strange.",
  "Has a pronounced limp in cold weather from a forgotten injury.",
  "Whistles two different notes at the same time — a useless party trick.",
  "Cannot keep wine down — limited to water and goat's milk.",
  "Born with mismatched eyes. Some say it's a sign of divine attention.",
  "Has a sister who died young and visits in dreams sometimes.",
  "Cannot enter a room without first touching the doorframe.",
  "Knows the entire Odyssey by heart from childhood recitations.",
  "Sneezes uncontrollably around horses. Travels with extra handkerchiefs.",
  "Was once mistaken for a god in a small village. Still gets letters.",
  "Has unusually long fingers — useful for picking locks.",
  "Cannot swim, no matter how many times it's been taught.",
  "Speaks to themselves in a second voice when alone.",
  "Has never seen the sea. Plans to. Hasn't gotten to it yet.",
  "Can identify any wine by smell within two breaths.",
  "Has a scar from a wolf bite at age six. Wolf is now a recurring dream.",
  "Cannot resist a good story. Will pay for one with their last drachma.",
  "Always carries dried figs in a pouch, for luck.",
  "Once accidentally insulted a minor god. Has been a little unlucky since.",
  "Counts steps when walking long distances. It calms them.",
  "Can build a small fire with damp wood. Their grandfather taught them.",
  "Has perfect pitch but cannot sing in tune to save their life.",
  "Was the seventh child of a seventh child — supposedly significant.",
  "Cannot stand dishonor. Even minor slights linger for years.",
  "Has been struck by lightning once. Survived. Doesn't talk about it.",
  "Has an irrational fear of butterflies. Will not be reasoned out of it.",
  "Sleeps deeply enough that small earthquakes don't wake them.",
  "Has hands that smell faintly of cinnamon, even when not near spice.",
  "Was raised by a single mother who taught them to read by candlelight.",
  "Once met Hermes briefly. Hermes didn't say anything memorable.",
  "Knows the names of every star they can see. No one taught them.",
  "Owns a single coin from a country that doesn't exist anymore.",
  "Cannot weep — physically incapable of producing tears.",
  "Has a recurring dream of standing in a city made entirely of gold.",
  "Was found, not born — left on a temple's steps, raised by priests.",
  "Cannot bring themselves to kill a snake, even when threatened.",
  "Has an ear for languages — picks up the basics of any tongue in a week.",
  "Always sleeps with their feet pointed east. Doesn't know why.",
  "Cannot resist an open door. Must look inside.",
];

/** Pick two distinct traits using the given rng (0..1). */
export function rollTraits(rng: () => number): [string, string] {
  const idxA = Math.floor(rng() * TRAITS.length);
  let idxB = Math.floor(rng() * TRAITS.length);
  while (idxB === idxA) idxB = Math.floor(rng() * TRAITS.length);
  return [TRAITS[idxA], TRAITS[idxB]];
}
