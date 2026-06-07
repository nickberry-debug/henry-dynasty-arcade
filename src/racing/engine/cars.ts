// Turbo Racers -- car roster. Phase 1 ships TWO playable cars so Quick Play
// has a player + ghost CPU with distinct sprites. Phase 2 will expand to a
// full Turbo Garage roster with upgrades. All names are ORIGINAL Berry Kids'
// Arcade IP -- nothing borrowed from Mario Kart or Micro Machines.

export interface CarDef {
  id: string;
  name: string;
  /** Kenney sprite under /assets/racing/cars/. */
  sprite: string;
  /** Render scale -- raw Kenney sprites are 71x131; we display smaller. */
  renderScale: number;
}

export const CARS: CarDef[] = [
  { id: "comet",   name: "Comet Crimson",  sprite: "/assets/racing/cars/car_red_3.png",    renderScale: 0.45 },
  { id: "bluejay", name: "Bluejay Bolt",   sprite: "/assets/racing/cars/car_blue_3.png",   renderScale: 0.45 },
  { id: "lemon",   name: "Lemon Lightning", sprite: "/assets/racing/cars/car_yellow_3.png", renderScale: 0.45 },
  { id: "verdant", name: "Verdant Vortex",  sprite: "/assets/racing/cars/car_green_3.png",  renderScale: 0.45 },
  { id: "midnight", name: "Midnight Mach",  sprite: "/assets/racing/cars/car_black_3.png",  renderScale: 0.45 },
];

export function carById(id: string): CarDef {
  return CARS.find(c => c.id === id) ?? CARS[0];
}
