# SEISMON — Seismic Anomaly Monitor

## Tech Stack
- Frontend: SvelteKit + TypeScript (Svelte 5 runes mode)
- Styling: Tailwind CSS
- Map: Leaflet.js
- Database: Supabase (PostgreSQL)
- Deploy: Vercel (serverless)
- Audio: Web Speech API

## Struktur File
src/lib/utils/classifier.ts     — anomaly scoring logic
src/lib/utils/narrator.ts       — Web Speech API wrapper
src/lib/db/supabase.ts          — Supabase client
src/routes/api/fetch-live/      — polling USGS realtime
src/routes/api/historical/      — USGS historical fetch
src/routes/api/simulate/        — simulation endpoint
src/lib/stores/events.ts        — event state management
src/lib/stores/simulation.ts    — simulation state
src/lib/stores/region.ts        — region filter state
src/lib/components/Map.svelte
src/lib/components/ThreatPanel.svelte
src/lib/components/Timeline.svelte
src/lib/components/SimulationPanel.svelte
src/lib/components/AlertOverlay.svelte
src/routes/+page.svelte

## Keputusan Arsitektur Penting
- Svelte 5 runes mode aktif (runes: true di svelte.config.js)
- Hanya anomaly events yang disimpan ke DB (bukan semua gempa)
- Historical data fetch langsung dari USGS, zero storage
- Rule-based classifier (bukan ML) dengan scoring system
- on:click → onclick (Svelte 5 syntax)
- Reactive variables pakai $state(), computed pakai derived()

## Yang Masih Perlu Dikerjakan
- Fine-tuning UI
- [tambahkan bug/fitur yang ingin dikerjakan]