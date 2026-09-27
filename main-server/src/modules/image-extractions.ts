import { HttpException, Injectable } from "@nestjs/common";
const errors: Record<string, { status: number; message: string }> = {
  INVALID_IMAGE: { status: 400, message: "Use a valid JPEG or PNG image" },
  IMAGE_TOO_LARGE: { status: 413, message: "Image must be at most 2 MiB" },
  REQUEST_TOO_LARGE: {
    status: 413,
    message: "JSON request must be at most 3 MiB",
  },
  EXTRACTION_BUSY: {
    status: 429,
    message: "Image extraction is already running; retry shortly",
  },
  CONFIGURATION_REQUIRED: {
    status: 503,
    message: "Local image extraction configuration required",
  },
  EXTRACTION_UNAVAILABLE: {
    status: 503,
    message: "Local image extraction is temporarily unavailable",
  },
  EXTRACTION_TIMEOUT: {
    status: 504,
    message: "Local image extraction timed out; try a smaller image",
  },
  EXTRACTION_INVALID_OUTPUT: {
    status: 502,
    message: "The local model returned an invalid draft; try a clearer image",
  },
};
function fail(code: string): never {
  const e = errors[code];
  throw new HttpException({ code, message: e.message }, e.status);
}
@Injectable()
export class ImageExtractionProxy {
  async extract(body: any) {
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).some(
        (k) => !["kind", "mimeType", "imageBase64"].includes(k),
      ) ||
      !["timetable", "event"].includes(body.kind) ||
      !["image/jpeg", "image/png"].includes(body.mimeType) ||
      typeof body.imageBase64 !== "string"
    )
      fail("INVALID_IMAGE");
    if (body.imageBase64.length > Math.ceil((2 * 1024 * 1024) / 3) * 4)
      fail("IMAGE_TOO_LARGE");
    if (
      !body.imageBase64.length ||
      body.imageBase64.length % 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(body.imageBase64)
    )
      fail("INVALID_IMAGE");
    const bytes = Buffer.from(body.imageBase64, "base64");
    if (bytes.length > 2 * 1024 * 1024) fail("IMAGE_TOO_LARGE");
    if (bytes.toString("base64") !== body.imageBase64) fail("INVALID_IMAGE");
    if (!process.env.WORKER_URL || !process.env.INTERNAL_API_KEY)
      fail("CONFIGURATION_REQUIRED");
    let url: URL;
    try {
      url = new URL("/v1/internal/image-extractions", process.env.WORKER_URL);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw Error();
    } catch {
      fail("CONFIGURATION_REQUIRED");
    }
    try {
      const response = await fetch(url!, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "x-internal-key": process.env.INTERNAL_API_KEY!,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(190000),
      });
      const reader = response.body?.getReader();
      if (!reader) throw Error();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 128 * 1024) {
          await reader.cancel();
          fail("EXTRACTION_INVALID_OUTPUT");
        }
        chunks.push(value);
      }
      let payload: any;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        fail("EXTRACTION_UNAVAILABLE");
      }
      if (!response.ok)
        fail(
          Object.hasOwn(errors, payload?.code)
            ? payload.code
            : "EXTRACTION_UNAVAILABLE",
        );
      if (
        payload?.kind !== body.kind ||
        typeof payload.model !== "string" ||
        payload.model.length > 200 ||
        !payload.draft ||
        typeof payload.draft !== "object" ||
        Array.isArray(payload.draft) ||
        !Array.isArray(payload.warnings) ||
        payload.warnings.length > 12 ||
        payload.warnings.some(
          (w: any) => typeof w !== "string" || w.length > 300,
        ) ||
        !Number.isFinite(payload.durationMs) ||
        payload.durationMs < 0
      )
        fail("EXTRACTION_INVALID_OUTPUT");
      return {
        kind: payload.kind,
        model: payload.model,
        draft: payload.draft,
        warnings: payload.warnings,
        durationMs: payload.durationMs,
      };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (
        (e as Error)?.name === "TimeoutError" ||
        (e as Error)?.name === "AbortError"
      )
        fail("EXTRACTION_TIMEOUT");
      fail("EXTRACTION_UNAVAILABLE");
    }
  }
}
