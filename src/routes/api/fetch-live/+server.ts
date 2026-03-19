import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { classifyEvent } from '$lib/utils/classifier';
import type { RequestHandler } from './$types';

// Service role client 
const adminSupabase = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const USGS_FEED_URL ='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    type: string;
  };
  geometry: {
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
}

interface USGSResponse {
  features: USGSFeature[];
}

export const GET: RequestHandler = async () => {
  try {
    // 1. Fetch dari USGS
    const res = await fetch(USGS_FEED_URL);
    if (!res.ok) {
      return json({ error: 'Failed to fetch USGS data' }, { status: 502 });
    }

    const usgsData: USGSResponse = await res.json();
    const features = usgsData.features;

    if (!features?.length) {
      return json({ message: 'No events found', count: 0 });
    }

    // 2. Classify setiap event
    const anomalies = [];
    const allEvents = [];

    for (const feature of features) {
      const [lng, lat, depth] = feature.geometry.coordinates;
      const mag = feature.properties.mag;

      // Skip event tanpa magnitude valid
      if (!mag || mag <= 0) continue;

      const seismicEvent = {
        magnitude: mag,
        depth: depth ?? 0,
        latitude: lat,
        longitude: lng,
        location: feature.properties.place ?? 'Unknown',
        time: new Date(feature.properties.time).toISOString(),
      };

      const classification = classifyEvent(seismicEvent);

      const eventData = {
        ...seismicEvent,
        usgs_id: feature.id,
        anomaly_score: classification.score,
        threat_level: classification.threatLevel,
      };

      allEvents.push(eventData);

      // 3. Hanya simpan anomaly ke DB
      if (classification.threatLevel !== 'NATURAL') {
        anomalies.push(eventData);
      }
    }

    // 4. Upsert anomaly events ke Supabase
    // Pakai upsert agar tidak duplikat jika polling berulang
    let savedCount = 0;
    if (anomalies.length > 0) {
      const { error } = await adminSupabase
        .from('events')
        .upsert(anomalies, { onConflict: 'usgs_id' });

      if (error) {
        console.error('SEISMON DB Upsert Error:', error.message);
      } else {
        savedCount = anomalies.length;
      }
    }

    // 5. Return semua events ke frontend (termasuk natural)
    // Natural events hanya untuk display di map, tidak disimpan di DB
    return json({
      message: 'OK',
      total: allEvents.length,
      anomalies: savedCount,
      events: allEvents,
    });

  } catch (err) {
    console.error('SEISMON fetch-live error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};