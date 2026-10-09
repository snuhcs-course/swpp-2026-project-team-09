/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ShuttleRoute, ShuttleStop, ShuttleVehicle } from '@/api/shuttle-types';
import { field, hasTexts, isNumber, isPoint, isText, listOf } from './answers';

// The checks of the main server's shuttle.

function isShuttleStop(value: unknown): value is ShuttleStop {
  return hasTexts(value, ['id', 'name']) && isNumber(field(value, 'latitude')) && isNumber(field(value, 'longitude'));
}

export function isShuttleRoute(value: unknown): value is ShuttleRoute {
  return (
    isText(field(value, 'serviceHours')) &&
    listOf(isShuttleStop)(field(value, 'stops')) &&
    listOf(isPoint)(field(value, 'line'))
  );
}

function isShuttleVehicle(value: unknown): value is ShuttleVehicle {
  return hasTexts(value, ['carId', 'receivedAt']) && isShuttleStop(field(value, 'stop'));
}

export const isShuttleVehicles = listOf(isShuttleVehicle);
