<script lang="ts">
  import { onMount } from 'svelte';
  import { appMode, fetchHistoricalEvents, isLoading, clearEvents, startPolling, stopPolling } from '$lib/stores/events';
  import { activeRegion, activeBoundingBox, loadRegions, regions, setActiveRegion, resetRegion } from '$lib/stores/region';
  import type { Region } from '$lib/stores/region';

  // ============================================================
  // STATE — Svelte 5 runes
  // ============================================================
  let startDate = $state('');
  let endDate = $state('');
  let minMag = $state(2.5);
  let limit = $state(200);
  let errorMsg = $state('');

  // Set default dates — 7 hari terakhir
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  endDate = now.toISOString().slice(0, 16);
  startDate = weekAgo.toISOString().slice(0, 16);

  onMount(() => loadRegions());

  // ============================================================
  // ACTIONS
  // ============================================================
  async function handleHistoricalFetch() {
    errorMsg = '';

    if (!startDate || !endDate) {
      errorMsg = 'Start and end date required.';
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      errorMsg = 'Start date must be before end date.';
      return;
    }

    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      errorMsg = 'Max range is 30 days to avoid USGS rate limits.';
      return;
    }

    const box = $activeBoundingBox;

    stopPolling();
    appMode.set('HISTORICAL');

    await fetchHistoricalEvents({
      startTime: new Date(startDate).toISOString(),
      endTime: new Date(endDate).toISOString(),
      minMag,
      limit,
      ...(box && {
        minLat: box.minLat,
        maxLat: box.maxLat,
        minLng: box.minLng,
        maxLng: box.maxLng,
      }),
    });
  }

  function handleBackToLive() {
    clearEvents();
    appMode.set('LIVE');
    startPolling();
    resetRegion();
  }

  function handleRegionChange(region: Region) {
    setActiveRegion(region);
  }

  function setPreset(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    endDate = end.toISOString().slice(0, 16);
    startDate = start.toISOString().slice(0, 16);
  }
</script>

<div class="timeline-panel">

  <!-- HEADER -->
  <div class="panel-header">
    <span>◈ TIMELINE</span>
    <span
      class="mode-badge"
      class:live={$appMode === 'LIVE'}
      class:historical={$appMode === 'HISTORICAL'}
    >
      {$appMode}
    </span>
  </div>

  <!-- BACK TO LIVE -->
  {#if $appMode === 'HISTORICAL'}
    <button class="back-btn" onclick={handleBackToLive}>
      ← BACK TO LIVE
    </button>
  {/if}

  <!-- REGION FILTER -->
  <div class="section">
    <div class="section-title">⊕ REGION FILTER</div>
    <div class="region-list">
      {#each $regions as region}
        <button
          class="region-btn"
          class:active={$activeRegion.name === region.name}
          onclick={() => handleRegionChange(region)}
        >
          {region.name}
        </button>
      {/each}
    </div>
  </div>

  <div class="divider"></div>

  <!-- DATE RANGE -->
  <div class="section">
    <div class="section-title">⊞ DATE RANGE</div>

    <!-- Quick presets -->
    <div class="preset-row">
      {#each [[1, '24H'], [3, '3D'], [7, '7D'], [14, '14D'], [30, '30D']] as [days, label]}
        <button
          class="preset-btn"
          onclick={() => setPreset(Number(days))}
        >
          {label}
        </button>
      {/each}
    </div>

    <div class="field">
      <label for="start-date">START</label>
      <input
        id="start-date"
        type="datetime-local"
        bind:value={startDate}
        max={endDate}
      />
    </div>

    <div class="field">
      <label for="end-date">END</label>
      <input
        id="end-date"
        type="datetime-local"
        bind:value={endDate}
        min={startDate}
      />
    </div>
  </div>

  <div class="divider"></div>

  <!-- FILTER OPTIONS -->
  <div class="section">
    <div class="section-title">⊟ FILTER OPTIONS</div>

    <div class="field">
      <label for="min-mag">MIN MAGNITUDE — <span class="val-highlight">M{minMag}</span></label>
      <input
        id="min-mag"
        type="range"
        min="0"
        max="9"
        step="0.5"
        bind:value={minMag}
      />
      <div class="range-labels">
        <span>0</span>
        <span>4.5</span>
        <span>9</span>
      </div>
    </div>

    <div class="field">
      <label for="max-results">MAX RESULTS — <span class="val-highlight">{limit}</span></label>
      <input
        id="max-results"
        type="range"
        min="50"
        max="500"
        step="50"
        bind:value={limit}
      />
      <div class="range-labels">
        <span>50</span>
        <span>250</span>
        <span>500</span>
      </div>
    </div>
  </div>

  <!-- ERROR MSG -->
  {#if errorMsg}
    <div class="error-msg">⚠ {errorMsg}</div>
  {/if}

  <!-- FETCH BUTTON -->
  <button
    class="fetch-btn"
    onclick={handleHistoricalFetch}
    disabled={$isLoading}
  >
    {#if $isLoading}
      <span class="blink">◉</span> FETCHING...
    {:else}
      ▶ FETCH HISTORICAL DATA
    {/if}
  </button>

</div>

<style>
  .timeline-panel {
    background: #070b14;
    border: 1px solid #1a2a3a;
    color: #8899aa;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 220px;
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
    font-size: 12px;
    font-weight: bold;
    color: #4af;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mode-badge {
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 2px;
    letter-spacing: 1px;
  }

  .mode-badge.live {
    background: #00ff4122;
    color: #00ff41;
    border: 1px solid #00ff4144;
  }

  .mode-badge.historical {
    background: #4af2;
    color: #4af;
    border: 1px solid #4af4;
  }

  .back-btn {
    margin: 8px 10px;
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #4af;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 6px 10px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.2s;
    text-align: left;
    width: calc(100% - 20px);
  }

  .back-btn:hover {
    border-color: #4af;
    background: #4af1;
  }

  .section {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-title {
    color: #445566;
    font-size: 9px;
    letter-spacing: 1.5px;
    margin-bottom: 2px;
  }

  .region-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .region-btn {
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #667788;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 5px 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    letter-spacing: 0.5px;
  }

  .region-btn:hover {
    border-color: #4af4;
    color: #4af;
  }

  .region-btn.active {
    border-color: #4af;
    color: #4af;
    background: #4af1;
  }

  .preset-row {
    display: flex;
    gap: 3px;
  }

  .preset-btn {
    flex: 1;
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #556677;
    font-family: 'Courier New', monospace;
    font-size: 9px;
    padding: 4px 2px;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.5px;
  }

  .preset-btn:hover {
    border-color: #4af4;
    color: #4af;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  label {
    color: #445566;
    font-size: 9px;
    letter-spacing: 1px;
  }

  .val-highlight {
    color: #4af;
  }

  input[type='datetime-local'] {
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #8899aa;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 5px 8px;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
    color-scheme: dark;
  }

  input[type='datetime-local']:focus {
    border-color: #4af4;
  }

  input[type='range'] {
    accent-color: #4af;
    width: 100%;
    height: 3px;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #334455;
  }

  .divider {
    border-top: 1px solid #1a2a3a;
    margin: 0 10px;
  }

  .error-msg {
    margin: 0 10px;
    padding: 6px 8px;
    background: #ff000011;
    border: 1px solid #ff000044;
    color: #ff6666;
    font-size: 9px;
    border-radius: 2px;
  }

  .fetch-btn {
    margin: 10px;
    background: #0a1525;
    border: 1px solid #4af4;
    color: #4af;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 10px;
    cursor: pointer;
    letter-spacing: 1.5px;
    transition: all 0.2s;
    font-weight: bold;
  }

  .fetch-btn:hover:not(:disabled) {
    background: #4af2;
    box-shadow: 0 0 12px #4af4;
  }

  .fetch-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .blink {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>