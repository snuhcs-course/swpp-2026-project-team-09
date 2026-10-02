import { Building } from '../../generated/prisma/client.js';

export interface BuildingDto {
  id: string;
  // Such as `302` or `25-1`. A place such as 자하연 has none.
  number: string | null;
  name: string;
  latitude: number;
  longitude: number;
}

export function toBuildingDto({ id, number, name, latitude, longitude }: Building): BuildingDto {
  return { id, number, name, latitude, longitude };
}
