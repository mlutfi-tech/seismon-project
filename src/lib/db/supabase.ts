import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// ============================================================
// PUBLIC CLIENT — dipakai di frontend (SELECT only)
// ============================================================
export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);

// ============================================================
// DATABASE TYPES
// ============================================================
export interface DBEvent {
  id?: string;
  usgs_id: string;
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  location: string;
  time: string;
  anomaly_score: number;
  threat_level: string;
  created_at?: string;
}

export interface DBSimulation {
  id?: string;
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  yield_kt?: number;
  anomaly_score: number;
  threat_level: string;
  label?: string;
  created_at?: string;
}

export interface DBRegion {
  id?: string;
  name: string;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

// ============================================================
// QUERY HELPERS — frontend safe (SELECT only)
// ============================================================

// Ambil anomaly events terbaru
export async function getRecentAnomalyEvents(limit = 50): Promise<DBEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .neq('threat_level', 'NATURAL')
    .order('time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('SEISMON DB Error [getRecentAnomalyEvents]:', error.message);
    return [];
  }

  return data ?? [];
}

// Ambil anomaly events berdasarkan region
export async function getAnomalyEventsByRegion(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  limit = 50
): Promise<DBEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .neq('threat_level', 'NATURAL')
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLng)
    .lte('longitude', maxLng)
    .order('time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('SEISMON DB Error [getAnomalyEventsByRegion]:', error.message);
    return [];
  }

  return data ?? [];
}

// Ambil semua simulasi
export async function getSimulations(limit = 20): Promise<DBSimulation[]> {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('SEISMON DB Error [getSimulations]:', error.message);
    return [];
  }

  return data ?? [];
}

// Ambil semua preset regions
export async function getRegions(): Promise<DBRegion[]> {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('SEISMON DB Error [getRegions]:', error.message);
    return [];
  }

  return data ?? [];
}