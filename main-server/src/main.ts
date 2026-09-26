import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule, Errors } from "./modules/http";
async function main() {
  const app = await NestFactory.create(AppModule);
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
