import 'reflect-metadata';
import { Controller, Inject, Get, Post, Param, Query, Headers, Module, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { FeedsService } from './modules/feeds';
function internal(key?:string) { const expected=process.env.INTERNAL_API_KEY; if(!key || !expected || Buffer.byteLength(key)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(key),Buffer.from(expected))) throw new UnauthorizedException('Internal authentication required'); }
@Controller()
class FeedsController {
  constructor(@Inject(FeedsService) private readonly feeds:FeedsService) {}
  @Get('health') health() { const health=this.feeds.health();if(health.status!=='ok')throw new ServiceUnavailableException(health);return health; }
  @Get('v1/campus/meals') meals(@Headers('x-internal-key') key:string,@Query('date') date?:string) {internal(key);return this.feeds.meals(date);}
  @Get('v1/campus/shuttle') shuttle(@Headers('x-internal-key') key:string,@Query('routeId') route?:string) {internal(key);return this.feeds.shuttle(route);}
  @Get('v1/internal/integrations') status(@Headers('x-internal-key') key:string) {internal(key);return this.feeds.status();}
  @Post('v1/internal/integrations/:source/refresh') refresh(@Headers('x-internal-key') key:string,@Param('source') source:string) {internal(key);return this.feeds.refresh(source,true);}
}
@Module({controllers:[FeedsController],providers:[FeedsService]}) class AppModule {}
async function bootstrap() { const app=await NestFactory.create(AppModule);app.enableShutdownHooks();await app.listen(Number(process.env.PORT||3003),'0.0.0.0'); }
void bootstrap();
