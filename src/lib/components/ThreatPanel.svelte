<script lang="ts">
  import { derived } from 'svelte/store';
  import { globalThreatLevel, eventStats, criticalEvents, anomalyEvents, lastUpdated, isPolling } from '$lib/stores/events';
  import { getThreatColor, getThreatLabel } from '$lib/utils/classifier';
  import { activeRegionLabel } from '$lib/stores/region';

  const DEFCON_MAP = {
    NATURAL:      { level: 5, label: 'DEFCON 5', sub: 'FADE OUT' },
    SUSPICIOUS:   { level: 4, label: 'DEFCON 4', sub: 'DOUBLE TAKE' },
    HIGH_ANOMALY: { level: 3, label: 'DEFCON 3', sub: 'ROUND HOUSE' },
    CRITICAL:     { level: 2, label: 'DEFCON 2', sub: 'FAST PACE' },
  };

  const defcon = derived(globalThreatLevel, (level) => DEFCON_MAP[level]);
  const threatColor = derived(globalThreatLevel, (level) => getThreatColor(level));
  const threatLabel = derived(globalThreatLevel, (level) => getThreatLabel(level));
  const formattedTime = derived(lastUpdated, (t) =>
    t ? t.toUTCString().replace('GMT', 'UTC') : 'AWAITING DATA...'
  );
</script>

<div class="threat-panel">

  <!-- HEADER -->
  <div class="panel-header">
    <span class="blink">◉</span> SEISMON
    <span class="version">v1.0</span>
  </div>

  <!-- DEFCON INDICATOR -->
  <div class="defcon-block" style="border-color: {$threatColor}44;">
    <div class="defcon-label" style="color: {$threatColor};">
      {$defcon.label}
    </div>
    <div class="defcon-sub">{$defcon.sub}</div>

    <div class="defcon-bars">
      {#each [5, 4, 3, 2, 1] as level}
        <div
          class="defcon-bar"
          style="
            background: {level >= $defcon.level ? $threatColor : '#1a2233'};
            box-shadow: {level >= $defcon.level ? `0 0 8px ${$threatColor}88` : 'none'};
          "
        ></div>
      {/each}
    </div>

    <div class="threat-label" style="color: {$threatColor};">
      {$threatLabel}
    </div>
  </div>

  <!-- STATS GRID -->
  <div class="stats-grid">
    <div class="stat-item">
      <div class="stat-value">{$eventStats.total}</div>
      <div class="stat-label">TOTAL</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #00ff41;">{$eventStats.natural}</div>
      <div class="stat-label">NATURAL</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #ffd700;">{$eventStats.suspicious}</div>
      <div class="stat-label">SUSPICIOUS</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #ff6600;">{$eventStats.high_anomaly}</div>
      <div class="stat-label">HIGH</div>
    </div>
    <div class="stat-item">
      <div class="stat-value" style="color: #ff0000;">{$eventStats.critical}</div>
      <div class="stat-label">CRITICAL</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- REGION & STATUS -->
  <div class="status-block">
    <div class="status-row">
      <span class="status-key">REGION</span>
      <span class="status-val">{$activeRegionLabel}</span>
    </div>
    <div class="status-row">
      <span class="status-key">POLLING</span>
      <span class="status-val" style="color: {$isPolling ? '#00ff41' : '#ff0000'};">
        {$isPolling ? '● ACTIVE' : '○ STOPPED'}
      </span>
    </div>
    <div class="status-row">
      <span class="status-key">UPDATED</span>
      <span class="status-val time">{$formattedTime}</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- ANOMALY EVENT LIST -->
  <div class="anomaly-header">
    ⚠ ANOMALY EVENTS
    <span class="anomaly-count">{$anomalyEvents.length}</span>
  </div>

  <div class="anomaly-list">
    {#if $anomalyEvents.length === 0}
      <div class="no-anomaly">No anomalies detected</div>
    {:else}
      {#each $anomalyEvents.slice(0, 8) as evt}
        {@const color = getThreatColor(evt.threat_level)}
        <div class="anomaly-item" style="border-left-color: {color};">
          <div class="anomaly-top">
            <span class="anomaly-mag" style="color: {color};">
              M{evt.magnitude.toFixed(1)}
            </span>
            <span class="anomaly-score" style="color: {color};">
              [{evt.anomaly_score}]
            </span>
            {#if evt.is_simulation}
              <span class="sim-badge">SIM</span>
            {/if}
          </div>
          <div class="anomaly-loc">{evt.location}</div>
          <div class="anomaly-depth">
            DEPTH: {evt.depth}km
            {#if evt.yield_kt}
              | YIELD: ~{evt.yield_kt.toFixed(1)}kt
            {/if}
          </div>
        </div>
      {/each}

      {#if $anomalyEvents.length > 8}
        <div class="more-events">
          +{$anomalyEvents.length - 8} more events
        </div>
      {/if}
    {/if}
  </div>

  <!-- CRITICAL ALERT -->
  {#if $criticalEvents.length > 0}
    <div class="critical-alert">
      <div class="critical-title blink">⚠ CRITICAL ALERT</div>
      <div class="critical-count">
        {$criticalEvents.length} CRITICAL EVENT{$criticalEvents.length > 1 ? 'S' : ''} DETECTED
      </div>
    </div>
  {/if}

</div>

<style>
  .threat-panel {
    background: #070b14;
    border: 1px solid #1a2a3a;
    color: #8899aa;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 240px;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 0;
    scrollbar-width: thin;
    scrollbar-color: #1a2a3a #070b14;
  }

  .panel-header {
    background: #0a1020;
    border-bottom: 1px solid #1a2a3a;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: bold;
    color: #4af;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .version {
    margin-left: auto;
    font-size: 9px;
    color: #334455;
  }

  .defcon-block {
    padding: 14px 12px;
    border: 1px solid #1a2a3a;
    margin: 10px;
    border-radius: 2px;
    text-align: center;
  }

  .defcon-label {
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 3px;
    transition: color 0.5s;
  }

  .defcon-sub {
    font-size: 9px;
    color: #445566;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }

  .defcon-bars {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin-bottom: 10px;
  }

  .defcon-bar {
    width: 28px;
    height: 8px;
    border-radius: 1px;
    transition: background 0.5s, box-shadow 0.5s;
  }

  .threat-label {
    font-size: 9px;
    letter-spacing: 1px;
    transition: color 0.5s;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 0 10px 10px;
    gap: 4px;
  }

  .stat-item {
    text-align: center;
    background: #0a1020;
    padding: 6px 2px;
    border-radius: 2px;
  }

  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #ccd;
  }

  .stat-label {
    font-size: 7px;
    color: #445566;
    letter-spacing: 0.5px;
  }

  .divider {
    border-top: 1px solid #1a2a3a;
    margin: 0 10px;
  }

  .status-block {
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-key {
    color: #445566;
    font-size: 9px;
    letter-spacing: 1px;
  }

  .status-val {
    color: #8899aa;
    font-size: 9px;
    text-align: right;
  }

  .status-val.time {
    font-size: 8px;
    color: #556677;
  }

  .anomaly-header {
    padding: 8px 12px;
    color: #ffd700;
    font-size: 10px;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .anomaly-count {
    background: #ffd70022;
    color: #ffd700;
    padding: 1px 5px;
    border-radius: 2px;
    font-size: 9px;
  }

  .anomaly-list {
    padding: 0 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .no-anomaly {
    color: #334455;
    font-size: 10px;
    text-align: center;
    padding: 16px 0;
  }

  .anomaly-item {
    background: #0a1020;
    border-left: 2px solid #1a2a3a;
    padding: 6px 8px;
    border-radius: 0 2px 2px 0;
    transition: border-color 0.3s;
  }

  .anomaly-top {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }

  .anomaly-mag {
    font-weight: bold;
    font-size: 12px;
  }

  .anomaly-score {
    font-size: 9px;
    margin-left: auto;
  }

  .sim-badge {
    background: #ff660033;
    color: #ff6600;
    font-size: 8px;
    padding: 1px 4px;
    border-radius: 2px;
  }

  .anomaly-loc {
    color: #667788;
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .anomaly-depth {
    color: #445566;
    font-size: 8px;
    margin-top: 2px;
  }

  .more-events {
    color: #445566;
    font-size: 9px;
    text-align: center;
    padding: 4px 0;
  }

  .critical-alert {
    margin: 10px;
    padding: 10px;
    border: 1px solid #ff000066;
    background: #ff000011;
    text-align: center;
    border-radius: 2px;
  }

  .critical-title {
    color: #ff0000;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }

  .critical-count {
    color: #ff6666;
    font-size: 9px;
  }

  .blink {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>