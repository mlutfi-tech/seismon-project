<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { events, type LiveEvent } from '$lib/stores/events';
  import { activeBoundingBox, isInActiveRegion } from '$lib/stores/region';
  import { getThreatColor, getThreatLabel } from '$lib/utils/classifier';

  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let map: any = $state(undefined);
  let L: any = $state(undefined);
  let markers: Map<string, any> = new Map();
  let circles: Map<string, any> = new Map();
  let regionRect: any = null;

  let unsubEvents: (() => void) | null = null;
  let unsubRegion: (() => void) | null = null;

  // ============================================================
  // INIT MAP
  // ============================================================
  onMount(async () => {
    L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    if (!mapContainer) return;

    map = L.map(mapContainer, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      maxBoundsViscosity: 1.0,
    });

    map.setMaxBounds([
      [-90, -Infinity],
      [90, Infinity]
    ]);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '© CARTO © OpenStreetMap',
        maxZoom: 18,
      }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    unsubEvents = events.subscribe((evts) => {
      updateMarkers(evts);
    });

    unsubRegion = activeBoundingBox.subscribe((box) => {
      drawRegionRect(box);
    });
  });

  onDestroy(() => {
    unsubEvents?.();
    unsubRegion?.();
    if (map) map.remove();
  });

  // ============================================================
  // RADIUS CALCULATION
  // Konversi magnitude ke radius dalam meter
  // Berdasarkan estimasi empiris blast radius
  // ============================================================
  function getBlastRadius(magnitude: number, threatLevel: string): number {
    if (threatLevel === 'NATURAL') return 0;

    // Base radius dalam meter
    // Magnitude 4.5 → ~50km, 6.0 → ~200km, 7.0+ → ~500km
    const base = Math.pow(10, (magnitude - 3) * 0.8) * 1000;
    return Math.min(base, 600000); // max 600km
  }

  // ============================================================
  // MARKERS + CIRCLES
  // ============================================================
  function updateMarkers(evts: LiveEvent[]) {
    if (!map || !L) return;

    const box = $activeBoundingBox;
    const visibleIds = new Set<string>();

    for (const evt of evts) {
      if (!isInActiveRegion(evt.latitude, evt.longitude, box)) continue;

      visibleIds.add(evt.usgs_id);

      if (!markers.has(evt.usgs_id)) {
        // Buat circle dulu (di bawah marker)
        if (evt.threat_level !== 'NATURAL') {
          const circle = createThreatCircle(evt);
          if (circle) {
            circle.addTo(map);
            circles.set(evt.usgs_id, circle);
          }
        }

        // Buat marker di atas circle
        const marker = createMarker(evt);
        marker.addTo(map);
        markers.set(evt.usgs_id, marker);
      }
    }

    // Hapus marker dan circle yang tidak visible
    for (const [id, marker] of markers.entries()) {
      if (!visibleIds.has(id)) {
        map.removeLayer(marker);
        markers.delete(id);

        const circle = circles.get(id);
        if (circle) {
          map.removeLayer(circle);
          circles.delete(id);
        }
      }
    }
  }

  function createThreatCircle(evt: LiveEvent) {
    if (!L) return null;

    const color = getThreatColor(evt.threat_level);
    const radius = getBlastRadius(evt.magnitude, evt.threat_level);

    if (radius === 0) return null;

    // Opacity berdasarkan threat level
    const opacityMap: Record<string, number> = {
      SUSPICIOUS:   0.06,
      HIGH_ANOMALY: 0.10,
      CRITICAL:     0.15,
    };

    const fillOpacity = opacityMap[evt.threat_level] ?? 0.06;

    return L.circle([evt.latitude, evt.longitude], {
      radius,
      color,
      weight: 1,
      opacity: 0.4,
      fillColor: color,
      fillOpacity,
      dashArray: evt.threat_level === 'SUSPICIOUS' ? '4 4' : undefined,
      interactive: false, // klik tidak tertangkap circle, lewat ke marker
    });
  }

  function createMarker(evt: LiveEvent) {
    const color = getThreatColor(evt.threat_level);
    const size = getMarkerSize(evt.magnitude);
    const isSim = evt.is_simulation;

    const html = `
      <div class="seismon-marker ${evt.threat_level !== 'NATURAL' ? 'pulse' : ''}"
           style="
             width: ${size}px;
             height: ${size}px;
             background: ${color};
             border: 2px solid ${color};
             border-radius: 50%;
             box-shadow: 0 0 ${size}px ${color}88;
             position: relative;
           ">
        ${isSim ? `<span style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:9px;color:${color};white-space:nowrap;font-family:monospace;">SIM</span>` : ''}
      </div>
    `;

    const icon = L.divIcon({
      html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const marker = L.marker([evt.latitude, evt.longitude], { icon });

    marker.bindPopup(createPopupContent(evt), {
      className: 'seismon-popup',
      maxWidth: 280,
    });

    return marker;
  }

  function createPopupContent(evt: LiveEvent): string {
    const color = getThreatColor(evt.threat_level);
    const date = new Date(evt.time).toUTCString();

    return `
      <div style="
        background: #0a0e1a;
        color: #c8d8e8;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        padding: 12px;
        border: 1px solid ${color}44;
        min-width: 220px;
      ">
        <div style="color: ${color}; font-size: 13px; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">
          ${evt.is_simulation ? '⚠ [SIMULATION]' : '◉ SEISMIC EVENT'}
        </div>
        <div style="margin-bottom: 4px;"><span style="color:#556677;">LOCATION:</span> ${evt.location}</div>
        <div style="margin-bottom: 4px;"><span style="color:#556677;">MAGNITUDE:</span> <span style="color:#fff;">${evt.magnitude}</span></div>
        <div style="margin-bottom: 4px;"><span style="color:#556677;">DEPTH:</span> ${evt.depth} km</div>
        <div style="margin-bottom: 4px;"><span style="color:#556677;">TIME:</span> ${date}</div>
        ${evt.yield_kt ? `<div style="margin-bottom: 4px;"><span style="color:#556677;">EST. YIELD:</span> <span style="color:#ff6600;">${evt.yield_kt.toFixed(2)} kt</span></div>` : ''}
        <div style="margin: 8px 0; border-top: 1px solid ${color}33;"></div>
        <div style="margin-bottom: 4px;"><span style="color:#556677;">ANOMALY SCORE:</span> <span style="color:${color};">${evt.anomaly_score}</span></div>
        <div style="color: ${color}; font-weight: bold;">${getThreatLabel(evt.threat_level)}</div>
        ${evt.reasons?.length ? `
          <div style="margin-top: 8px; border-top: 1px solid ${color}33; padding-top: 8px;">
            <div style="color:#556677; margin-bottom: 4px;">ANALYSIS:</div>
            ${evt.reasons.map((r: string) => `<div style="margin-bottom: 2px;">• ${r}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function getMarkerSize(magnitude: number): number {
    if (magnitude >= 7) return 20;
    if (magnitude >= 6) return 16;
    if (magnitude >= 5) return 12;
    if (magnitude >= 4) return 9;
    return 6;
  }

  // ============================================================
  // REGION RECTANGLE
  // ============================================================
  function drawRegionRect(box: any) {
    if (!map || !L) return;

    if (regionRect) {
      map.removeLayer(regionRect);
      regionRect = null;
    }

    if (!box) return;

    regionRect = L.rectangle(
      [
        [box.minLat, box.minLng],
        [box.maxLat, box.maxLng],
      ],
      {
        color: '#00aaff',
        weight: 1,
        fillColor: '#00aaff',
        fillOpacity: 0.05,
        dashArray: '4 4',
        interactive: false,
      }
    ).addTo(map);
  }

  // ============================================================
  // PUBLIC
  // ============================================================
  export function flyTo(lat: number, lng: number, zoom = 6) {
    if (map) map.flyTo([lat, lng], zoom, { duration: 1.5 });
  }
  export function invalidate() {
  if (map) {
    setTimeout(() => map.invalidateSize(), 50);
    }
  }

</script>

<div bind:this={mapContainer} class="w-full h-full" id="seismon-map"></div>

<style>
  #seismon-map :global(.leaflet-tile-pane) {
    filter: brightness(0.85) saturate(0.6);
  }

  #seismon-map :global(.seismon-popup .leaflet-popup-content-wrapper) {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
  }

  #seismon-map :global(.seismon-popup .leaflet-popup-tip) {
    background: #0a0e1a;
  }

  #seismon-map :global(.seismon-popup .leaflet-popup-content) {
    margin: 0;
  }

  #seismon-map :global(.seismon-marker.pulse::after) {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    animation: pulse-ring 2s ease-out infinite;
    border: 2px solid currentColor;
  }

  @keyframes pulse-ring {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
  }
</style>