import { writable, derived } from 'svelte/store';
import type { ThreatLevel } from '$lib/utils/classifier';
import { injectSimulationEvent } from './events';
import type { LiveEvent } from './events';

// ============================================================
// TYPES
// ============================================================
export interface SimulationConfig {
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  yield_kt?: number;
  label: string;
}

export interface SimulationResult {
  id: string;
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  yield_kt?: number;
  anomaly_score: number;
  threat_level: ThreatLevel;
  reasons: string[];
  estimated_yield_kt?: number;
  label: string;
  created_at: string;
}

// ============================================================
// STORES
// ============================================================

// Default config untuk simulation form
const DEFAULT_CONFIG: SimulationConfig = {
  magnitude: 5.2,
  depth: 2,
  latitude: 41.3,
  longitude: 129.0,
  yield_kt: undefined,
  label: 'SIMULATION',
};

// Form config saat ini
export const simConfig = writable<SimulationConfig>({ ...DEFAULT_CONFIG });

// History simulasi yang pernah dijalankan di session ini
export const simHistory = writable<SimulationResult[]>([]);

// Simulasi yang sedang aktif/dipilih
export const activeSimulation = writable<SimulationResult | null>(null);

// Loading state saat POST ke API
export const isSimulating = writable<boolean>(false);

// Error state
export const simError = writable<string | null>(null);

// Panel visibility
export const simPanelOpen = writable<boolean>(false);

// ============================================================
// DERIVED
// ============================================================

// Total simulasi yang dijalankan
export const simCount = derived(simHistory, ($h) => $h.length);

// Simulasi paling berbahaya dari history
export const mostDangerousSim = derived(simHistory, ($h) => {
  if (!$h.length) return null;
  return $h.reduce((prev, curr) =>
    curr.anomaly_score > prev.anomaly_score ? curr : prev
  );
});

// ============================================================
// PRESET LOCATIONS — untuk quick-select di UI
// ============================================================
export const PRESET_LOCATIONS = [
  {
    name: 'North Korea — Punggye-ri',
    latitude: 41.3,
    longitude: 129.0,
    depth: 2,
    magnitude: 5.1,
  },
  {
    name: 'Kazakhstan — Semipalatinsk',
    latitude: 50.4,
    longitude: 78.9,
    depth: 3,
    magnitude: 5.5,
  },
  {
    name: 'Nevada Test Site — USA',
    latitude: 37.1,
    longitude: -116.0,
    depth: 1,
    magnitude: 4.8,
  },
  {
    name: 'Lop Nor — China',
    latitude: 41.0,
    longitude: 88.8,
    depth: 2,
    magnitude: 5.0,
  },
  {
    name: 'Mururoa Atoll — France',
    latitude: -21.8,
    longitude: -138.8,
    depth: 1,
    magnitude: 4.6,
  },
  {
    name: 'Custom Location',
    latitude: 0,
    longitude: 0,
    depth: 0,
    magnitude: 0,
  },
];

// ============================================================
// ACTIONS
// ============================================================
export async function runSimulation(config: SimulationConfig) {
  isSimulating.set(true);
  simError.set(null);

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    const data = await res.json();
    const result: SimulationResult = data.simulation;

    // Tambah ke history
    simHistory.update((h) => [result, ...h]);

    // Set sebagai active
    activeSimulation.set(result);

    // Inject ke map events
    const liveEvent: LiveEvent = {
      usgs_id: `SIM-${result.id}`,
      magnitude: result.magnitude,
      depth: result.depth,
      latitude: result.latitude,
      longitude: result.longitude,
      location: result.label,
      time: result.created_at,
      anomaly_score: result.anomaly_score,
      threat_level: result.threat_level,
      reasons: result.reasons,
      is_simulation: true,
      yield_kt: result.estimated_yield_kt,
      label: result.label,
    };

    injectSimulationEvent(liveEvent);

    return result;

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    simError.set(`Simulation failed: ${msg}`);
    console.error('SEISMON runSimulation error:', err);
    return null;
  } finally {
    isSimulating.set(false);
  }
}

export function applyPreset(preset: typeof PRESET_LOCATIONS[0]) {
  if (preset.name === 'Custom Location') return;
  simConfig.update((c) => ({
    ...c,
    latitude: preset.latitude,
    longitude: preset.longitude,
    depth: preset.depth,
    magnitude: preset.magnitude,
    label: preset.name,
  }));
}

export function resetSimConfig() {
  simConfig.set({ ...DEFAULT_CONFIG });
  simError.set(null);
}

export function clearSimHistory() {
  simHistory.set([]);
  activeSimulation.set(null);
}

export function loadSimHistory(history: SimulationResult[]) {
  simHistory.set(history);
}