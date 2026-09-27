import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  ImageExtractionsService,
  imageInput,
  validateOutput,
  DEFAULT_MODEL,
} from "../src/modules/image-extractions";
import { FeedsController } from "../src/main";
import { FeedsService } from "../src/modules/feeds";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const input = { kind: "event", mimeType: "image/png", imageBase64: png };
const draft = {
  title: "행사",
  description: "",
  startsAt: null,
  endsAt: null,
  locationName: null,
};
const status = (n: number) => (e: any) => e.getStatus?.() === n;
// Fixtures test the adapter, not real model extraction accuracy.
const response = () =>
  Response.json({
    done: true,
    message: {
      content: JSON.stringify({
        draft: {
          title: draft.title,
          description: draft.description,
          scheduleText: null,
          locationName: null,
        },
      }),
    },
  });
test("admission rejects malformed, oversized and mismatched images", () => {
  assert.deepEqual(imageInput(input), input);
  const big = Buffer.from(png, "base64");
  big.writeUInt32BE(4097, 16);
  for (const patch of [
    { owner: "x" },
    { imageBase64: "data:image/png;base64," + png },
    { imageBase64: png + "\n" },
    { imageBase64: "Zh==" },
    { mimeType: "image/jpeg" },
    { imageBase64: big.toString("base64") },
    {
      imageBase64: Buffer.from([255, 216, 255, 192, 255, 255]).toString(
        "base64",
      ),
      mimeType: "image/jpeg",
    },
  ])
    assert.throws(() => imageInput({ ...input, ...patch }), status(400));
  assert.throws(
    () =>
      imageInput({
        ...input,
        imageBase64: Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"),
      }),
    status(413),
  );
});
test("drafts preserve unknown dates and reject invalid calendars, ranges, overlap and invented fields", () => {
  assert.equal(
    validateOutput("event", { draft, warnings: [] }).draft.startsAt,
    null,
  );
  for (const patch of [
    { latitude: 37 },
    { startsAt: "2026-02-29T10:00:00+09:00" },
    { title: "x".repeat(201) },
    { startsAt: "2026-09-01T10:00:00Z", endsAt: "2026-09-01T09:00:00Z" },
  ])
    assert.throws(
      () =>
        validateOutput("event", {
          draft: { ...draft, ...patch },
          warnings: [],
        }),
      status(502),
    );
  const entry = {
    title: "수업",
    weekday: 1,
    startMinute: 540,
    endMinute: 600,
    locationName: null,
  };
  const timetable = {
    semesterStartsOn: null,
    semesterEndsOn: null,
    entries: [entry],
  };
  assert.equal(
    validateOutput("timetable", { draft: timetable, warnings: [] }).draft
      .entries.length,
    1,
  );
  for (const entries of [
    [{ ...entry, id: "invented" }],
    [{ ...entry, weekday: 8 }],
    [{ ...entry, endMinute: 1441 }],
    [entry, entry],
    Array(101).fill(entry),
  ])
    assert.throws(
      () =>
        validateOutput("timetable", {
          draft: { ...timetable, entries },
          warnings: [],
        }),
      status(502),
    );
});
test("local adapter pins model/options, rejects busy calls and releases lock on all failures", async () => {
  const original = globalThis.fetch,
    oldBase = process.env.OLLAMA_BASE_URL,
    oldModel = process.env.OLLAMA_MODEL;
  try {
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_BASE_URL;
    const service = new ImageExtractionsService();
    await assert.rejects(service.extract(input), status(503));
    for (const base of [
      "https://remote.example",
      "http://user:pass@localhost:11434",
    ]) {
      process.env.OLLAMA_BASE_URL = base;
      await assert.rejects(service.extract(input), status(503));
    }
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_MODEL = "cloud-model";
    await assert.rejects(service.extract(input), status(503));
    delete process.env.OLLAMA_MODEL;
    let release!: () => void;
    const pending = new Promise<void>((r) => (release = r));
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), "http://localhost:11434/api/chat");
      assert.equal(options?.redirect, "error");
      const b = JSON.parse(options?.body as string);
      assert.equal(b.model, DEFAULT_MODEL);
      assert.deepEqual(b.options, {
        temperature: 0,
        num_ctx: 8192,
        num_predict: 2000,
      });
      assert.equal(b.keep_alive, "5m");
      assert.equal(b.format.additionalProperties, false);
      assert.deepEqual(b.messages[1].images, [png]);
      await pending;
      return response();
    };
    const first = service.extract(input);
    await assert.rejects(service.extract(input), status(429));
    release();
    assert.equal((await first).draft.title, "행사");
    for (const fixture of [
      () => Response.json({ done: false }),
      () => new Response("secret error", { status: 500 }),
      () => new Response("missing", { status: 404 }),
      () => new Response("x".repeat(140000)),
      () => {
        throw new DOMException("secret host", "TimeoutError");
      },
    ]) {
      globalThis.fetch = async () => fixture();
      await assert.rejects(service.extract(input), (e: any) => {
        assert.ok([502, 503, 504].includes(e.getStatus()));
        assert.ok(!JSON.stringify(e.getResponse()).includes("secret"));
        return true;
      });
      globalThis.fetch = async () => response();
      assert.equal((await service.extract(input)).kind, "event");
    }
  } finally {
    globalThis.fetch = original;
    if (oldBase === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = oldBase;
    if (oldModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = oldModel;
  }
});
test("internal HTTP key and JSON limit guard inference", async () => {
  let calls = 0;
  @Module({
    controllers: [FeedsController],
    providers: [
      { provide: FeedsService, useValue: {} },
      {
        provide: ImageExtractionsService,
        useValue: {
          extract: () => {
            calls++;
            return { draft };
          },
        },
      },
    ],
  })
  class FixtureModule {}
  const old = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = "fixture-key";
  const app = await NestFactory.create<any>(FixtureModule, {
    logger: false,
    bodyParser: false,
  });
  app.useBodyParser("json", { limit: 3 * 1024 * 1024 });
  await app.listen(0, "127.0.0.1");
  try {
    const url = (await app.getUrl()) + "/v1/internal/image-extractions";
    for (const key of ["", "wrong"])
      assert.equal(
        (
          await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-internal-key": key,
            },
            body: JSON.stringify(input),
          })
        ).status,
        401,
      );
    assert.equal(calls, 0);
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-key": "fixture-key",
          },
          body: JSON.stringify(input),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-key": "fixture-key",
          },
          body: JSON.stringify({ imageBase64: "x".repeat(3 * 1024 * 1024) }),
        })
      ).status,
      413,
    );
    assert.equal(calls, 1);
  } finally {
    await app.close();
    if (old === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = old;
  }
});

test("model clock labels convert deterministically without accepting hour numbers", async () => {
  const { validateModelOutput } =
    await import("../src/modules/image-extractions");
  const entry = {
    title: "수업",
    weekday: "금",
    startTime: "09:30",
    endTime: "11:00",
    locationName: null,
  };
  const raw = (e: any) => ({
    draft: { semesterStartsOn: null, semesterEndsOn: null, entries: [e] },
  });
  const result = validateModelOutput("timetable", raw(entry));
  assert.equal(result.draft.entries[0].weekday, 5);
  assert.equal(result.draft.entries[0].startMinute, 570);
  assert.equal(result.draft.entries[0].endMinute, 660);
  for (const patch of [
    { weekday: 5 },
    { startTime: 9 },
    { startTime: "9:30" },
    { endTime: "24:30" },
    { startMinute: 9 },
  ])
    assert.throws(
      () => validateModelOutput("timetable", raw({ ...entry, ...patch })),
      status(502),
    );
});

test("event model transcribes literal schedules and cannot provide authoritative warnings", async () => {
  const { validateModelOutput, outputSchema } =
    await import("../src/modules/image-extractions");
  const schema = outputSchema("event");
  assert.deepEqual(schema.required, ["draft"]);
  assert.ok(schema.properties.draft.properties.scheduleText);
  assert.equal(schema.properties.draft.properties.startsAt, undefined);
  const raw = {
    draft: {
      title: "행사",
      description: "",
      scheduleText: "10월 6일 오후 6시",
      locationName: null,
    },
  };
  const result = validateModelOutput("event", raw);
  assert.equal(result.draft.startsAt, null);
  assert.equal(result.warnings.length, 2);
  assert.throws(
    () => validateModelOutput("event", { ...raw, warnings: ["model claim"] }),
    status(502),
  );
  assert.throws(
    () =>
      validateModelOutput("event", {
        draft: { ...raw.draft, startsAt: "2023-10-06T18:00:00+09:00" },
      }),
    status(502),
  );
});
