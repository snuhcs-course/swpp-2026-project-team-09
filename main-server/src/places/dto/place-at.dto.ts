// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #36
import { z } from 'zod';
import { latitudeQuerySchema, longitudeQuerySchema } from '../../common/degrees-query.js';
import { PlaceDto } from './place.dto.js';

export const positionQuerySchema = z.object({ latitude: latitudeQuerySchema, longitude: longitudeQuerySchema });

export type PlaceAtDto = { place: PlaceDto; relation: 'inside' | 'near' } | { place: null; relation: 'none' };
