import { Module } from '@nestjs/common';
import { AdministratorsController } from './administrators.controller.js';
import { AdministratorsService } from './administrators.service.js';

@Module({
  controllers: [AdministratorsController],
  providers: [AdministratorsService],
  exports: [AdministratorsService],
})
export class AdministratorsModule {}
