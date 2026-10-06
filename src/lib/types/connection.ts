export type ConnectionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'REMOVED';

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ConnectionWithUser extends Connection {
  connectedUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}
