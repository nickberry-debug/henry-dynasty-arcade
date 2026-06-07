// Monster Forge - Phase 5 photo snapshot mode.
//
// Captures the WebGL canvas via renderer.toDataURL() at 1024x1024 and
// triggers a browser download. Also saves a per-profile gallery of recent
// snapshots in localStorage (capped to ~12 entries to avoid quota).

import * as THREE from "three";
import { profileKey } from "../../profiles/store";
import { unlockAchievement } from "./achievements";

const GALLERY_KEY = "henry-monster-forge-photos-v1";
const MAX_PHOTOS = 12;

export interface PhotoEntry {
  id: string;
  name: string;
  monsterName: string;
  monsterId: string;
  dataUrl: string;   // truncated thumbnail (data URI ~256px to keep quota OK)
  takenAt: number;
}

export function loadGallery(): PhotoEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(profileKey(GALLERY_KEY));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveGallery(arr: PhotoEntry[]): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(profileKey(GALLERY_KEY), JSON.stringify(arr)); }
  catch { /* quota - silently drop */ }
}

/**
 * Snapshot the renderer's current canvas at a target resolution and return
 * the data URL. Caller is responsible for download/save.
 */
export function snapshot(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, size = 1024): string {
  // Capture current size
  const sz = new THREE.Vector2();
  renderer.getSize(sz);
  const oldW = sz.x, oldH = sz.y;
  const oldDpr = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");
  // Restore
  renderer.setPixelRatio(oldDpr);
  renderer.setSize(oldW, oldH, false);
  camera.aspect = oldW / oldH;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return dataUrl;
}

/** Trigger a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Store a small thumbnail in the gallery (best-effort). */
export function savePhoto(monsterId: string, monsterName: string, fullDataUrl: string): void {
  // Make a thumbnail from full data url via canvas
  const img = new Image();
  img.onload = () => {
    try {
      const tn = document.createElement("canvas");
      tn.width = 256; tn.height = 256;
      const ctx = tn.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, 256, 256);
      const thumb = tn.toDataURL("image/jpeg", 0.7);
      const entry: PhotoEntry = {
        id: "ph_" + Math.random().toString(36).slice(2, 10),
        name: `${monsterName} ${new Date().toLocaleDateString()}`,
        monsterName, monsterId, dataUrl: thumb, takenAt: Date.now(),
      };
      const cur = loadGallery();
      cur.unshift(entry);
      const trimmed = cur.slice(0, MAX_PHOTOS);
      saveGallery(trimmed);
      if (trimmed.length >= 10) unlockAchievement("photographer");
    } catch { /* */ }
  };
  img.src = fullDataUrl;
}
