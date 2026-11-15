/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type Catalogue, statusOf } from '../assistant/library/catalogue.js';
import { cardSpace, type LibraryCardSpace } from '../assistant/library/library-card.js';
import { readSeedFile, SEED_DIRECTORY } from '../common/seed-directory.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { UsersService } from '../users/users.service.js';
import { type StudyBuildingDto, type StudySpaceDto } from './dto/study-spaces.dto.js';
import {
  DEPARTMENT_COLLEGES_FILE,
  type DepartmentColleges,
  departmentCollegesOf,
  departmentCollegesSchema,
  isUsable,
  problemsOf,
  type Standing,
  placedBuildings,
  type PlacedBuilding,
  STUDY_SPACES_FILE,
  studySpacesSchema,
} from './study-spaces-file.js';

// Injection token of 관정's catalogue, whose seat sectors 관정관's building lists.
export const STUDY_CATALOGUE = 'STUDY_CATALOGUE';

// The seat sectors of 관정관 a User of this 소속 may book online: 대학원 열람실 only for a 대학원생.
function seatSectors(catalogue: Catalogue, affiliation: Standing['affiliation']): LibraryCardSpace[] {
  return catalogue.spaces
    .filter((space) => space.unit === 'seat' && statusOf(space, affiliation) === 'implemented')
    .flatMap((space) => cardSpace(space, []) ?? []);
}

@Injectable()
export class StudySpacesService implements OnModuleInit {
  private buildings: PlacedBuilding[] = [];
  private table: DepartmentColleges = new Map();

  constructor(
    private readonly places: PlaceLookup,
    private readonly users: UsersService,
    @Inject(STUDY_CATALOGUE) private readonly catalogue: Catalogue,
  ) {}

  // PlacesModule is imported, so its Places are read before this runs.
  async onModuleInit(): Promise<void> {
    const file = await readSeedFile(SEED_DIRECTORY, STUDY_SPACES_FILE, studySpacesSchema);
    const table = departmentCollegesOf(
      await readSeedFile(SEED_DIRECTORY, DEPARTMENT_COLLEGES_FILE, departmentCollegesSchema),
    );
    const problems = problemsOf(file, table);
    if (problems.length > 0) {
      throw new Error(`${STUDY_SPACES_FILE} does not match: ${problems.join('; ')}`);
    }
    this.buildings = placedBuildings(file.buildings, (number) => this.places.numbered(number));
    this.table = table;
  }

  async listFor(userId: string): Promise<StudyBuildingDto[]> {
    const { department, affiliation } = await this.users.findById(userId);
    const standing: Standing = { department: department.trim(), affiliation };
    return this.buildings.map(({ at, name, liveSeats, spaces }) => {
      const served = spaces.map(({ key, name: spaceName, kind, hours, link, restriction }): StudySpaceDto => {
        const usable = isUsable(restriction, standing, this.table);
        return { key, name: spaceName, kind, hours, link, usable, restrictedTo: restriction?.label ?? null };
      });
      return {
        place: at,
        name,
        usable: served.some(({ usable }) => usable),
        liveSeats: liveSeats === 'kwanjeong' ? { sectors: seatSectors(this.catalogue, affiliation) } : null,
        spaces: served,
      };
    });
  }
}
