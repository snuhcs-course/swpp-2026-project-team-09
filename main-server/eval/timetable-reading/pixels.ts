/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// P15-52: the small copy of a PNG screenshot as the native OCR module makes it (`SnuNowOcrModule.kt`: 330 wide,
// `Bitmap.createScaledBitmap` with filtering, which samples bilinearly), saved as
// `mobile/__tests__/fixtures/timetable-ocr/<name>.pixels.json` for the screenshots that have no saved ML Kit output,
// so that the app's tests run the pipeline's pixel half on them. 8-bit RGB or RGBA, not interlaced: what a phone
// saves. Run in main-server/: `node eval/timetable-reading/pixels.ts everytime-2 snutt-4 …`.

// A pixel (x, y) of the copy is (x × scale, y × scale) in the original (`OcrPixels` in native-ocr.ts).
interface OcrPixels {
  width: number;
  height: number;
  scale: number;
  rgba: string;
}

export interface Rgba {
  width: number;
  height: number;
  rgba: Uint8Array;
}

const SIGNATURE = '89504e470d0a1a0a';

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft;
}

// Undoes each row's filter in place: `data` holds the rows, each led by its filter byte.
function unfilter(data: Uint8Array, rowBytes: number, height: number, pixelBytes: number): Uint8Array {
  const out = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const filter = data[y * (rowBytes + 1)] ?? 0;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = data[y * (rowBytes + 1) + 1 + x] ?? 0;
      const left = x >= pixelBytes ? (out[y * rowBytes + x - pixelBytes] ?? 0) : 0;
      const up = y > 0 ? (out[(y - 1) * rowBytes + x] ?? 0) : 0;
      const upLeft = x >= pixelBytes && y > 0 ? (out[(y - 1) * rowBytes + x - pixelBytes] ?? 0) : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0;
      out[y * rowBytes + x] = (raw + predicted) & 0xff;
    }
  }
  return out;
}

export function decodePng(path: string): Rgba {
  const file = readFileSync(path);
  if (file.subarray(0, 8).toString('hex') !== SIGNATURE) {
    throw new Error(`${path}: not a PNG`);
  }
  let width = 0;
  let height = 0;
  let colourType = 0;
  const parts: Buffer[] = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at);
    const type = file.subarray(at + 4, at + 8).toString('ascii');
    const body = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colourType = body[9] ?? 0;
      if (body[8] !== 8 || body[12] !== 0 || (colourType !== 2 && colourType !== 6)) {
        throw new Error(`${path}: only 8-bit RGB or RGBA, not interlaced`);
      }
    } else if (type === 'IDAT') {
      parts.push(body);
    }
    at += 12 + length;
  }
  const pixelBytes = colourType === 6 ? 4 : 3;
  const rows = unfilter(inflateSync(Buffer.concat(parts)), width * pixelBytes, height, pixelBytes);
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    rgba[index * 4] = rows[index * pixelBytes] ?? 0;
    rgba[index * 4 + 1] = rows[index * pixelBytes + 1] ?? 0;
    rgba[index * 4 + 2] = rows[index * pixelBytes + 2] ?? 0;
    rgba[index * 4 + 3] = pixelBytes === 4 ? (rows[index * pixelBytes + 3] ?? 255) : 255;
  }
  return { width, height, rgba };
}

// The copy the native module returns: `width` wide (never up), the aspect kept, sampled bilinearly at each pixel's
// centre, in base64 as `OcrPixels`.
export function scaledPixels(image: Rgba, width = 330): OcrPixels {
  const outWidth = Math.min(width, image.width);
  const scale = image.width / outWidth;
  const outHeight = Math.round(image.height / scale);
  const out = new Uint8Array(outWidth * outHeight * 4);
  const at = (x: number, y: number, channel: number): number =>
    image.rgba[(Math.min(image.height - 1, y) * image.width + Math.min(image.width - 1, x)) * 4 + channel] ?? 0;
  for (let y = 0; y < outHeight; y += 1) {
    const sy = Math.max(0, (y + 0.5) * (image.height / outHeight) - 0.5);
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    for (let x = 0; x < outWidth; x += 1) {
      const sx = Math.max(0, (x + 0.5) * scale - 0.5);
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = at(x0, y0, channel) * (1 - fx) + at(x0 + 1, y0, channel) * fx;
        const bottom = at(x0, y0 + 1, channel) * (1 - fx) + at(x0 + 1, y0 + 1, channel) * fx;
        out[(y * outWidth + x) * 4 + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return { width: outWidth, height: outHeight, scale, rgba: Buffer.from(out).toString('base64') };
}

const FIXTURES = new URL('../../../mobile/__tests__/fixtures/timetable-ocr/', import.meta.url);

for (const name of process.argv.slice(2)) {
  const image = decodePng(new URL(`${name}.png`, FIXTURES).pathname);
  const saved = { width: image.width, height: image.height, pixels: scaledPixels(image) };
  writeFileSync(new URL(`${name}.pixels.json`, FIXTURES), `${JSON.stringify(saved)}\n`);
}
