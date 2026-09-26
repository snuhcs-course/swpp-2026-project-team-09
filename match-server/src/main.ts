import 'reflect-metadata';
import { Controller, Inject, Get, Post, Delete, Body, Param, Headers, Module, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import jwt,{JwtPayload} from 'jsonwebtoken';
import { MatchesService } from './modules/matches';
import { UUID } from './modules/rules';
function user(header?:string){
 if(!process.env.JWT_SECRET)throw new ServiceUnavailableException('JWT configuration required');
 try{if(!header?.startsWith('Bearer '))throw new Error();const c=jwt.verify(header.slice(7),process.env.JWT_SECRET,{algorithms:['HS256']}) as JwtPayload;if(!c.sub||!UUID.test(c.sub)||!Number.isInteger(c.exp)||!['student','admin'].includes(c.role))throw new Error();return c.sub;}catch{throw new UnauthorizedException('Valid bearer token required');}
}
@Controller()
class MatchesController {
 constructor(@Inject(MatchesService) private readonly matches:MatchesService){}
 @Get('health') async health(){const health=await this.matches.health();if(health.status!=='ok')throw new ServiceUnavailableException(health);return health;}
 @Get('v1/matches') list(@Headers('authorization') auth:string){return this.matches.list(user(auth));}
 @Post('v1/matches') create(@Headers('authorization') auth:string,@Body() body:unknown){return this.matches.create(user(auth),body);}
 @Delete('v1/matches/:id') cancel(@Headers('authorization') auth:string,@Param('id') id:string){return this.matches.cancel(user(auth),id);}
}
@Module({controllers:[MatchesController],providers:[MatchesService]})class AppModule{}
async function bootstrap(){const app=await NestFactory.create(AppModule);app.enableCors({origin:(process.env.CORS_ORIGINS||'').split(',').filter(Boolean)});app.enableShutdownHooks();await app.listen(Number(process.env.PORT||3004),'0.0.0.0');}
void bootstrap();
