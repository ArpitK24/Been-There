import { Visibility } from './activity';

export interface PrivacySetting {
  id: string;
  userId: string;
  activityDefaultVisibility: Visibility;
  hidePreciseLocations: boolean;
  hideExactTimestamps: boolean;
  updatedAt?: Date;
}
