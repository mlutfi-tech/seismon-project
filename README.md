# SEISMON — Seismic Anomaly Monitor

> Real-time seismic anomaly detection system with nuclear test simulation capability.
> Built for educational purposes.

![SEISMON Dashboard](https://img.shields.io/badge/status-WIP-orange?style=flat-square)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)

---

## ⚠️ Disclaimer

SEISMON is an **educational tool** built for learning purposes. It uses real seismic data
from USGS to visualize and classify anomalous events. The anomaly classification system
is rule-based and **does not constitute verified intelligence**. Simulation features are
clearly labeled and exist solely for educational demonstration.

---

## Features

- **Live Monitoring** — Real-time seismic data from USGS, polled every 60 seconds
- **Anomaly Classification** — Rule-based scoring system to flag suspicious seismic events
- **Historical Data** — Fetch and analyze past events by date range and region
- **Simulation Mode** — Inject synthetic events to test the classification pipeline
- **Threat Level System** — DEFCON-style indicator (NATURAL → SUSPICIOUS → HIGH ANOMALY → CRITICAL)
- **Region Filter** — Focus monitoring on specific geographic areas
- **Audio Narrator** — Web Speech API narration for alerts and events
- **Alert Overlay** — Full-screen alert system for anomaly events

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit + TypeScript (Svelte 5 Runes) |
| Styling | Tailwind CSS |
| Map | Leaflet.js |
| Database | Supabase (PostgreSQL) |
| Backend | Vercel Serverless Functions |
| Audio | Web Speech API |
| Data Source | USGS Earthquake API |

---

## Anomaly Classification

SEISMON uses a rule-based scoring system to classify seismic events:

| Parameter | Condition | Score |
|---|---|---|
| Depth | < 5km (surface/shallow) | +30 |
| Depth | < 10km | +15 |
| Magnitude | 4.5 – 6.0 (nuclear test range) | +20 |
| Location | Known sensitive zone | +25 |
| Location | Outside active seismic zone | +15 |
| Pattern | Isolated event, non-active zone | +15 |
| Combined | Shallow depth + non-seismic location | +10 |

**Threat Levels:**

| Score | Level | Description |
|---|---|---|
| 0 – 30 | 🟢 NATURAL | Normal seismic activity |
| 31 – 60 | 🟡 SUSPICIOUS | Anomalous parameters detected |
| 61 – 80 | 🟠 HIGH ANOMALY | Possible artificial event |
| 81+ | 🔴 CRITICAL | Possible detonation event |

---

## Project Structure
```
seismon/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Map.svelte              # Leaflet map with markers & threat circles
│   │   │   ├── ThreatPanel.svelte      # DEFCON indicator & anomaly list
│   │   │   ├── Timeline.svelte         # Historical data & region filter
│   │   │   ├── SimulationPanel.svelte  # Simulation configuration & history
│   │   │   └── AlertOverlay.svelte     # Full-screen alert system
│   │   ├── db/
│   │   │   └── supabase.ts             # Supabase client & query helpers
│   │   ├── stores/
│   │   │   ├── events.ts               # Live & historical event state
│   │   │   ├── simulation.ts           # Simulation state & actions
│   │   │   └── region.ts               # Region filter state
│   │   └── utils/
│   │       ├── classifier.ts           # Anomaly scoring logic
│   │       └── narrator.ts             # Web Speech API wrapper
│   └── routes/
│       ├── api/
│       │   ├── fetch-live/+server.ts   # USGS realtime polling
│       │   ├── historical/+server.ts   # USGS historical fetch
│       │   └── simulate/+server.ts     # Simulation endpoint
│       └── +page.svelte                # Main dashboard
├── svelte.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Supabase account

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/seismon.git
cd seismon

# Install dependencies
npm install
```

### Environment Variables

Create file `.env` at root project:
```env
# Public — safe for frontend
PUBLIC_SUPABASE_URL=your_project_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Private — server only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Setup
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usgs_id TEXT UNIQUE NOT NULL,
  magnitude FLOAT NOT NULL,
  depth FLOAT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  location TEXT,
  time TIMESTAMPTZ NOT NULL,
  anomaly_score INT DEFAULT 0,
  threat_level TEXT DEFAULT 'NATURAL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  magnitude FLOAT NOT NULL,
  depth FLOAT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  yield_kt FLOAT,
  anomaly_score INT DEFAULT 0,
  threat_level TEXT DEFAULT 'NATURAL',
  label TEXT DEFAULT 'SIMULATION',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_lat FLOAT NOT NULL,
  max_lat FLOAT NOT NULL,
  min_lng FLOAT NOT NULL,
  max_lng FLOAT NOT NULL
);

INSERT INTO regions (name, min_lat, max_lat, min_lng, max_lng) VALUES
  ('Global', -90, 90, -180, 180),
  ('Southeast Asia', -11, 28, 92, 141),
  ('North Korea', 37.5, 43, 124, 131),
  ('Middle East', 12, 42, 26, 63),
  ('Central Asia', 35, 55, 50, 90);
```

### Development
```bash
npm run dev
```
Open `http://localhost:5173`

---

## Data Sources

- **[USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/)** — Historical seismic data
- **[USGS GeoJSON Feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)** — Realtime seismic feed

---

## License

MIT License — feel free to use for educational purposes.

---

## Acknowledgements

- [USGS](https://earthquake.usgs.gov) — Earthquake data API
- [Leaflet.js](https://leafletjs.com) — Interactive map library  
- [Supabase](https://supabase.com) — Database & backend
- [CartoDB](https://carto.com) — Dark map tiles

---

## Built With

This project was developed with assistance from [Claude](https://claude.ai) by Anthropic.

---

> *"All data is for educational purposes only. SEISMON does not claim to provide verified
> intelligence or official threat assessments."*