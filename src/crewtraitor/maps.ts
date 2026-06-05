// Crew Traitor — map catalog. One starter map for MVP; expandable to
// the multi-map vision later. Coordinates are in a -50..50 SVG canvas.

import type { MapDef } from "./types";

const STATION_GAMMA: MapDef = {
  id: "station_gamma",
  name: "Station Gamma",
  rooms: [
    { id: "bridge",    name: "Bridge",    emoji: "🛰️",  x: -30, y: -28, w: 18, h: 14, color: "#7dd3fc" },
    { id: "reactor",   name: "Reactor",   emoji: "⚛️",  x:  30, y: -28, w: 18, h: 14, color: "#fb923c" },
    { id: "cafeteria", name: "Cafeteria", emoji: "🍔",  x:   0, y:   0, w: 22, h: 14, color: "#fde047" },
    { id: "lab",       name: "Lab",       emoji: "🧪",  x: -30, y:  28, w: 18, h: 14, color: "#a78bfa" },
    { id: "engine",    name: "Engine Bay",emoji: "🔧",  x:  30, y:  28, w: 18, h: 14, color: "#86efac" },
    { id: "hallway",   name: "Hallway",   emoji: "🛗",  x:   0, y:  18, w:  8, h:  6, color: "#9aa6bf" },
  ],
  tasks: [
    // Bridge
    { id: "t_chart",   label: "Plot Course",    emoji: "🗺️", roomId: "bridge" },
    { id: "t_comms",   label: "Send Signal",    emoji: "📡", roomId: "bridge" },
    // Reactor
    { id: "t_fuel",    label: "Refill Fuel",    emoji: "⛽", roomId: "reactor" },
    { id: "t_cool",    label: "Cool Reactor",   emoji: "❄️", roomId: "reactor" },
    { id: "t_align",   label: "Align Rods",     emoji: "🎚️", roomId: "reactor" },
    // Cafeteria
    { id: "t_clean",   label: "Wipe Tables",    emoji: "🧽", roomId: "cafeteria" },
    { id: "t_snack",   label: "Restock Snacks", emoji: "🍪", roomId: "cafeteria" },
    // Lab
    { id: "t_scan",    label: "Run Scan",       emoji: "🔬", roomId: "lab" },
    { id: "t_sample",  label: "Test Sample",    emoji: "🧫", roomId: "lab" },
    // Engine Bay
    { id: "t_grease",  label: "Grease Gears",   emoji: "⚙️", roomId: "engine" },
    { id: "t_wire",    label: "Patch Wiring",   emoji: "🔌", roomId: "engine" },
    { id: "t_oxygen",  label: "Check Oxygen",   emoji: "💨", roomId: "engine" },
  ],
  // Vent shortcuts — traitors + engineers can teleport between either
  // room in a pair. Two pairs let a traitor stay one step ahead.
  ventPairs: [
    ["bridge", "engine"],
    ["reactor", "lab"],
  ],
};

export const MAPS: MapDef[] = [STATION_GAMMA];

export function getMap(id: string): MapDef | undefined {
  return MAPS.find(m => m.id === id);
}

export const DEFAULT_MAP = STATION_GAMMA.id;
