import { Place, PlaceSearchResult } from '@/lib/types';

export interface PlacesProviderAdapter {
  providerName: string;
  search(query: string, options?: { lat?: number; lng?: number; radiusKm?: number }): Promise<PlaceSearchResult[]>;
  getPlaceDetails(providerPlaceId: string): Promise<Place | null>;
}

/**
 * Default in-memory / local provider adapter for development and prototyping.
 * Can be swapped with Google Places, Mapbox, OpenStreetMap, Foursquare, etc. without leaking provider schemas.
 */
export class MockPlacesProviderAdapter implements PlacesProviderAdapter {
  public providerName = 'mock-places-provider';

  private samplePlaces: Place[] = [
    {
      id: 'bt_place_1',
      provider: 'mock-places-provider',
      providerPlaceId: 'mock_1',
      name: 'Third Wave Coffee',
      category: 'Cafe',
      address: '12th Main Rd, Indiranagar, Bengaluru',
      latitude: 12.9716,
      longitude: 77.6412,
      branch: 'Indiranagar',
    },
    {
      id: 'bt_place_2',
      provider: 'mock-places-provider',
      providerPlaceId: 'mock_2',
      name: 'Toit Brewpub',
      category: 'Brewery',
      address: '100ft Road, Indiranagar, Bengaluru',
      latitude: 12.9793,
      longitude: 77.6406,
      branch: 'Indiranagar',
    },
    {
      id: 'bt_place_3',
      provider: 'mock-places-provider',
      providerPlaceId: 'mock_3',
      name: 'Corner House Ice Cream',
      category: 'Dessert',
      address: 'Residency Road, Bengaluru',
      latitude: 12.9724,
      longitude: 77.6074,
      branch: 'Residency Road',
    },
  ];

  async search(query: string): Promise<PlaceSearchResult[]> {
    const q = query.toLowerCase();
    return this.samplePlaces
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address,
        providerPlaceId: p.providerPlaceId,
      }));
  }

  async getPlaceDetails(providerPlaceId: string): Promise<Place | null> {
    const found = this.samplePlaces.find((p) => p.providerPlaceId === providerPlaceId || p.id === providerPlaceId);
    return found || null;
  }
}

export const defaultPlacesAdapter: PlacesProviderAdapter = new MockPlacesProviderAdapter();
