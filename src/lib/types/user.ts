export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: Date;
}

export interface UserProfile extends User {
  bio?: string | null;
  connectionsCount?: number;
  activitiesCount?: number;
}
