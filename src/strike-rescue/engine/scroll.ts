// Vertical forced-scroll camera. World y increases downward. Level start is
// at the BOTTOM of the world (largest y). Player progresses by moving
// toward smaller y. Camera follows the player UP only — never down.

export interface ScrollCam {
  camY: number;
  screenH: number;
  screenW: number;
  anchor: number;
  minCamY: number;
  maxCamY: number;
}

export function makeCam(screenW: number, screenH: number, levelHeight: number): ScrollCam {
  const startCamY = levelHeight - screenH;
  return { camY: startCamY, screenH, screenW, anchor: 0.65, minCamY: 0, maxCamY: startCamY };
}

export function updateCam(cam: ScrollCam, playerY: number, dt: number) {
  const desiredCamY = playerY - cam.screenH * cam.anchor;
  if (desiredCamY < cam.camY) {
    const lerp = Math.min(1, dt * 6);
    cam.camY = Math.max(cam.minCamY, cam.camY + (desiredCamY - cam.camY) * lerp);
  }
  if (cam.camY < cam.minCamY) cam.camY = cam.minCamY;
  if (cam.camY > cam.maxCamY) cam.camY = cam.maxCamY;
}

export function clampPlayerY(cam: ScrollCam, y: number): number {
  const maxAllowed = cam.camY + cam.screenH * 0.92;
  return Math.min(y, maxAllowed);
}

export function worldToScreenY(cam: ScrollCam, worldY: number): number {
  return worldY - cam.camY;
}

export function progress(cam: ScrollCam, playerY: number, levelHeight: number): number {
  const start = levelHeight;
  const traveled = start - playerY;
  return Math.max(0, Math.min(1, traveled / start));
}
