import { writable, derived } from 'svelte/store';
import { getRegions } from '$lib/db/supabase';

// ============================================================
// TYPES
// ============================================================
export interface Region {
  id?: string;
  name: string;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// ============================================================
// GLOBAL REGION (default)
// ============================================================
export const GLOBAL_REGION: Region = {
  name: 'Global',
  min_lat: -90,
  max_lat: 90,
  min_lng: -180,
  max_lng: 180,
};

// ============================================================
// STORES
// ============================================================

// Semua region yang tersedia (dari DB + custom)
export const regions = writable<Region[]>([GLOBAL_REGION]);

// Region yang sedang aktif
export const activeRegion = writable<Region>(GLOBAL_REGION);

// Custom bounding box (dari user drag di map)
export const customBoundingBox = writable<BoundingBox | null>(null);

// Loading state
export const isLoadingRegions = writable<boolean>(false);

// Mode filter: 'preset' | 'custom'
export const filterMode = writable<'preset' | 'custom'>('preset');

// ============================================================
// DERIVED
// ============================================================

// Bounding box yang aktif saat ini
// Kalau custom mode → pakai customBoundingBox
// Kalau preset mode → pakai activeRegion
export const activeBoundingBox = derived(
  [filterMode, activeRegion, customBoundingBox],
  ([$filterMode, $activeRegion, $customBoundingBox]): BoundingBox | null => {
    if ($filterMode === 'custom' && $customBoundingBox) {
      return $customBoundingBox;
    }

    if ($activeRegion.name === 'Global') return null; // null = no filter

    return {
      minLat: $activeRegion.min_lat,
      maxLat: $activeRegion.max_lat,
      minLng: $activeRegion.min_lng,
      maxLng: $activeRegion.max_lng,
    };
  }
);

// Label yang ditampilkan di UI
export const activeRegionLabel = derived(
  [filterMode, activeRegion, customBoundingBox],
  ([$filterMode, $activeRegion, $customBoundingBox]) => {
    if ($filterMode === 'custom' && $customBoundingBox) {
      return `Custom Region (${$customBoundingBox.minLat.toFixed(1)}°, ${$customBoundingBox.minLng.toFixed(1)}°)`;
    }
    return $activeRegion.name;
  }
);

// ============================================================
// ACTIONS
// ============================================================

// Load regions dari Supabase
export async function loadRegions() {
  isLoadingRegions.set(true);

  try {
    const dbRegions = await getRegions();

    if (dbRegions.length) {
      // Pastikan Global selalu ada di index 0
      const withoutGlobal = dbRegions.filter((r) => r.name !== 'Global');
      regions.set([GLOBAL_REGION, ...withoutGlobal]);
    }
  } catch (err) {
    console.error('SEISMON loadRegions error:', err);
  } finally {
    isLoadingRegions.set(false);
  }
}

// Set region aktif dari preset
export function setActiveRegion(region: Region) {
  activeRegion.set(region);
  filterMode.set('preset');
  customBoundingBox.set(null);
}

// Set custom bounding box (dari map drag)
export function setCustomBoundingBox(box: BoundingBox) {
  customBoundingBox.set(box);
  filterMode.set('custom');
}

// Reset ke global
export function resetRegion() {
  activeRegion.set(GLOBAL_REGION);
  customBoundingBox.set(null);
  filterMode.set('preset');
}

// Cek apakah koordinat masuk dalam region aktif
export function isInActiveRegion(lat: number, lng: number, box: BoundingBox | null): boolean {
  if (!box) return true; // Global = semua masuk

  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lng >= box.minLng &&
    lng <= box.maxLng
  );
}