import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { ImageExtractionProxy } from "../src/modules/image-extractions";
const input = { kind: "event", mimeType: "image/png", imageBase64: "YWJj" };
const status = (n: number) => (e: any) => e.getStatus?.() === n;
test("image proxy validates requests, bounds responses and redacts internal errors", async () => {
  const original = globalThis.fetch,
    oldUrl = process.env.WORKER_URL,
    oldKey = process.env.INTERNAL_API_KEY;
  const proxy = new ImageExtractionProxy();
  try {
    delete process.env.WORKER_URL;
    await assert.rejects(proxy.extract(input), status(503));
    process.env.WORKER_URL = "http://worker:3003";
    process.env.INTERNAL_API_KEY = "fixture-key";
    for (const patch of [
      { owner: "x" },
      { imageBase64: "Zh==" },
      { imageBase64: "data:image/png;base64,YWJj" },
      { kind: "other" },
    ])
      await assert.rejects(proxy.extract({ ...input, ...patch }), status(400));
    await assert.rejects(
      proxy.extract({
        ...input,
        imageBase64: Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"),
      }),
      status(413),
    );
    globalThis.fetch = async (url, options) => {
      assert.equal(
        String(url),
        "http://worker:3003/v1/internal/image-extractions",
      );
      assert.equal((options?.headers as any)["x-internal-key"], "fixture-key");
      assert.equal(options?.redirect, "error");
      assert.deepEqual(JSON.parse(options?.body as string), input);
      return Response.json({
        kind: "event",
        model: "fixture",
        draft: { title: "draft" },
        warnings: [],
        durationMs: 2,
      });
    };
    assert.equal((await proxy.extract(input)).durationMs, 2);
    for (const [code, n] of [
      ["EXTRACTION_BUSY", 429],
      ["CONFIGURATION_REQUIRED", 503],
      ["EXTRACTION_TIMEOUT", 504],
      ["EXTRACTION_INVALID_OUTPUT", 502],
      ["UNKNOWN", 503],
    ] as const) {
      globalThis.fetch = async () =>
        Response.json(
          { code, message: "private host secret" },
          { status: 500 },
        );
      await assert.rejects(proxy.extract(input), (e: any) => {
        assert.equal(e.getStatus(), n);
        assert.ok(!JSON.stringify(e.getResponse()).includes("secret"));
        return true;
      });
    }
    globalThis.fetch = async () => new Response("x".repeat(140000));
    await assert.rejects(proxy.extract(input), status(502));
    globalThis.fetch = async () => {
      throw new DOMException("private host", "TimeoutError");
    };
    await assert.rejects(proxy.extract(input), status(504));
  } finally {
    globalThis.fetch = original;
    if (oldUrl === undefined) delete process.env.WORKER_URL;
    else process.env.WORKER_URL = oldUrl;
    if (oldKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = oldKey;
  }
});
test(
  "authenticated public image endpoint and JSON limit",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const { NestFactory } = require("@nestjs/core");
    const {
      AppModule,
      Errors,
      runtimeControllers,
      PublicController,
    } = require("../dist/modules/http");
    const { Database } = require("../dist/modules/database");
    const {
      ImageExtractionProxy: CompiledProxy,
    } = require("../dist/modules/image-extractions");
    process.env.JWT_SECRET = "image-fixture-only";
    const app = await NestFactory.create(AppModule, {
      logger: false,
      bodyParser: false,
    });
    app.useBodyParser("json", { limit: 3 * 1024 * 1024 });
    app.useGlobalFilters(new Errors());
    await app.listen(0, "127.0.0.1");
    const db = app.get(Database),
      id = randomUUID();
    let calls = 0;
    app.get(CompiledProxy).extract = async () => {
      calls++;
      return { kind: "event", draft: { title: "fixture" } };
    };
    try {
      await db.prisma.user.create({
        data: {
          id,
          google_sub: id,
          email: id + "@snu.ac.kr",
          display_name: "Fixture",
        },
      });
      const url = (await app.getUrl()) + "/v1/me/image-extractions";
      const send = (auth: string, body: any) =>
        fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: auth },
          body: JSON.stringify(body),
        });
      for (const auth of ["", "Bearer invalid"])
        assert.equal((await send(auth, input)).status, 401);
      assert.equal(calls, 0);
      const token =
        "Bearer " +
        jwt.sign({}, process.env.JWT_SECRET!, { subject: id, expiresIn: "1h" });
      assert.equal((await send(token, input)).status, 201);
      assert.equal(calls, 1);
      const large = await send(token, {
        imageBase64: "x".repeat(3 * 1024 * 1024),
      });
      assert.equal(large.status, 413);
      assert.equal(calls, 1);
      assert.ok(!runtimeControllers("admin").includes(PublicController));
    } finally {
      await db.prisma.user.delete({ where: { id } });
      await app.close();
    }
  },
);
