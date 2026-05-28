// Per-team stadium silhouette + day/night variants.
// Used on team pages, dashboards, game watch, and as portrait backgrounds.
import type { Team, Stadium } from "../store/types";
import { lighten, darken, withAlpha } from "./colorUtils";

interface StadiumOpts {
  width?: number;
  height?: number;
  time?: "day" | "night" | "dusk";
  weather?: "clear" | "rain" | "snow" | "fog";
  detail?: "full" | "silhouette";
}

export function stadiumSVG(team: Team, opts: StadiumOpts = {}): string {
  const w = opts.width ?? 800;
  const h = opts.height ?? 240;
  const time = opts.time ?? "dusk";
  const weather = opts.weather ?? "clear";
  const detail = opts.detail ?? "full";
  const stadium = team.stadium;
  const seed = hashStr(team.id);

  const sky = skyGradient(time);
  const skyDark = darken(sky.top, 0.2);
  const tp = team.primary;
  const ts = team.secondary;
  const ta = team.accent;

  const id = `s${team.id.replace(/[^a-z0-9]/gi, "")}`;
  const towerCount = stadium.roof === "dome" ? 0 : 4 + (seed % 3);
  const standH = h * 0.45;
  const fieldY = h * 0.78;

  return `
<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky.top}"/>
      <stop offset="100%" stop-color="${sky.bottom}"/>
    </linearGradient>
    <linearGradient id="${id}grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2d5b1f"/>
      <stop offset="100%" stop-color="#1c3a13"/>
    </linearGradient>
    <pattern id="${id}mow" width="60" height="20" patternUnits="userSpaceOnUse">
      <rect width="60" height="20" fill="#264e1a"/>
      <rect width="30" height="20" fill="#2f5e22"/>
    </pattern>
    <linearGradient id="${id}stand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${darken(tp, 0.15)}"/>
      <stop offset="100%" stop-color="${darken(tp, 0.5)}"/>
    </linearGradient>
    <radialGradient id="${id}lite" cx="50%" cy="0%" r="60%">
      <stop offset="0%" stop-color="rgba(255,240,200,0.45)"/>
      <stop offset="100%" stop-color="rgba(255,240,200,0)"/>
    </radialGradient>
  </defs>

  <!-- Sky -->
  <rect width="${w}" height="${h}" fill="url(#${id}sky)"/>

  ${time === "night" ? `<!-- Stars -->
    ${Array.from({length: 30}).map((_, i) => {
      const x = (seed * 17 + i * 31) % w;
      const y = (seed * 11 + i * 13) % Math.round(h * 0.4);
      return `<circle cx="${x}" cy="${y}" r="0.8" fill="#ffffff" opacity="0.7"/>`;
    }).join("")}` : ""}

  ${time === "night" ? `<!-- Moon -->
    <circle cx="${w * 0.78}" cy="${h * 0.18}" r="22" fill="#f5edd0" opacity="0.85"/>
    <circle cx="${w * 0.78}" cy="${h * 0.18}" r="32" fill="url(#${id}lite)"/>` : `<!-- Sun glow -->
    <circle cx="${w * 0.78}" cy="${h * 0.15}" r="36" fill="rgba(255,220,140,0.5)"/>`}

  <!-- Distant cityscape -->
  <g opacity="0.55">
    ${cityscape(w, h * 0.62, seed, darken(skyDark, 0.05))}
  </g>

  <!-- Stadium outer bowl -->
  <path d="M0 ${h * 0.62} Q${w * 0.18} ${h * 0.36} ${w * 0.5} ${h * 0.34} Q${w * 0.82} ${h * 0.36} ${w} ${h * 0.62} L${w} ${fieldY} L0 ${fieldY} Z" fill="url(#${id}stand)" stroke="${darken(tp, 0.4)}" stroke-width="1"/>
  <!-- Stand seating rows -->
  ${Array.from({length: 6}).map((_, i) => {
    const y = h * 0.46 + i * (standH * 0.06);
    return `<path d="M${w * 0.05} ${y + i*2} Q${w * 0.5} ${y - i*4} ${w * 0.95} ${y + i*2}" fill="none" stroke="${withAlpha(ta, 0.25)}" stroke-width="0.8"/>`;
  }).join("")}

  <!-- Suite ring -->
  <rect x="0" y="${h * 0.62}" width="${w}" height="6" fill="${darken(tp, 0.55)}"/>

  <!-- Light towers -->
  ${stadium.roof === "dome"
    ? `<path d="M0 ${h * 0.34} Q${w * 0.5} ${h * 0.18} ${w} ${h * 0.34}" fill="${darken(tp, 0.6)}" opacity="0.85"/>`
    : Array.from({length: towerCount}).map((_, i) => {
        const x = (w * 0.12) + i * (w * 0.76 / Math.max(1, towerCount - 1));
        const y = h * 0.4;
        return `<g>
          <rect x="${x - 0.7}" y="${y}" width="1.4" height="${h * 0.18}" fill="${darken(tp, 0.4)}"/>
          <rect x="${x - 7}" y="${y - 6}" width="14" height="4" fill="${darken(tp, 0.3)}"/>
          <circle cx="${x}" cy="${y - 4}" r="3" fill="${time === "night" ? "#fff4cf" : "#dcc890"}" opacity="${time === "night" ? 1 : 0.75}"/>
          ${time === "night" ? `<circle cx="${x}" cy="${y - 4}" r="9" fill="url(#${id}lite)"/>` : ""}
        </g>`;
      }).join("")}

  <!-- Stadium name banner -->
  ${detail === "full" ? `<g transform="translate(${w * 0.5},${h * 0.42})">
    <rect x="-90" y="-14" width="180" height="22" rx="3" fill="${tp}" stroke="${ts}" stroke-width="1"/>
    <text x="0" y="2" text-anchor="middle" font-family="'Oswald','Bebas Neue',sans-serif" font-size="13" fill="${ta}" font-weight="700" letter-spacing="1.5">${stadium.name.toUpperCase().slice(0, 22)}</text>
  </g>` : ""}

  <!-- Field grass with mowing pattern -->
  <rect x="0" y="${fieldY}" width="${w}" height="${h - fieldY}" fill="url(#${id}grass)"/>
  <rect x="0" y="${fieldY}" width="${w}" height="${h - fieldY}" fill="url(#${id}mow)" opacity="0.35"/>
  <!-- Infield dirt arc -->
  <path d="M${w * 0.32} ${h} Q${w * 0.5} ${fieldY + (h - fieldY) * 0.05} ${w * 0.68} ${h} Z" fill="#8a6939" opacity="0.85"/>
  <!-- Foul lines -->
  <line x1="${w * 0.5}" y1="${fieldY + 2}" x2="${w * 0.02}" y2="${h}" stroke="#ffffff" stroke-width="1" opacity="0.55"/>
  <line x1="${w * 0.5}" y1="${fieldY + 2}" x2="${w * 0.98}" y2="${h}" stroke="#ffffff" stroke-width="1" opacity="0.55"/>

  <!-- Weather overlay -->
  ${weatherOverlay(weather, w, h, seed)}
</svg>`;
}

function skyGradient(time: string) {
  switch (time) {
    case "day": return { top: "#87b9d8", bottom: "#cfe3ee" };
    case "night": return { top: "#0a132a", bottom: "#1a2540" };
    default: return { top: "#3a5a8a", bottom: "#e3a06a" }; // dusk
  }
}

function cityscape(w: number, ground: number, seed: number, color: string): string {
  let path = `M0 ${ground} `;
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 12 + ((seed + i * 7) % 22);
    const bh = 10 + ((seed * 3 + i * 11) % 60);
    path += `L${x} ${ground - bh} L${x + bw} ${ground - bh} `;
    x += bw;
    i++;
  }
  path += `L${w} ${ground} Z`;
  return `<path d="${path}" fill="${color}"/>`;
}

function weatherOverlay(weather: string, w: number, h: number, seed: number): string {
  if (weather === "rain") {
    return Array.from({length: 80}).map((_, i) => {
      const x = (seed * 7 + i * 13) % w;
      const y = (seed * 3 + i * 17) % h;
      return `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 14}" stroke="rgba(180,200,230,0.5)" stroke-width="1"/>`;
    }).join("");
  }
  if (weather === "snow") {
    return Array.from({length: 60}).map((_, i) => {
      const x = (seed * 5 + i * 19) % w;
      const y = (seed * 4 + i * 11) % h;
      return `<circle cx="${x}" cy="${y}" r="1.4" fill="rgba(255,255,255,0.7)"/>`;
    }).join("");
  }
  if (weather === "fog") {
    return `<rect width="${w}" height="${h}" fill="rgba(220,224,232,0.25)"/>`;
  }
  return "";
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function stadiumDataURL(team: Team, opts: StadiumOpts = {}): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(stadiumSVG(team, opts));
}
