import 'reflect-metadata';
import { Controller, Inject, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RealtimeService } from './modules/realtime';
@Controller()
class HealthController { constructor(@Inject(RealtimeService) private readonly realtime: RealtimeService) {} @Get('health') health() { const health = this.realtime.health(); if (health.status !== 'ok') throw new ServiceUnavailableException(health); return health; } }
@Module({ controllers: [HealthController], providers: [RealtimeService] })
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.get(RealtimeService).attach(app.getHttpServer());
  await app.listen(Number(process.env.PORT || 3002), '0.0.0.0');
}
void bootstrap();
