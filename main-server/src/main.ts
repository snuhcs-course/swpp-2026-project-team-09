import "reflect-metadata";
import { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { AppModule, Errors } from "./modules/http";
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser("json", { limit: 3 * 1024 * 1024 });
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: false,
  });
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT) || 3000, "0.0.0.0");
}
void main();
