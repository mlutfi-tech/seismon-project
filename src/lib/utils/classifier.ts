export type ThreatLevel = 'NATURAL' | 'SUSPICIOUS' | 'HIGH_ANOMALY' | 'CRITICAL';

export interface SeismicEvent {
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  location?: string;
  time?: string;
}

export interface ClassificationResult {
  score: number;
  threatLevel: ThreatLevel;
  reasons: string[];
}

// Zona seismik aktif dunia (bounding boxes)
const ACTIVE_SEISMIC_ZONES = [
  { name: 'Pacific Ring of Fire - West', minLat: -60, maxLat: 60, minLng: 120, maxLng: 180 },
  { name: 'Pacific Ring of Fire - East', minLat: -60, maxLat: 60, minLng: -180, maxLng: -60 },
  { name: 'Alpide Belt', minLat: 20, maxLat: 50, minLng: -15, maxLng: 140 },
  { name: 'Mid-Atlantic Ridge', minLat: -60, maxLat: 70, minLng: -45, maxLng: -10 },
];

// Zona non-seismik yang mencurigakan jika ada event
const SUSPICIOUS_ZONES = [
  { name: 'North Korea', minLat: 37.5, maxLat: 43, minLng: 124, maxLng: 131 },
  { name: 'Central Asia (test sites)', minLat: 40, maxLat: 55, minLng: 55, maxLng: 80 },
  { name: 'Nevada Test Site', minLat: 36, maxLat: 38, minLng: -117, maxLng: -115 },
  { name: 'Lop Nor (China)', minLat: 39, maxLat: 42, minLng: 87, maxLng: 91 },
];

function isInZone(
  lat: number,
  lng: number,
  zones: typeof ACTIVE_SEISMIC_ZONES
): boolean {
  return zones.some(
    (z) =>
      lat >= z.minLat &&
      lat <= z.maxLat &&
      lng >= z.minLng &&
      lng <= z.maxLng
  );
}

export function classifyEvent(event: SeismicEvent): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];

  // --- DEPTH SCORING ---
  if (event.depth < 5) {
    score += 30;
    reasons.push(`Kedalaman sangat dangkal (${event.depth}km) — tipikal surface/underground explosion`);
  } else if (event.depth < 10) {
    score += 15;
    reasons.push(`Kedalaman dangkal (${event.depth}km) — perlu perhatian`);
  }

  // --- MAGNITUDE SCORING ---
  if (event.magnitude >= 4.5 && event.magnitude <= 6.0) {
    score += 20;
    reasons.push(`Magnitude ${event.magnitude} dalam range tipikal underground nuclear test (4.5–6.0)`);
  }

  // --- LOCATION SCORING ---
  const inActiveZone = isInZone(event.latitude, event.longitude, ACTIVE_SEISMIC_ZONES);
  const inSuspiciousZone = isInZone(event.latitude, event.longitude, SUSPICIOUS_ZONES);

  if (inSuspiciousZone) {
    score += 25;
    const zone = SUSPICIOUS_ZONES.find(
      (z) =>
        event.latitude >= z.minLat &&
        event.latitude <= z.maxLat &&
        event.longitude >= z.minLng &&
        event.longitude <= z.maxLng
    );
    reasons.push(`Lokasi berada di zona sensitif: ${zone?.name}`);
  } else if (!inActiveZone) {
    score += 15;
    reasons.push(`Lokasi berada di luar zona seismik aktif yang dikenal`);
  }

  // --- ISOLATED EVENT SCORING ---
  if (!inActiveZone && event.magnitude >= 4.0) {
    score += 15;
    reasons.push(`Event terisolasi dengan magnitude signifikan di zona non-aktif`);
  }

  // --- SHARP ONSET PROXY ---
  // Proxy: kedalaman sangat dangkal + lokasi non-aktif = kemungkinan explosion
  if (event.depth < 10 && !inActiveZone) {
    score += 10;
    reasons.push(`Kombinasi kedalaman dangkal dan lokasi non-seismik — indikasi artificial event`);
  }

  // --- DETERMINE THREAT LEVEL ---
  let threatLevel: ThreatLevel;

  if (score >= 81) {
    threatLevel = 'CRITICAL';
  } else if (score >= 61) {
    threatLevel = 'HIGH_ANOMALY';
  } else if (score >= 31) {
    threatLevel = 'SUSPICIOUS';
  } else {
    threatLevel = 'NATURAL';
    reasons.push('Parameter dalam batas normal — kemungkinan besar gempa alami');
  }

  return { score, threatLevel, reasons };
}

export function getThreatColor(level: ThreatLevel): string {
  switch (level) {
    case 'NATURAL':     return '#00ff41';  
    case 'SUSPICIOUS':  return '#ffd700';  
    case 'HIGH_ANOMALY':return '#ff6600';  
    case 'CRITICAL':    return '#ff0000';  
  }
}

export function getThreatLabel(level: ThreatLevel): string {
  switch (level) {
    case 'NATURAL':      return 'NATURAL — No Threat Detected';
    case 'SUSPICIOUS':   return 'SUSPICIOUS — Anomaly Detected';
    case 'HIGH_ANOMALY': return 'HIGH ANOMALY — Possible Artificial Event';
    case 'CRITICAL':     return 'CRITICAL — Possible Detonation';
  }
}