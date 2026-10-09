// AI-generated with Claude Opus 5.5, 2026-10-03, prompted by fyoon46, reviewed by TaeHyun79 in #32
import { Place } from '../../generated/prisma/client.js';

export interface PlaceDto {
  id: string;
  // Such as `302` or `25-1`. A Place such as 자하연 has none.
  number: string | null;
  name: string;
  latitude: number;
  longitude: number;
}

export function toPlaceDto({ id, number, name, latitude, longitude }: Place): PlaceDto {
  return { id, number, name, latitude, longitude };
}
