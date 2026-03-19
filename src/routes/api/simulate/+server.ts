import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { classifyEvent } from '$lib/utils/classifier';
import type { RequestHandler } from './$types';

// Service role client — hanya di server
const adminSupabase = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

interface SimulatePayload {
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  yield_kt?: number;
  label?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // ============================================================
    // PARSE & VALIDATE BODY
    // ============================================================
    const body: SimulatePayload = await request.json();

    const { magnitude, depth, latitude, longitude, yield_kt, label } = body;

    // Validasi field wajib
    if (
      magnitude == null || depth == null ||
      latitude == null || longitude == null
    ) {
      return json(
        { error: 'magnitude, depth, latitude, longitude are required' },
        { status: 400 }
      );
    }

    // Validasi range
    if (magnitude < 0 || magnitude > 10) {
      return json({ error: 'magnitude must be between 0 and 10' }, { status: 400 });
    }

    if (depth < 0 || depth > 700) {
      return json({ error: 'depth must be between 0 and 700 km' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90) {
      return json({ error: 'latitude must be between -90 and 90' }, { status: 400 });
    }

    if (longitude < -180 || longitude > 180) {
      return json({ error: 'longitude must be between -180 and 180' }, { status: 400 });
    }

    // ============================================================
    // CLASSIFY SIMULATION EVENT
    // ============================================================
    const classification = classifyEvent({
      magnitude,
      depth,
      latitude,
      longitude,
    });

    // ============================================================
    // ESTIMASI YIELD (jika tidak disediakan)
    // Menggunakan relasi empiris: mb = (log10(Y) + 4.45) / 0.75
    // Dimana mb = body wave magnitude, Y = yield dalam kiloton
    // ============================================================
    let estimatedYield = yield_kt;
    if (!estimatedYield && magnitude >= 4.5) {
      // Inverse formula: Y = 10^((mb * 0.75) - 4.45)
      estimatedYield = Math.pow(10, magnitude * 0.75 - 4.45);
      estimatedYield = Math.round(estimatedYield * 100) / 100;
    }

    // ============================================================
    // SIMPAN KE DB
    // ============================================================
    const simData = {
      magnitude,
      depth,
      latitude,
      longitude,
      yield_kt: estimatedYield ?? null,
      anomaly_score: classification.score,
      threat_level: classification.threatLevel,
      label: label ?? 'SIMULATION',
    };

    const { data, error } = await adminSupabase
      .from('simulations')
      .insert(simData)
      .select()
      .single();

    if (error) {
      console.error('SEISMON DB Insert Simulation Error:', error.message);
      return json({ error: 'Failed to save simulation' }, { status: 500 });
    }

    // ============================================================
    // RETURN HASIL LENGKAP
    // ============================================================
    return json({
      message: 'Simulation created',
      simulation: {
        ...data,
        reasons: classification.reasons,
        estimated_yield_kt: estimatedYield,
      },
    });

  } catch (err) {
    console.error('SEISMON simulate error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// GET — ambil history simulasi
export const GET: RequestHandler = async () => {
  try {
    const { data, error } = await adminSupabase
      .from('simulations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('SEISMON DB Get Simulations Error:', error.message);
      return json({ error: 'Failed to fetch simulations' }, { status: 500 });
    }

    return json({ simulations: data ?? [] });

  } catch (err) {
    console.error('SEISMON simulate GET error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};