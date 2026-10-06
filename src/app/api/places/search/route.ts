import { NextRequest, NextResponse } from 'next/server';
import { PlacesService } from '@/server/places';
import { placeSearchQuerySchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const validation = placeSearchQuerySchema.safeParse({ q });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const places = await PlacesService.search(validation.data.q);
    return NextResponse.json({ places });
  } catch (error) {
    console.error('API Error /api/places/search:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
}
