/**
 * Generates the launcher-icon and splash asset set for both mobile apps from
 * the single PRANOVA brand mark.
 *
 * Why this exists: a managed Expo app shows a blank white screen on launch if
 * `icon` and the `expo-splash-screen` plugin have no image to point at — as of
 * expo-splash-screen 58 the Android splash drawable is generated transparent
 * when no image is configured. These files are what the native launcher and the
 * native splash actually draw, so they must exist on disk and be committed;
 * they cannot be fetched at runtime.
 *
 * Source of truth is the brand mark the administrator uploaded (served as a
 * data URL by `GET /api/v1/app/config`), so the apps, the console and the
 * launcher icon all show the same thing. Re-run this after changing the logo:
 *
 *   node src/scripts/generate-app-assets.mjs                     # pulls from the API
 *   node src/scripts/generate-app-assets.mjs path/to/logo.png    # or a local file
 *
 * Everything here is plain Node (zlib only) on purpose: adding an image
 * toolchain as a build dependency for four static files is not worth it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_URL = process.env.ASSET_CONFIG_URL || 'http://127.0.0.1:5000/api/v1/app/config';

/** Brand fallbacks, used only if the API cannot be reached. */
const FALLBACK_BRAND = '#0f766e';

// ---------------------------------------------------------------- PNG decode

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG file');

  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(off + 8);
      height = buf.readUInt32BE(off + 12);
      bitDepth = buf[off + 16];
      colorType = buf[off + 17];
      interlace = buf[off + 20];
    } else if (type === 'IDAT') {
      idat.push(buf.subarray(off + 8, off + 8 + len));
    }
    off += 12 + len;
  }

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}; expected 8`);
  if (interlace !== 0) throw new Error('Interlaced PNG is not supported');

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  // Undo the per-scanline filters (PNG spec 9.2).
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 0xff;
    }
  }

  // Normalise everything to RGBA so the rest of the script has one shape.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++) {
    const s = i * channels;
    if (channels === 4) {
      rgba[j++] = out[s];
      rgba[j++] = out[s + 1];
      rgba[j++] = out[s + 2];
      rgba[j++] = out[s + 3];
    } else if (channels === 3) {
      rgba[j++] = out[s];
      rgba[j++] = out[s + 1];
      rgba[j++] = out[s + 2];
      rgba[j++] = 255;
    } else if (channels === 2) {
      rgba[j++] = out[s];
      rgba[j++] = out[s];
      rgba[j++] = out[s];
      rgba[j++] = out[s + 1];
    } else {
      rgba[j++] = out[s];
      rgba[j++] = out[s];
      rgba[j++] = out[s];
      rgba[j++] = 255;
    }
  }

  return { width, height, data: rgba };
}

// ---------------------------------------------------------------- PNG encode

function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none — these are small, flat images
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const chunk = (type, payload) => {
    const out = Buffer.alloc(payload.length + 12);
    out.writeUInt32BE(payload.length, 0);
    out.write(type, 4, 'ascii');
    payload.copy(out, 8);
    out.writeInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), payload])) | 0, payload.length + 8);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

// ---------------------------------------------------------------- composition

function blankCanvas(size, rgba) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return { width: size, height: size, data };
}

/** Bilinear sample of the source image, in normalised coordinates. */
function sample(img, u, v) {
  const x = Math.min(img.width - 1, Math.max(0, u * (img.width - 1)));
  const y = Math.min(img.height - 1, Math.max(0, v * (img.height - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(img.width - 1, x0 + 1);
  const y1 = Math.min(img.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;

  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const p00 = img.data[(y0 * img.width + x0) * 4 + c];
    const p10 = img.data[(y0 * img.width + x1) * 4 + c];
    const p01 = img.data[(y1 * img.width + x0) * 4 + c];
    const p11 = img.data[(y1 * img.width + x1) * 4 + c];
    out[c] = Math.round(
      p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy
    );
  }
  return out;
}

/** Draws `src` centred on `dst`, scaled so it occupies `scale` of the canvas. */
function drawCentred(dst, src, scale) {
  const box = Math.round(dst.width * scale);
  const originX = Math.round((dst.width - box) / 2);
  const originY = Math.round((dst.height - box) / 2);

  for (let y = 0; y < box; y++) {
    for (let x = 0; x < box; x++) {
      const [r, g, b, a] = sample(src, x / (box - 1), y / (box - 1));
      if (a === 0) continue;
      const di = ((originY + y) * dst.width + originX + x) * 4;
      const alpha = a / 255;
      // Source-over composite onto whatever the canvas already holds.
      dst.data[di] = Math.round(r * alpha + dst.data[di] * (1 - alpha));
      dst.data[di + 1] = Math.round(g * alpha + dst.data[di + 1] * (1 - alpha));
      dst.data[di + 2] = Math.round(b * alpha + dst.data[di + 2] * (1 - alpha));
      dst.data[di + 3] = Math.max(dst.data[di + 3], a);
    }
  }
  return dst;
}

/**
 * Isolates the light-coloured glyph inside the mark as a white-on-transparent
 * image. Android 13+ themed icons need a monochrome layer, and a full-bleed
 * brand icon reads better as "glyph on brand colour" than as "small circle".
 */
function extractGlyph(img) {
  const out = Buffer.alloc(img.data.length);
  for (let i = 0; i < img.width * img.height; i++) {
    const r = img.data[i * 4];
    const g = img.data[i * 4 + 1];
    const b = img.data[i * 4 + 2];
    const a = img.data[i * 4 + 3];
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const isGlyph = a > 24 && luma > 0.62;
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = isGlyph ? a : 0;
  }
  return { width: img.width, height: img.height, data: out };
}

/** Tight bounding box of everything non-transparent, as normalised insets. */
function trim(img) {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return img;

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    img.data.copy(
      data,
      y * w * 4,
      ((minY + y) * img.width + minX) * 4,
      ((minY + y) * img.width + minX + w) * 4
    );
  }
  return { width: w, height: h, data };
}

function hexToRgb(hex) {
  const h = (hex || FALLBACK_BRAND).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

// ---------------------------------------------------------------- the assets

async function loadBrand() {
  const fileArg = process.argv[2];
  if (fileArg) {
    console.log(`[assets] brand mark: ${fileArg}`);
    return { logo: decodePng(readFileSync(fileArg)), primaryColor: FALLBACK_BRAND };
  }

  try {
    const res = await fetch(CONFIG_URL, { signal: AbortSignal.timeout(10_000) });
    const body = await res.json();
    const cfg = body?.data ?? {};
    const match = String(cfg.logoUrl || '').match(/^data:image\/png;base64,(.*)$/);
    if (!match) throw new Error('configured logo is not an inline PNG');
    console.log(`[assets] brand mark: ${CONFIG_URL} (${cfg.appName || 'PRANOVA'})`);
    return {
      logo: decodePng(Buffer.from(match[1], 'base64')),
      primaryColor: cfg.primaryColor || FALLBACK_BRAND,
    };
  } catch (err) {
    throw new Error(
      `Could not read the brand mark from ${CONFIG_URL} (${err.message}). ` +
        'Start the API, or pass a PNG path as the first argument.'
    );
  }
}

async function main() {
  const { logo, primaryColor } = await loadBrand();
  const brand = hexToRgb(primaryColor);
  const mark = trim(logo);
  const glyph = trim(extractGlyph(logo));

  console.log(`[assets] source ${logo.width}x${logo.height}, brand ${primaryColor}`);

  const targets = ['patient-app', 'care-manager-app'];

  for (const app of targets) {
    const dir = join(ROOT, app, 'assets');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const write = (name, img) => {
      writeFileSync(join(dir, name), encodePng(img));
      console.log(`[assets] ${app}/assets/${name}  ${img.width}x${img.height}`);
    };

    // Launcher icon (iOS + Android legacy): full-bleed brand colour with the
    // white glyph. iOS forbids transparency and applies its own corner mask,
    // so the canvas is opaque and the artwork is inset from the edges.
    write('icon.png', drawCentred(blankCanvas(1024, [...brand, 255]), glyph, 0.56));

    // Android adaptive icon foreground: transparent, artwork kept inside the
    // 66% safe zone so no mask (circle, squircle, teardrop) can clip it.
    write('adaptive-icon.png', drawCentred(blankCanvas(1024, [0, 0, 0, 0]), glyph, 0.45));

    // Android 13+ themed icon: the same glyph, which the system recolours.
    write('monochrome-icon.png', drawCentred(blankCanvas(1024, [0, 0, 0, 0]), glyph, 0.45));

    // Native splash artwork: the full mark on transparency, so it sits on the
    // configured background in both light and dark.
    write('splash-icon.png', drawCentred(blankCanvas(512, [0, 0, 0, 0]), mark, 0.92));

    // Web favicon.
    write('favicon.png', drawCentred(blankCanvas(64, [...brand, 255]), glyph, 0.6));
  }

  console.log('\n[assets] done. These are native assets: rebuild the apps to see them');
  console.log('[assets] (npx expo run:android / eas build) — Expo Go shows its own icon.');
}

main().catch((err) => {
  console.error(`[assets] ${err.message}`);
  process.exit(1);
});
