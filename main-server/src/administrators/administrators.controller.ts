import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { AdministratorsService } from './administrators.service.js';
import { AdministratorDto, toAdministratorDto } from './dto/administrator.dto.js';
import { type RegisterAdministratorDto, registerAdministratorSchema } from './dto/register-administrator.dto.js';

@AdministratorOnly()
@Controller('admin/administrators')
export class AdministratorsController {
  constructor(private readonly administrators: AdministratorsService) {}

  @Get()
  async list(): Promise<AdministratorDto[]> {
    return (await this.administrators.list()).map((administrator) => toAdministratorDto(administrator));
  }

  // A repeat answers with the same record, so it needs no Idempotency-Key.
  @Post()
  async register(
    @Body({ schema: registerAdministratorSchema }) body: RegisterAdministratorDto,
  ): Promise<AdministratorDto> {
    return toAdministratorDto(await this.administrators.register(body.email));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.administrators.remove(id);
  }
}
