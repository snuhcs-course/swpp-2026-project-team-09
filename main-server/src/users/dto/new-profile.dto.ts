import { z } from 'zod';
import { departmentSchema, nameSchema } from './update-profile.dto.js';

// What a new account signs in with, from the app's onboarding.
export const newProfileSchema = z.object({
  name: nameSchema,
  department: departmentSchema,
});

export type NewProfileDto = z.infer<typeof newProfileSchema>;

export interface ProfileSuggestionDto {
  name: string | null;
  department: string | null;
}
