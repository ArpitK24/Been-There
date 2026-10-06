export interface Place {
  id: string;
  provider: string;
  providerPlaceId: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  branch?: string | null;
  createdAt?: Date;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  category: string;
  address: string;
  distanceKm?: number;
  providerPlaceId?: string;
}
