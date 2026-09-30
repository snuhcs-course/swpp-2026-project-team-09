import { User } from '../../generated/prisma/client.js';

export interface ProfileDto {
  name: string | null;
  department: string | null;
  admissionYear: number | null;
  hashtags: string[];
}

export function toProfileDto({ name, department, admissionYear, hashtags }: User): ProfileDto {
  return { name, department, admissionYear, hashtags };
}
