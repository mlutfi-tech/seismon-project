import { writable, derived, get } from 'svelte/store';
import type { ThreatLevel } from '$lib/utils/classifier';

// ============================================================
// TYPES
// ============================================================
export interface LiveEvent {
  usgs_id: string;
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  location: string;
  time: string;
  anomaly_score: number;
  threat_level: ThreatLevel;
  reasons?: string[];
  is_simulation?: boolean;
  yield_kt?: number;
  label?: string;
}

export type AppMode = 'LIVE' | 'HISTORICAL' | 'SIMULATION';

// ============================================================
// CORE STORES
// ============================================================

// Semua events yang sedang ditampilkan di map
export const events = writable<LiveEvent[]>([]);

// Events dari historical query
export const historicalEvents = writable<LiveEvent[]>([]);

// App mode saat ini
export const appMode = writable<AppMode>('LIVE');

// Status polling
export const isPolling = writable<boolean>(false);

// Timestamp terakhir fetch
export const lastUpdated = writable<Date | null>(null);

// Error state
export const fetchError = writable<string | null>(null);

// Loading state
export const isLoading = writable<boolean>(false);

// ============================================================
// DERIVED STORES — otomatis update saat events berubah
// ============================================================

// Hanya anomaly events
export const anomalyEvents = derived(events, ($events) =>
  $events.filter((e) => e.threat_level !== 'NATURAL')
);

// Hanya critical events
export const criticalEvents = derived(events, ($events) =>
  $events.filter((e) => e.threat_level === 'CRITICAL')
);

// Event dengan score tertinggi (most dangerous)
export const highestThreat = derived(events, ($events) => {
  if (!$events.length) return null;
  return $events.reduce((prev, curr) =>
    curr.anomaly_score > prev.anomaly_score ? curr : prev
  );
});

// Summary stats
export const eventStats = derived(events, ($events) => ({
  total: $events.length,
  natural: $events.filter((e) => e.threat_level === 'NATURAL').length,
  suspicious: $events.filter((e) => e.threat_level === 'SUSPICIOUS').length,
  high_anomaly: $events.filter((e) => e.threat_level === 'HIGH_ANOMALY').length,
  critical: $events.filter((e) => e.threat_level === 'CRITICAL').length,
}));

// Overall threat level berdasarkan event paling berbahaya
export const globalThreatLevel = derived(events, ($events): ThreatLevel => {
  if ($events.some((e) => e.threat_level === 'CRITICAL')) return 'CRITICAL';
  if ($events.some((e) => e.threat_level === 'HIGH_ANOMALY')) return 'HIGH_ANOMALY';
  if ($events.some((e) => e.threat_level === 'SUSPICIOUS')) return 'SUSPICIOUS';
  return 'NATURAL';
});

// ============================================================
// ACTIONS
// ============================================================
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export async function fetchLiveEvents() {
  isLoading.set(true);
  fetchError.set(null);

  try {
    const res = await fetch('/api/fetch-live');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.events) {
      // Merge dengan simulation events yang sudah ada
      const currentEvents = get(events);
      const simEvents = currentEvents.filter((e) => e.is_simulation);

      events.set([...data.events, ...simEvents]);
      lastUpdated.set(new Date());
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    fetchError.set(`Failed to fetch live data: ${msg}`);
    console.error('SEISMON fetchLiveEvents error:', err);
  } finally {
    isLoading.set(false);
  }
}

export async function fetchHistoricalEvents(params: {
  startTime: string;
  endTime: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  minMag?: number;
  limit?: number;
}) {
  isLoading.set(true);
  fetchError.set(null);

  try {
    const query = new URLSearchParams({
      startTime: params.startTime,
      endTime: params.endTime,
      ...(params.minLat != null && { minLat: String(params.minLat) }),
      ...(params.maxLat != null && { maxLat: String(params.maxLat) }),
      ...(params.minLng != null && { minLng: String(params.minLng) }),
      ...(params.maxLng != null && { maxLng: String(params.maxLng) }),
      ...(params.minMag != null && { minMag: String(params.minMag) }),
      ...(params.limit != null && { limit: String(params.limit) }),
    });

    const res = await fetch(`/api/historical?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.events) {
      historicalEvents.set(data.events);
      events.set(data.events);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    fetchError.set(`Failed to fetch historical data: ${msg}`);
    console.error('SEISMON fetchHistoricalEvents error:', err);
  } finally {
    isLoading.set(false);
  }
}

export function injectSimulationEvent(simEvent: LiveEvent) {
  events.update((current) => [
    { ...simEvent, is_simulation: true },
    ...current,
  ]);
}

export function startPolling(intervalMs = 60000) {
  if (pollingInterval) return;

  isPolling.set(true);
  fetchLiveEvents(); // fetch langsung pertama kali

  pollingInterval = setInterval(() => {
    fetchLiveEvents();
  }, intervalMs);
}

export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPolling.set(false);
}

export function clearEvents() {
  events.set([]);
  historicalEvents.set([]);
  lastUpdated.set(null);
  fetchError.set(null);
}