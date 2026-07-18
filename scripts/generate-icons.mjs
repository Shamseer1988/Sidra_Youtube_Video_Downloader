// Generates PWA PNG icons (gradient tile + play glyph) with zero deps.
// Run: node scripts/generate-icons.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("public/icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// CRC32 for PNG chunks
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Colors
const A = [0x5b, 0x7c, 0xfa]; // accent blue
const B = [0x8b, 0x5c, 0xf6]; // accent purple
const C = [0xe5, 0x09, 0x14]; // accent red hint

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const s1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const s2 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
  const s3 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}

function makeIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const r = maskable ? 0 : Math.round(size * 0.22); // corner radius
  // play triangle (slightly right of center for optical balance)
  const pad = maskable ? 0.12 : 0; // maskable: keep glyph in safe zone
  const ax = size * (0.395 + pad * 0.3), ay = size * (0.3 + pad);
  const bx = ax, by = size * (0.7 - pad);
  const cx = size * (0.72 - pad * 0.5), cy = size * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-corner alpha
      let alpha = 255;
      if (r > 0) {
        const nx = Math.max(r - x, x - (size - 1 - r), 0);
        const ny = Math.max(r - y, y - (size - 1 - r), 0);
        if (nx > 0 && ny > 0) {
          const d = Math.hypot(nx, ny);
          if (d > r) alpha = Math.max(0, 255 - (d - r) * 255);
        }
      }
      // diagonal gradient A→B with a red glow bottom-right
      const t = (x + y) / (2 * size - 2);
      let cr = A[0] + (B[0] - A[0]) * t;
      let cg = A[1] + (B[1] - A[1]) * t;
      let cb = A[2] + (B[2] - A[2]) * t;
      const gd = Math.hypot(x - size * 0.92, y - size * 0.95) / size;
      const glow = Math.max(0, 1 - gd * 1.6) * 0.35;
      cr = cr + (C[0] - cr) * glow;
      cg = cg + (C[1] - cg) * glow;
      cb = cb + (C[2] - cb) * glow;
      // white play glyph
      if (pointInTriangle(x + 0.5, y + 0.5, ax, ay, bx, by, cx, cy)) {
        cr = cg = cb = 255;
      }
      buf[i] = Math.round(cr);
      buf[i + 1] = Math.round(cg);
      buf[i + 2] = Math.round(cb);
      buf[i + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, size, buf);
}

fs.writeFileSync(path.join(OUT_DIR, "icon-192.png"), makeIcon(192));
fs.writeFileSync(path.join(OUT_DIR, "icon-512.png"), makeIcon(512));
fs.writeFileSync(path.join(OUT_DIR, "icon-512-maskable.png"), makeIcon(512, { maskable: true }));
fs.writeFileSync(path.join(OUT_DIR, "apple-touch-icon.png"), makeIcon(180, { maskable: true }));
console.log("icons written to", OUT_DIR);
