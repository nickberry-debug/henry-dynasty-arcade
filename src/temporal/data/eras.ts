// Temporal Order — era catalog. Six historical periods the player can
// jump to. Each era has a palette, disguise, and AI context string
// that grounds mission/dialogue/ripple generation in the right setting.

import type { Era, MissionTemplate } from "../types";

export const ERAS: Era[] = [
  {
    id: "egypt",
    name: "Ancient Egypt",
    year: "1330 BCE",
    flag: "𓂀",
    palette: {
      floor: "#d4a544",
      floorAlt: "#b8862e",
      wall: "#6b4a1f",
      accent: "#fbbf24",
      sky: "#fde68a",
    },
    disguiseAs: "Scribe of the Court",
    flavor: "The Pharaoh's court bustles under the Aten. A vital figure has gone missing on the eve of an alliance — find them before history forgets.",
    figures: ["Pharaoh Akhenaten", "Queen Nefertiti", "Vizier Ramose", "Scribe Ipy", "Foreign Envoy"],
    aiContext: "Ancient Egypt, 1330 BCE, reign of Akhenaten. Setting: royal court at Amarna. Players speak with court scribes, priests, viziers, foreign envoys. Themes: politics of the new religion of the Aten, alliance with the Hittites or Mitanni, intrigue around the royal family.",
  },
  {
    id: "greece",
    name: "Ancient Greece",
    year: "432 BCE",
    flag: "Ω",
    palette: {
      floor: "#e2e8f0",
      floorAlt: "#cbd5e1",
      wall: "#475569",
      accent: "#0ea5e9",
      sky: "#bae6fd",
    },
    disguiseAs: "Visiting Sophist",
    flavor: "The Agora of Athens hums with debate. A philosopher whose teachings shape millennia has fallen silent. Convince him to speak — or history loses its conscience.",
    figures: ["Socrates", "Plato (youth)", "Aspasia", "Pericles", "Aristophanes"],
    aiContext: "Classical Athens, 432 BCE. Setting: the Agora and surrounding streets. Players talk with philosophers, playwrights, statesmen, and citizens. Themes: the Sophists vs. Socrates, the Peloponnesian War tensions, drama festivals.",
  },
  {
    id: "viking",
    name: "Viking Age",
    year: "915 CE",
    flag: "ᚹ",
    palette: {
      floor: "#475569",
      floorAlt: "#334155",
      wall: "#1e293b",
      accent: "#94a3b8",
      sky: "#94a3b8",
    },
    disguiseAs: "Visiting Skald",
    flavor: "A longship in a Norse village carries a compass impossibly far ahead of its time. Trace it to its source before the timeline frays.",
    figures: ["Jarl Bjorn", "Skald Halvor", "Shieldmaiden Astrid", "Merchant from the South", "Old Loremaster"],
    aiContext: "Viking Age Scandinavia, c. 915 CE. Setting: a coastal Norse village with longhouses and a harbor. NPCs include jarls, skalds, shieldmaidens, traveling merchants. Themes: trade routes, runes, raiding versus settling, anachronistic technology.",
  },
  {
    id: "renaissance",
    name: "Renaissance Florence",
    year: "1503 CE",
    flag: "✚",
    palette: {
      floor: "#fde68a",
      floorAlt: "#fbbf24",
      wall: "#92400e",
      accent: "#dc2626",
      sky: "#fde047",
    },
    disguiseAs: "Apprentice Painter",
    flavor: "Leonardo da Vinci's workshop is in disarray. Blueprints are missing. Restore them before flight is delayed by another four hundred years.",
    figures: ["Leonardo da Vinci", "Apprentice Salaì", "Patron de'Medici", "Rival Painter", "Inquisitor"],
    aiContext: "Florence, 1503 CE, height of the Renaissance. Setting: artisan workshops, Medici palace, narrow stone streets. NPCs include Leonardo, his apprentices, patrons, rival artists, churchmen. Themes: invention, patronage, secret notebooks, religious tension.",
  },
  {
    id: "revolution",
    name: "Revolutionary Philadelphia",
    year: "1776 CE",
    flag: "★",
    palette: {
      floor: "#a16207",
      floorAlt: "#854d0e",
      wall: "#451a03",
      accent: "#dc2626",
      sky: "#bfdbfe",
    },
    disguiseAs: "Newspaper Correspondent",
    flavor: "A signer of the Declaration has vanished the night before the vote. Reunite them with their quill before the document goes unsigned.",
    figures: ["Benjamin Franklin", "John Adams", "Thomas Jefferson", "A Tavern Keeper", "British Spy"],
    aiContext: "Philadelphia, July 1776. Setting: Independence Hall, taverns, printer's shops. NPCs include the Founders, tavern keepers, journeymen, suspected loyalists. Themes: the debates leading to the Declaration, espionage, the printing press.",
  },
  {
    id: "hollywood",
    name: "Roaring 20s Hollywood",
    year: "1925 CE",
    flag: "✶",
    palette: {
      floor: "#1e293b",
      floorAlt: "#334155",
      wall: "#0f172a",
      accent: "#fbbf24",
      sky: "#fde68a",
    },
    disguiseAs: "Studio Page",
    flavor: "A silent-film reel that should never have existed has surfaced. Trace the projectionist before tomorrow's Oscar-precursor ceremony.",
    figures: ["Studio Mogul", "Silent Film Star", "Director", "Projectionist", "Rival Reporter"],
    aiContext: "Hollywood, 1925. Setting: studio lots with silent-film cameras, jazz clubs, executive offices. NPCs include moguls, silent stars, directors, technicians, gossip reporters. Themes: the transition from silent to sound, studio politics, the Roaring Twenties.",
  },
];

export function getEra(id: string): Era | undefined {
  return ERAS.find(e => e.id === id);
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: "egypt_lost_vizier",
    eraId: "egypt",
    title: "The Pharaoh's Lost Vizier",
    premise: "A senior vizier vanishes the night before sealing an alliance. Find them — and the reason.",
    figures: ["Pharaoh Akhenaten", "Queen Nefertiti", "Vizier Ramose", "Foreign Envoy"],
    archetypes: ["investigation", "diplomacy"],
    difficulty: 2,
  },
  {
    id: "greece_silent_philosopher",
    eraId: "greece",
    title: "The Silent Philosopher",
    premise: "Socrates has stopped speaking in the Agora. Without his teachings, his student Plato never writes the Republic.",
    figures: ["Socrates", "Plato (youth)", "Aristophanes", "Aspasia"],
    archetypes: ["diplomacy", "disguise"],
    difficulty: 3,
  },
  {
    id: "viking_compass_anomaly",
    eraId: "viking",
    title: "The Compass That Couldn't Be",
    premise: "A magnetic compass — five centuries too early — has appeared in a longship's hold.",
    figures: ["Jarl Bjorn", "Skald Halvor", "Merchant from the South"],
    archetypes: ["investigation", "trick"],
    difficulty: 3,
  },
  {
    id: "renaissance_blueprints",
    eraId: "renaissance",
    title: "Da Vinci's Missing Blueprints",
    premise: "Leonardo's flying-machine sketches have been stolen. Without them, aeronautics stalls for centuries.",
    figures: ["Leonardo da Vinci", "Apprentice Salaì", "Rival Painter", "Patron de'Medici"],
    archetypes: ["investigation", "disguise"],
    difficulty: 3,
  },
  {
    id: "revolution_lost_founder",
    eraId: "revolution",
    title: "The Lost Founding Father",
    premise: "A Declaration signer has vanished into a Philadelphia tavern hours before the vote.",
    figures: ["Benjamin Franklin", "John Adams", "Tavern Keeper", "British Spy"],
    archetypes: ["investigation", "diplomacy", "disguise"],
    difficulty: 4,
  },
  {
    id: "hollywood_phantom_reel",
    eraId: "hollywood",
    title: "The Phantom Picture",
    premise: "A silent film exists that nobody remembers shooting — and it depicts events from next year.",
    figures: ["Studio Mogul", "Silent Film Star", "Projectionist", "Rival Reporter"],
    archetypes: ["investigation", "trick"],
    difficulty: 4,
  },
];

export function getMission(id: string): MissionTemplate | undefined {
  return MISSION_TEMPLATES.find(m => m.id === id);
}

export function missionsForEra(eraId: string): MissionTemplate[] {
  return MISSION_TEMPLATES.filter(m => m.eraId === eraId);
}
