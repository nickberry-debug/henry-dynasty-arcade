// Triple-color palettes: primary, secondary, accent
export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTES: Palette[] = [
  { primary: "#0c2340", secondary: "#bd9b60", accent: "#ffffff" }, // navy/gold
  { primary: "#003831", secondary: "#efb21e", accent: "#ffffff" }, // green/gold
  { primary: "#002d72", secondary: "#fd5a1e", accent: "#ffffff" }, // royal/orange
  { primary: "#000000", secondary: "#c4ced3", accent: "#ef3e42" }, // black/silver/red
  { primary: "#bf0d3e", secondary: "#003263", accent: "#ffffff" }, // crimson/navy
  { primary: "#005a9c", secondary: "#ef3e42", accent: "#ffffff" }, // blue/red
  { primary: "#13274f", secondary: "#ce1141", accent: "#ffffff" }, // dark navy/red
  { primary: "#27251f", secondary: "#fd5a1e", accent: "#efb21e" }, // black/orange/yellow
  { primary: "#0e3386", secondary: "#cc3433", accent: "#ffffff" }, // royal/red
  { primary: "#cc3433", secondary: "#0e3386", accent: "#ffffff" }, // red/blue
  { primary: "#101820", secondary: "#bd3039", accent: "#ffffff" }, // black/dark-red
  { primary: "#33006f", secondary: "#ef3e42", accent: "#ffd200" }, // purple/red/gold
  { primary: "#005c5c", secondary: "#0c2c56", accent: "#c4ced4" }, // teal/navy
  { primary: "#a71930", secondary: "#0c2340", accent: "#bac3c9" }, // crimson/navy
  { primary: "#0c2c56", secondary: "#005a9c", accent: "#ed174c" }, // royal blue/red
  { primary: "#003278", secondary: "#e81828", accent: "#ffffff" }, // royal/red
  { primary: "#ba0c2f", secondary: "#041e42", accent: "#a2aaad" }, // red/navy
  { primary: "#00385c", secondary: "#c41e3a", accent: "#ffffff" }, // navy/red
  { primary: "#fa4616", secondary: "#0a3457", accent: "#dac79d" }, // orange/navy/tan
  { primary: "#1a1a1a", secondary: "#92aab9", accent: "#003040" }, // black/silver/teal
  { primary: "#2c3e50", secondary: "#16a085", accent: "#ecf0f1" }, // slate/teal
  { primary: "#5a189a", secondary: "#ffba08", accent: "#ffffff" }, // purple/gold
  { primary: "#093824", secondary: "#ff6700", accent: "#ffd23f" }, // forest/orange
  { primary: "#0b132b", secondary: "#5bc0be", accent: "#ffffff" }, // navy/cyan
  { primary: "#22223b", secondary: "#f2e9e4", accent: "#c9ada7" }, // dark/cream
  { primary: "#283618", secondary: "#fefae0", accent: "#bc6c25" }, // olive/cream
  { primary: "#0d1b2a", secondary: "#778da9", accent: "#e0e1dd" }, // dark/slate
  { primary: "#1a1423", secondary: "#a91d3a", accent: "#ffffff" }, // dark plum/red
  { primary: "#072227", secondary: "#35858b", accent: "#ffffff" }, // dark teal
  { primary: "#1e1e24", secondary: "#ffc145", accent: "#ff6b6b" }, // black/yellow/coral
  { primary: "#100d25", secondary: "#e84855", accent: "#ffffff" }, // dark/red
  { primary: "#04030f", secondary: "#ff5d8f", accent: "#ffffff" }, // dark/pink
  { primary: "#212529", secondary: "#fca311", accent: "#ffffff" }, // dark/amber
  { primary: "#1a1a2e", secondary: "#16f4d0", accent: "#ffffff" }  // dark navy/mint
];

export const PALETTE_PRESETS = [
  { name: "Navy & Gold", palette: PALETTES[0] },
  { name: "Forest & Gold", palette: PALETTES[1] },
  { name: "Royal & Orange", palette: PALETTES[2] },
  { name: "Black & Silver", palette: PALETTES[3] },
  { name: "Crimson", palette: PALETTES[4] },
  { name: "Royal & Red", palette: PALETTES[15] },
  { name: "Plum & Crimson", palette: PALETTES[27] },
  { name: "Charcoal Mint", palette: PALETTES[33] }
];
