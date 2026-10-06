import { Place, PlaceSearchResult } from '@/lib/types';

/**
 * Places Provider Abstraction (Architecture Section 17 & Milestone Foundation)
 * Defines the contract that external provider adapters (Google, Mapbox, OSM, Mock) must satisfy.
 * Guarantees provider-specific data structures do not leak into the Been-There domain.
 */
export interface PlaceProvider {
  providerName: string;
  searchPlaces(query: string, options?: { lat?: number; lng?: number; radiusKm?: number }): Promise<PlaceSearchResult[]>;
  getPlace(providerPlaceId: string): Promise<Place | null>;
}

/**
 * In-memory / Mock Place Provider implementation.
 * Provides realistic places for development, testing, and initial demonstration without external API keys.
 */
export class MockPlaceProvider implements PlaceProvider {
  public providerName = 'mock_provider';

  private places: Place[] = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      provider: 'mock_provider',
      providerPlaceId: 'mock_twc_12th',
      name: 'Third Wave Coffee',
      category: 'Cafe',
      address: '12th Main Road, Indiranagar, Bengaluru, 560038',
      latitude: 12.9716,
      longitude: 77.6412,
      branch: 'Indiranagar',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      provider: 'mock_provider',
      providerPlaceId: 'mock_toit_ind',
      name: 'Toit Brewpub',
      category: 'Brewery & Restaurant',
      address: '100 Feet Road, Indiranagar, Bengaluru, 560038',
      latitude: 12.9793,
      longitude: 77.6406,
      branch: 'Indiranagar',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      provider: 'mock_provider',
      providerPlaceId: 'mock_cornerhouse_res',
      name: 'Corner House Ice Cream',
      category: 'Dessert Parlour',
      address: 'Residency Road, Shanthala Nagar, Bengaluru, 560025',
      latitude: 12.9724,
      longitude: 77.6074,
      branch: 'Residency Road',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      provider: 'mock_provider',
      providerPlaceId: 'mock_blue_tokai_kor',
      name: 'Blue Tokai Coffee Roasters',
      category: 'Roastery & Cafe',
      address: '5th Block, Koramangala, Bengaluru, 560095',
      latitude: 12.9348,
      longitude: 77.6202,
      branch: 'Koramangala',
    },
  ];

  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return this.places
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address,
        providerPlaceId: p.providerPlaceId,
      }));
  }

  async getPlace(providerPlaceId: string): Promise<Place | null> {
    const place = this.places.find(
      (p) => p.providerPlaceId === providerPlaceId || p.id === providerPlaceId
    );
    return place || null;
  }
}

export const defaultPlaceProvider: PlaceProvider = new MockPlaceProvider();
