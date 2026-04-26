import { Injectable } from "@nestjs/common";

type ScoreInput = {
  hasEmail: boolean;
  hasPhone: boolean;
  hasLocationMatch: boolean;
  socialCount: number;
  keywordMatch: boolean;
  geoMatch: boolean;
};

@Injectable()
export class ScoringService {
  scoreBusiness(input: ScoreInput): number {
    let score = 0;
    if (input.hasEmail) score += 20;
    if (input.hasPhone) score += 20;
    if (input.hasLocationMatch) score += 15;
    if (input.socialCount > 0) score += 10;
    if (input.keywordMatch) score += 20;
    if (input.geoMatch) score += 15;
    return Math.max(0, Math.min(100, score));
  }
}
