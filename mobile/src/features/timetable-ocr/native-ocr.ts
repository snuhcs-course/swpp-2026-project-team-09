/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { requireOptionalNativeModule } from 'expo';

// The name the native OCR module registers under: `modules/snu-now-ocr`, ML Kit Text Recognition v2 with the Korean
// recogniser on Android and iOS.
export const NATIVE_OCR_MODULE = 'SnuNowOcr';

// A rectangle in the original image's pixels, from its top-left corner.
export interface OcrBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// One word of a line. `confidence` is between 0 and 1 on Android and null on iOS, whose ML Kit gives none.
export interface OcrElement {
  text: string;
  box: OcrBox;
  confidence: number | null;
}

export interface OcrLine {
  text: string;
  box: OcrBox;
  confidence: number | null;
  elements: OcrElement[];
}

// A copy of the image about 330 pixels wide, the aspect kept: RGBA bytes row by row from the top, in base64.
// A pixel (x, y) of the copy is (x × scale, y × scale) in the original.
export interface OcrPixels {
  width: number;
  height: number;
  scale: number;
  rgba: string;
}

// What the module returns for one image: its size, its text and its small copy.
export interface NativeOcrResult {
  width: number;
  height: number;
  lines: OcrLine[];
  pixels: OcrPixels;
}

export type OcrReading =
  | { kind: 'read'; result: NativeOcrResult }
  // The build has no native module: Expo Go, the web, the tests.
  | { kind: 'unavailable' }
  // The module could not open the image or ML Kit failed.
  | { kind: 'failed'; message: string };

interface NativeOcrModule {
  readImage(uri: string): Promise<NativeOcrResult>;
}

function nativeModule(): NativeOcrModule | null {
  return requireOptionalNativeModule<NativeOcrModule>(NATIVE_OCR_MODULE);
}

// Whether this build holds the native OCR module. Expo Go, the web and the tests do not.
export function hasNativeOcr(): boolean {
  return nativeModule() !== null;
}

// Reads the text of the image at `uri`, a `file://` or `content://` URI such as the image picker gives, on the phone.
export async function readImageText(uri: string): Promise<OcrReading> {
  const module = nativeModule();
  if (module === null) {
    return { kind: 'unavailable' };
  }
  try {
    return { kind: 'read', result: await module.readImage(uri) };
  } catch (error) {
    return { kind: 'failed', message: error instanceof Error ? error.message : String(error) };
  }
}
