/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { type Catalogue, CATALOGUE_FILE, readCatalogue } from '../assistant/library/catalogue.js';
import { PlacesModule } from '../places/places.module.js';
import { UsersModule } from '../users/users.module.js';
import { StudySpacesController } from './study-spaces.controller.js';
import { STUDY_CATALOGUE, StudySpacesService } from './study-spaces.service.js';

// The 공부공간 layer. Its files and 관정's catalogue are read once when the server starts; a bad file, or a building
// at a Place number the seed does not hold, stops the start.
@Module({
  imports: [PlacesModule, UsersModule],
  controllers: [StudySpacesController],
  providers: [
    { provide: STUDY_CATALOGUE, useFactory: (): Promise<Catalogue> => readCatalogue(CATALOGUE_FILE) },
    StudySpacesService,
  ],
})
export class StudySpacesModule {}
