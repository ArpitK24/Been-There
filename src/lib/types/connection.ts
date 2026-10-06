export type ConnectionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'REMOVED';

export type RelationshipState =
  | 'NO_CONNECTION'
  | 'OUTGOING_PENDING'
  | 'INCOMING_PENDING'
  | 'CONNECTED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'SELF';

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ConnectedUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ConnectionWithUser extends Connection {
  connectedUser: ConnectedUserProfile;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  connectionState: RelationshipState;
  connectionId?: string | null;
}

export interface IncomingConnectionRequest {
  id: string;
  requester: ConnectedUserProfile;
  createdAt: Date;
}

export interface OutgoingConnectionRequest {
  id: string;
  recipient: ConnectedUserProfile;
  createdAt: Date;
}

