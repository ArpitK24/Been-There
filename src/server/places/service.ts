import { defaultPlaceProvider } from '@/lib/places';
import { Place, PlaceSearchResult } from '@/lib/types';
import { db, places } from '@/lib/db';
import { eq } from 'drizzle-orm';

export class PlacesService {
  /**
   * Search for places using the configured provider adapter.
   */
  static async search(query: string): Promise<PlaceSearchResult[]> {
    return defaultPlaceProvider.searchPlaces(query);
  }

  /**
   * Retrieve a place by its canonical Been-There internal ID.
   * Checks database first, then queries the provider adapter.
   */
  static async getById(placeId: string): Promise<Place | null> {
    const [place] = await db
      .select()
      .from(places)
      .where(eq(places.id, placeId))
      .limit(1);

    if (place) {
      return place;
    }

    return defaultPlaceProvider.getPlace(placeId);
  }
}
