import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Building } from '../generated/prisma/client.js';
import { BuildingDto, toBuildingDto } from './dto/building.dto.js';

// `25-1` comes after `25` and before `26`, and Korean names in the order a User reads them.
const order = new Intl.Collator('ko', { numeric: true });

// By number, then the places without one by name.
function byNumber(a: Building, b: Building): number {
  if (a.number !== null && b.number !== null) {
    return order.compare(a.number, b.number);
  }
  if (a.number === null && b.number === null) {
    return order.compare(a.name, b.name);
  }
  return a.number === null ? 1 : -1;
}

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<BuildingDto[]> {
    const buildings = await this.prisma.building.findMany();
    return buildings.toSorted(byNumber).map((building) => toBuildingDto(building));
  }

  // By a part of the name, whatever the case of its Latin letters, or by the number, written with or without 동.
  async search(text: string): Promise<BuildingDto[]> {
    const part = text.toLowerCase();
    const number = text.replace(/동$/u, '');
    return (await this.list()).filter(
      (building) => building.name.toLowerCase().includes(part) || building.number === number,
    );
  }
}
