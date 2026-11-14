/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type PlacePoint } from '../dto/answer.dto.js';

// A Place is called by its number, as the app calls it (301동), and otherwise by its name.
export const placeLabelOf = ({ number, name }: Pick<PlaceDto, 'number' | 'name'>): string =>
  number === null ? name : `${number}동`;

// How Places are called and where they are, for the words of a meal's answer and of a way.
export class PlaceNaming {
  constructor(private readonly placeOf: (placeId: string) => PlaceDto) {}

  placeLabel(placeId: string): string {
    return placeLabelOf(this.placeOf(placeId));
  }

  position(placeId: string): Position {
    const { latitude, longitude } = this.placeOf(placeId);
    return { latitude, longitude };
  }

  placePoint(placeId: string): PlacePoint {
    return this.labelledPoint(placeId, this.placeLabel(placeId));
  }

  labelledPoint(placeId: string, label: string): PlacePoint {
    return { placeId, label, ...this.position(placeId) };
  }
}
