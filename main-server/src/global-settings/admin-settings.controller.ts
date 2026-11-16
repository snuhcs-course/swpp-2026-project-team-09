/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { CurrentAdministrator, type SignedInAdministrator } from '../common/current-administrator.decorator.js';
import { type SaveSettingDto, saveSettingSchema } from './dto/admin-settings.dto.js';
import { type AdministratorSettingRow, GlobalSettings, type SettingChangeRow } from './global-settings.service.js';
import { SettingRefused } from './setting-refused.js';

// The admin site's Settings page (README.md: Global settings). Any Administrator may change any setting.
@AdministratorOnly()
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: GlobalSettings) {}

  @Get()
  list(): Promise<AdministratorSettingRow[]> {
    return this.settings.forAdministrators();
  }

  @Get('history')
  history(): Promise<SettingChangeRow[]> {
    return this.settings.history();
  }

  // A refused save answers 400 with the reason as its message.
  @Put(':name')
  async save(
    @Param('name') name: string,
    @Body({ schema: saveSettingSchema }) { value }: SaveSettingDto,
    @CurrentAdministrator() administrator: SignedInAdministrator,
  ): Promise<{ appliesAt: Date }> {
    try {
      return await this.settings.save(name, value, administrator.id);
    } catch (error) {
      if (error instanceof SettingRefused) {
        throw new BadRequestException(error.reason);
      }
      throw error;
    }
  }
}
