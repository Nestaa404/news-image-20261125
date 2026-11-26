// The World in One Day — Wednesday 25 November 2026
// make.fun news-image-20261125. Draws the whole front page from scratch:
// a tiny RGB canvas, a hand-written PNG encoder (zlib, stdlib only),
// a 5x7 bitmap font defined below, and the day's news hard-coded from
// the research dossier. No network, no clock, no randomness:
// two runs write byte-identical files.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [248, 243, 230];
const INK = [20, 20, 20];
const RED = [178, 38, 30];
const BLUE = [29, 78, 137];
const GOLD = [176, 124, 18];
const TEAL = [18, 110, 105];
const LIGHT = [232, 224, 205];
const MIDGREY = [120, 112, 96];
const WHITE = [255, 255, 255];
const SKY = [178, 208, 224];
const LAND = [214, 196, 150];
const ORANGE = [224, 122, 26];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
function fill(c: number[]) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}
function dot(x: number, y: number, c: number[]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) dot(i, j, c);
}
function hline(x: number, y: number, w: number, c: number[], t = 1) {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: number[], t = 1) {
  rect(x, y, t, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    dot(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function disc(cx: number, cy: number, r: number, c: number[]) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) dot(cx + x, cy + y, c);
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]) {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) dot(x, y, c);
    }
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------- 5x7 bitmap font
// Every glyph is 7 rows of 5 bits, written here by hand. "1" = ink.
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "\u2022": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
};
const BLANK = FONT[" "];

// ---------------------------------------------------------------- text
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawChar(x: number, y: number, ch: string, scale: number, c: number[]) {
  const g = FONT[ch] ?? BLANK;
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if (g[r][col] === "1")
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            dot(x + col * scale + dx, y + r * scale + dy, c);
}
function drawText(x: number, y: number, s: string, scale: number, c: number[], bold = false) {
  let cx = x;
  for (const ch of s) {
    drawChar(cx, y, ch, scale, c);
    if (bold) drawChar(cx + 1, y, ch, scale, c);
    cx += 6 * scale;
  }
  return cx;
}
function drawTextCenter(x: number, y: number, w: number, s: string, scale: number, c: number[], bold = false) {
  drawText(x + Math.floor((w - textWidth(s, scale)) / 2), y, s, scale, c, bold);
}
// Word-wrap into lines no wider than maxW (in px). Returns the lines.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, scale) <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawLines(x: number, y: number, lines: string[], scale: number, c: number[], pitch: number, bold = false) {
  let cy = y;
  for (const ln of lines) { drawText(x, cy, ln, scale, c, bold); cy += pitch; }
  return cy;
}
// Small source badge: coloured block + tiny label.
function badge(x: number, y: number, label: string, c: number[]) {
  const w = textWidth(label, 1) + 8;
  rect(x, y, w, 11, c);
  drawText(x + 4, y + 2, label, 1, WHITE);
  return w;
}

// ------------------------------------------------------- lead illustrations
// 1 — tanker on fire in the strait: sea, hull, flame, smoke.
function illoTanker(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY);
  disc(x + 22, y + 12, 7, [255, 236, 160]);
  rect(x, y + h - 16, w, 16, BLUE);
  // burning tanker, left
  rect(x + 24, y + h - 32, 120, 12, INK);
  rect(x + 40, y + h - 44, 22, 12, RED);
  tri(x + 46, y + h - 44, x + 52, y + 6, x + 60, y + h - 44, ORANGE);
  tri(x + 50, y + h - 44, x + 54, y + 18, x + 58, y + h - 44, RED);
  disc(x + 52, y + 4, 5, MIDGREY);
  disc(x + 62, y + 2, 4, MIDGREY);
  rect(x + 118, y + h - 44, 8, 12, INK); // funnel
  // second tanker, right, also alight
  rect(x + w - 96, y + h - 32, 80, 12, INK);
  tri(x + w - 70, y + h - 32, x + w - 62, y + 14, x + w - 54, y + h - 32, ORANGE);
  tri(x + w - 66, y + h - 32, x + w - 62, y + 22, x + w - 58, y + h - 32, RED);
  drawText(x + 8, y + h - 13, "HORMUZ", 1, WHITE);
}
// 2 — market chart: plunge then late comeback above 50,000.
function illoChart(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, WHITE);
  rect(x, y, w, h, INK); // placeholder border repainted below
  rect(x + 2, y + 2, w - 4, h - 4, [238, 240, 244]);
  const base = y + h - 12;
  line(x + 8, y + 8, x + 8, base, INK);
  line(x + 8, base, x + w - 8, base, INK);
  // dashed 50,000 line
  for (let i = x + 10; i < x + w - 10; i += 8) hline(i, y + 16, 5, GOLD, 2);
  drawText(x + 12, y + 18, "50,000", 1, GOLD);
  const pts: [number, number][] = [
    [14, 26], [40, 30], [70, 44], [100, 40], [130, 52], [160, 46],
    [190, 30], [220, 20], [250, 12], [280, 10],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    line(x + ax, y + ay, x + bx, y + by, i < 4 ? RED : TEAL);
    line(x + ax, y + ay + 1, x + bx, y + by + 1, i < 4 ? RED : TEAL);
  }
  for (const [pxx, pyy] of pts) disc(x + pxx, y + pyy, 3, INK);
  drawText(x + w - 62, y + h - 11, "DOW +0.33%", 1, TEAL);
}
// 3 — Shenzhou launch: rocket, flame, orbit ring, stars.
function illoRocket(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [16, 28, 52]);
  for (const [sx, sy] of [[14, 10], [60, 6], [110, 14], [180, 8], [240, 12], [280, 20], [30, 34], [200, 30]] as const)
    disc(x + sx, y + sy, 1, WHITE);
  // orbit ellipse (drawn as a wide ring of dots)
  for (let a = 0; a < 360; a += 4) {
    const rad = (a * Math.PI) / 180;
    dot(x + 150 + Math.round(120 * Math.cos(rad)), y + 26 + Math.round(10 * Math.sin(rad)), GOLD);
  }
  disc(x + 262, y + 22, 6, GOLD); // Tiangong
  rect(x + 140, y + 12, 18, 26, WHITE);
  tri(x + 140, y + 12, x + 149, y + 2, x + 158, y + 12, RED);
  rect(x + 136, y + 30, 6, 10, RED);
  rect(x + 156, y + 30, 6, 10, RED);
  tri(x + 143, y + 38, x + 149, y + 52, x + 155, y + 38, ORANGE);
  tri(x + 146, y + 38, x + 149, y + 46, x + 152, y + 38, [255, 236, 160]);
  drawText(x + 8, y + h - 11, "SHENZHOU-24  00:18 UTC", 1, WHITE);
}
// World map: simplified continents as blocks on a blue sea, red dots.
function drawMap(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [198, 222, 235]);
  // landmasses (very simplified shapes, equirectangular-ish)
  const land = (lx: number, ly: number, lw: number, lh: number) => rect(x + lx, y + ly, lw, lh, LAND);
  land(30, 18, 120, 34);   // North America
  land(150, 22, 60, 26);   // Greenland-ish / north Atlantic
  land(200, 55, 46, 34);   // South America
  land(420, 14, 90, 30);   // Europe
  land(430, 48, 70, 42);   // Africa
  land(520, 10, 150, 44);  // Asia north
  land(560, 56, 90, 34);   // Asia south / SE Asia
  land(700, 78, 60, 26);   // Australia
  // graticule
  for (let gx = x + 100; gx < x + w; gx += 100) vline(gx, y, h, [255, 255, 255], 1);
  for (let gy = y + 22; gy < y + h; gy += 22) hline(x, gy, w, [255, 255, 255], 1);
  // story dots: [lon -180..180, lat -60..80] -> x,y
  // (a few plotted positions are nudged a few degrees so neighbouring
  // dots do not overlap on this small schematic map)
  const dots: [number, number, string][] = [
    [56.3, 26.6, "1"], [50.2, 26.6, "1"], [-79, 38.9, "2"], [-72, 40.7, "2"],
    [98.5, 39.7, "3"], [35.8, 31.5, "4"], [30.7, 46.5, "5"], [34.4, 11.8, "6"],
    [29.0, 30.0, "7"], [-75.5, 10.4, "8"], [-68, 42.5, "9"], [149.1, -35.3, "10"],
    [160, -9.4, "10"], [-97.7, 30.5, "11"], [13.4, 52.5, "12"], [3.1, 50.6, "13"],
  ];
  for (const [lon, lat, n] of dots) {
    const dx = x + Math.round(((lon + 180) / 360) * w);
    const dy = y + Math.round(((80 - lat) / 140) * h);
    disc(dx, dy, 5, RED);
    drawText(dx - 3, dy - 3, n, 1, WHITE);
  }
}

// ---------------------------------------------------------------- content
// All facts below come from the 25 Nov 2026 research dossier only.
const MX = 20; // side margin
function need(cond: boolean, msg: string) {
  if (!cond) throw new Error("layout overflow: " + msg);
}

const TIMELINE: [string, string][] = [
  ["00:18", "Shenzhou-24 launches with Pakistan's first astronaut aboard"],
  ["03:56", "Shenzhou-24 docks with Tiangong station"],
  ["06:30", "Colombia frees all 76 hostages in Cartagena supermarket raid"],
  ["13:30", "US Q3 GDP 4.3%; October PCE inflation 3.8%"],
  ["16:59", "Houthis claim attack on Ras Tanura refinery first reported"],
  ["17:30", "ESA publishes Hera images of Dimorphos crater"],
  ["21:00", "Markets close: Dow 50,182.95, S&P 7,182.78, Nasdaq 23,585.80"],
  ["22:00", "Cairo tanker fire death toll reported at 31"],
];

const BIG: [string, string][] = [
  ["50,182.95", "DOW CLOSE - 2ND STRAIGHT CLOSE ABOVE 50,000"],
  ["490,334", "RUSSIAN SOLDIERS KILLED SINCE 2022 (BBC, LEAKED DATA)"],
  ["$54.9bn", "DELL RECORD QUARTERLY REVENUE, UP 103%"],
  ["31", "KILLED IN CAIRO RING-ROAD TANKER FIRE (21 INJURED)"],
];

interface Lead { kicker: string; badge: string; bc: number[]; h1: string; h2: string; body: string; illo: number; }
const LEADS: Lead[] = [
  {
    kicker: "LEAD 1 - GULF ENERGY", badge: "REPORTED", bc: GOLD,
    h1: "Tankers ablaze in Hormuz",
    h2: "Houthis hit Saudi refinery",
    body: "Iran said two tankers hit mines and burned in the Strait of Hormuz. Houthis said they hit the Ras Tanura refinery. Riyadh said defences downed four drones.",
    illo: 1,
  },
  {
    kicker: "LEAD 2 - MARKETS", badge: "CONFIRMED", bc: TEAL,
    h1: "Dow claws back above 50,000",
    h2: "as tariffs jolt Wall Street",
    body: "Trump proposed new tariffs on 14 partners. Markets plunged, then the Dow closed up 0.33% at 50,182.95. US Q3 GDP was revised up to 4.3%.",
    illo: 2,
  },
  {
    kicker: "LEAD 3 - SPACE", badge: "OFFICIAL", bc: BLUE,
    h1: "China launches Pakistan's",
    h2: "first astronaut into orbit",
    body: "Shenzhou-24 lifted off at 00:18 UTC and docked at 03:56 UTC. Zeeshan Ali is the first Pakistani in orbit and the first foreign astronaut aboard Tiangong.",
    illo: 3,
  },
];

interface Mid { n: number; head: string; body: string; badge: string; bc: number[]; }
const MIDS: Mid[] = [
  { n: 1, head: "Hamas security chief killed", body: "Gaza officials said the strike killed Abuelouf, his wife and two children.", badge: "CONFIRMED", bc: TEAL },
  { n: 2, head: "Strikes hit Odesa and Kyiv", body: "Strikes hit Odesa and Kyiv. BBC: leaked data put Russian war dead at 490,334.", badge: "CONFIRMED", bc: TEAL },
  { n: 3, head: "RSF drone strikes kill 19", body: "RSF drones hit Damazin and Roseires in Blue Nile state, killing 19 civilians.", badge: "CONFIRMED", bc: TEAL },
  { n: 4, head: "Cairo tanker fire kills 31", body: "A fuel tanker overturned and exploded on the Giza ring road; 21 were injured.", badge: "OFFICIAL", bc: BLUE },
  { n: 5, head: "Colombia frees 76 hostages", body: "Troops stormed a Cartagena supermarket after a 17-hour siege; one captor died.", badge: "CONFIRMED", bc: TEAL },
  { n: 6, head: "Huawei convicted on 10 counts", body: "Brooklyn jury convicts Huawei on 10 of 12 counts, incl. trade-secret theft.", badge: "CONFIRMED", bc: TEAL },
  { n: 7, head: "Solomons base treaty signed", body: "Australia and the Solomons signed a treaty barring foreign military bases.", badge: "CONFIRMED", bc: TEAL },
  { n: 8, head: "Dell revenue hits $54.9bn", body: "Record revenue of $54.9bn, up 103%, with $22bn of AI servers; shares still fell.", badge: "CONFIRMED", bc: TEAL },
  { n: 9, head: "Dimorphos has stadium crater", body: "ESA images show Dimorphos flattened by NASA's 2022 DART impact; it now tumbles.", badge: "OFFICIAL", bc: BLUE },
  { n: 10, head: "Lille stun Bayern in Europe", body: "Lille beat Bayern 2-1; Liverpool won 3-0 at Club Brugge; Barcelona won 4-1.", badge: "CONFIRMED", bc: TEAL },
];

const ALSO: string[] = [
  "N. Korea expels Swiss envoy",
  "Judges: drop Netanyahu bribery case",
  "Pope decries COP31 failure",
  "Bangladesh raises garment wage 36%",
  "Macy's parade postponed by storm",
  "Iowa blast a 'huge success'",
  "Six die in Mississippi plane crash",
  "Duran Duran guitarist dies at 65",
  "New Miss Universe meets the press",
  "Ebola workers evacuated in Congo",
  "Lukoil assets sold to Boehly group",
  "Poundland collapses; 11,000 jobs",
  "Sinner out after knee surgery",
  "Abrego Garcia reaches Spain",
  "Peltola wins Alaska Senate race",
  "CIA and ODNI hit by cyber breach",
  "Ukraine seeks EUR 115bn for 2027",
  "Libya vows retaliation on Ukraine",
  "Merz warns of Russian escalation",
  "WHO urges end to Cuba fuel blockade",
  "Venice Biennale visitors' prizes",
  "US famine monitor to halt reporting",
];

// ---------------------------------------------------------------- layout
function draw() {
  fill(PAPER);
  rect(0, 0, W, 4, INK);

  // ---- masthead
  drawTextCenter(0, 10, W, "THE WORLD IN ONE DAY", 4, INK, true);
  drawTextCenter(0, 43, W, "WEDNESDAY 25 NOVEMBER 2026 - 35 STORIES", 2, RED, true);
  hline(MX, 62, W - 2 * MX, INK, 2);

  // ---- timeline strip (UTC)
  drawText(MX, 68, "TIMELINE - ALL TIMES UTC", 1, MIDGREY, true);
  const tlColW = Math.floor((W - 2 * MX - 3 * 12) / 4);
  TIMELINE.forEach(([t, ev], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = MX + col * (tlColW + 12);
    const y = 78 + row * 22;
    const lines = wrap(t + "  " + ev, tlColW, 1);
    need(lines.length <= 2, "timeline event " + t);
    drawLines(x, y, lines, 1, INK, 10);
    drawText(x, y, t, 1, RED, true);
  });
  hline(MX, 120, W - 2 * MX, INK, 1);

  // ---- big-number strip
  const bnColW = Math.floor((W - 2 * MX - 3 * 12) / 4);
  BIG.forEach(([num, label], i) => {
    const x = MX + i * (bnColW + 12);
    drawText(x, 126, num, 3, RED, true);
    const ll = wrap(label, bnColW, 1);
    need(ll.length <= 2, "big number label " + num);
    drawLines(x, 150, ll, 1, INK, 10);
  });
  hline(MX, 172, W - 2 * MX, INK, 2);

  // ---- three lead stories
  const leadW = 320;
  LEADS.forEach((L, i) => {
    const x = MX + i * (leadW + 12);
    drawText(x, 178, L.kicker, 1, INK, true);
    const bw = textWidth(L.badge, 1) + 8;
    badge(x + leadW - bw, 177, L.badge, L.bc);
    drawText(x, 190, L.h1, 2, INK, true);
    drawText(x, 207, L.h2, 2, INK, true);
    if (L.illo === 1) illoTanker(x, 227, leadW, 54);
    else if (L.illo === 2) illoChart(x, 227, leadW, 54);
    else illoRocket(x, 227, leadW, 54);
    const bl = wrap(L.body, leadW, 2);
    need(bl.length <= 7, "lead " + (i + 1) + " body too long: " + bl.length);
    drawLines(x, 287, bl, 2, INK, 17);
    if (i < 2) vline(x + leadW + 6, 178, 226, LIGHT, 2);
  });

  // ---- middle stories, numbered, two columns
  drawText(MX, 410, "THE DAY IN BRIEF - 10 MORE STORIES", 2, INK, true);
  hline(MX, 426, W - 2 * MX, INK, 1);
  const midW = 482;
  MIDS.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MX + col * (midW + 20);
    const y = 430 + row * 57;
    const num = m.n + ". ";
    drawText(x, y, num, 2, RED, true);
    const hx = x + textWidth(num, 2);
    const bw = textWidth(m.badge, 1) + 8;
    need(textWidth(m.head, 2) + m.head.length + bw + 8 <= midW - textWidth(num, 2),
      "mid " + m.n + " headline too wide");
    drawText(hx, y, m.head, 2, INK, true);
    badge(x + midW - bw, y + 1, m.badge, m.bc);
    const bl = wrap(m.body, midW, 2);
    need(bl.length <= 2, "mid " + m.n + " body too long: " + bl.length);
    drawLines(x, y + 17, bl, 2, INK, 17);
  });
  hline(MX, 715, W - 2 * MX, INK, 1);

  // ---- world map
  drawText(MX, 721, "WHERE IT HAPPENED: 1 GULF  2 WALL ST  3 TIANGONG  4 GAZA  5 UKRAINE  6 SUDAN  7 CAIRO  8 CARTAGENA  9 NEW YORK  10 PACIFIC  11 TEXAS  12 BERLIN  13 EUROPE", 1, MIDGREY, true);
  drawMap(MX, 732, W - 2 * MX, 76);

  // ---- ALSO list, numbered, two columns, generous 15px pitch (NI24 fix)
  drawText(MX, 814, "ALSO ON WEDNESDAY - 22 MORE", 2, INK, true);
  hline(MX, 830, W - 2 * MX, INK, 1);
  ALSO.forEach((a, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MX + col * (midW + 20);
    const y = 836 + row * 15;
    const s = (i + 1) + ". " + a;
    need(textWidth(s, 2) <= midW, "also item too wide: " + s);
    drawText(x, y, s, 2, INK);
  });

  // ---- footer: date check + sources
  hline(MX, 1000, W - 2 * MX, INK, 1);
  drawText(MX, 1005, "DATE CHECK: Every story above happened, or was first reported, on Wednesday 25 November 2026.", 1, INK, true);
  drawText(MX, 1015, "SOURCES: REUTERS - AP - BBC - AFP - NYT - ESA - BEA - CMSA - DELL - US DEPT. OF JUSTICE", 1, MIDGREY);
}

// ---------------------------------------------------------------- entry
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
draw();
const buf = encodePNG();
writeFileSync(outDir + "/entry.png", buf);
console.log("wrote " + outDir + "/entry.png " + buf.length + " bytes");
