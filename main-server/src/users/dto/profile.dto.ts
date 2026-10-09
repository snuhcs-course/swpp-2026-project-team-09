// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-01 to 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #18 #38
import { User } from '../../generated/prisma/client.js';

export interface ProfileDto {
  name: string;
  department: string;
  admissionYear: number | null;
  hashtags: string[];
  friendId: string;
}

export function toProfileDto({ name, department, admissionYear, hashtags, friendId }: User): ProfileDto {
  return { name, department, admissionYear, hashtags, friendId };
}
