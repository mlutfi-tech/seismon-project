import { json } from '@sveltejs/kit';
import { classifyEvent } from '$lib/utils/classifier';
import type { RequestHandler } from './$types';

const USGS_API_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // ============================================================
    // PARSE QUERY PARAMS
    // ============================================================
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
    const minLat = url.searchParams.get('minLat');
    const maxLat = url.searchParams.get('maxLat');
    const minLng = url.searchParams.get('minLng');
    const maxLng = url.searchParams.get('maxLng');
    const minMag = url.searchParams.get('minMag') ?? '2.5';
    const limit = url.searchParams.get('limit') ?? '200';

    // Validasi params wajib
    if (!startTime || !endTime) {
      return json(
        { error: 'startTime and endTime are required (ISO 8601 format)' },
        { status: 400 }
      );
    }

    // ============================================================
    // BUILD USGS API URL
    // ============================================================
    const params = new URLSearchParams({
      format: 'geojson',
      starttime: startTime,
      endtime: endTime,
      minmagnitude: minMag,
      limit,
      orderby: 'time',
    });

    // Optional region filter
    if (minLat && maxLat && minLng && maxLng) {
      params.append('minlatitude', minLat);
      params.append('maxlatitude', maxLat);
      params.append('minlongitude', minLng);
      params.append('maxlongitude', maxLng);
    }

    const usgsUrl = `${USGS_API_BASE}?${params.toString()}`;

    // ============================================================
    // FETCH FROM USGS
    // ============================================================
    const res = await fetch(usgsUrl);

    if (!res.ok) {
      const errText = await res.text();
      console.error('SEISMON USGS Historical Error:', errText);
      return json(
        { error: 'Failed to fetch historical data from USGS' },
        { status: 502 }
      );
    }

    const usgsData = await res.json();
    const features = usgsData.features ?? [];

    // ============================================================
    // CLASSIFY EVENTS
    // ============================================================
    const events = features
      .filter((f: any) => f.properties.mag && f.properties.mag > 0)
      .map((feature: any) => {
        const [lng, lat, depth] = feature.geometry.coordinates;
        const mag = feature.properties.mag;

        const seismicEvent = {
          magnitude: mag,
          depth: depth ?? 0,
          latitude: lat,
          longitude: lng,
          location: feature.properties.place ?? 'Unknown',
          time: new Date(feature.properties.time).toISOString(),
        };

        const classification = classifyEvent(seismicEvent);

        return {
          ...seismicEvent,
          usgs_id: feature.id,
          anomaly_score: classification.score,
          threat_level: classification.threatLevel,
          reasons: classification.reasons,
        };
      });

    // ============================================================
    // SUMMARY STATS
    // ============================================================
    const summary = {
      total: events.length,
      natural: events.filter((e: any) => e.threat_level === 'NATURAL').length,
      suspicious: events.filter((e: any) => e.threat_level === 'SUSPICIOUS').length,
      high_anomaly: events.filter((e: any) => e.threat_level === 'HIGH_ANOMALY').length,
      critical: events.filter((e: any) => e.threat_level === 'CRITICAL').length,
    };

    return json({
      message: 'OK',
      summary,
      events,
    });

  } catch (err) {
    console.error('SEISMON historical error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};