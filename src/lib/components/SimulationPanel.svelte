<script lang="ts">
  import { simConfig, simHistory, activeSimulation, isSimulating, simError, simPanelOpen, PRESET_LOCATIONS, runSimulation, applyPreset, resetSimConfig, clearSimHistory } from '$lib/stores/simulation';
  import { appMode } from '$lib/stores/events';
  import { getThreatColor, getThreatLabel } from '$lib/utils/classifier';
  import { narrator, NARRATOR_SCRIPTS } from '$lib/utils/narrator';

  // ============================================================
  // STATE
  // ============================================================
  let selectedPreset = PRESET_LOCATIONS[0];
  let showHistory = false;

  // ============================================================
  // ACTIONS
  // ============================================================
  async function handleRunSimulation() {
    appMode.set('SIMULATION');

    const result = await runSimulation($simConfig);

    if (result) {
      // Trigger narasi audio
      const script = NARRATOR_SCRIPTS.SIMULATION(
        $simConfig.label,
        $simConfig.magnitude
      );
      narrator.speak(script, 'warning');

      // Kalau critical, trigger narasi lebih dramatis
      if (result.threat_level === 'CRITICAL') {
        setTimeout(() => {
          const critScript = NARRATOR_SCRIPTS.CRITICAL(
            $simConfig.label,
            result.magnitude,
            result.anomaly_score
          );
          narrator.speak(critScript, 'critical');
        }, 3000);
      }
    }
  }

  function handlePresetSelect(preset: typeof PRESET_LOCATIONS[0]) {
    selectedPreset = preset;
    applyPreset(preset);
  }

  function handleClearHistory() {
    if (confirm('Clear all simulation history?')) {
      clearSimHistory();
    }
  }
</script>

<!-- TOGGLE BUTTON -->
<button
  class="sim-toggle"
  class:active={$simPanelOpen}
  on:click={() => simPanelOpen.update((v) => !v)}
>
  {#if $simPanelOpen}
    ✕ CLOSE SIM
  {:else}
    ⚛ SIMULATION
  {/if}
</button>

{#if $simPanelOpen}
  <div class="sim-panel">

    <!-- HEADER -->
    <div class="panel-header">
      <span class="blink-orange">⚛</span> SIMULATION MODE
      <span class="sim-warning">EDUCATIONAL ONLY</span>
    </div>

    <div class="disclaimer">
      This simulation uses real classification logic for educational purposes.
      All events are clearly marked as SIMULATION.
    </div>

    <!-- PRESET LOCATIONS -->
    <div class="section">
      <div class="section-title">⊕ KNOWN TEST SITES</div>
      <div class="preset-list">
        {#each PRESET_LOCATIONS.filter(p => p.name !== 'Custom Location') as preset}
          <button
            class="preset-btn"
            class:active={selectedPreset.name === preset.name}
            on:click={() => handlePresetSelect(preset)}
          >
            <span class="preset-name">{preset.name}</span>
            <span class="preset-meta">M{preset.magnitude} / {preset.depth}km</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="divider"></div>

    <!-- MANUAL CONFIG -->
    <div class="section">
      <div class="section-title">⊞ PARAMETERS</div>

      <!-- Label -->
      <div class="field">
        <label for='sim-label'>LABEL</label>
        <input
          id = 'sim-label'
          type="text"
          bind:value={$simConfig.label}
          placeholder="SIMULATION"
          maxlength="40"
        />
      </div>

      <!-- Magnitude -->
      <div class="field">
        <label for='sim-mag'>MAGNITUDE — <span class="val-highlight">{$simConfig.magnitude.toFixed(1)}</span></label>
        <input
          id = 'sim-mag'
          type="range"
          min="1"
          max="9"
          step="0.1"
          bind:value={$simConfig.magnitude}
        />
        <div class="range-labels">
          <span>1.0</span>
          <span>5.0</span>
          <span>9.0</span>
        </div>
      </div>

      <!-- Depth -->
      <div class="field">
        <label for='sim-depth'>DEPTH (km) — <span class="val-highlight">{$simConfig.depth}km</span></label>
        <input
          id = 'sim-depth'
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={$simConfig.depth}
        />
        <div class="range-labels">
          <span>0</span>
          <span>50km</span>
          <span>100km</span>
        </div>
      </div>

      <!-- Latitude -->
      <div class="field">
        <label for='sim-lat'>LATITUDE</label>
        <input
          id = 'sim-lat'
          type="number"
          bind:value={$simConfig.latitude}
          min="-90"
          max="90"
          step="0.01"
        />
      </div>

      <!-- Longitude -->
      <div class="field">
        <label for='sim-lng'>LONGITUDE</label>
        <input
          id = 'sim-lng'
          type="number"
          bind:value={$simConfig.longitude}
          min="-180"
          max="180"
          step="0.01"
        />
      </div>

      <!-- Yield (optional) -->
      <div class="field">
        <label for='sim-yield'>YIELD (kt) — OPTIONAL</label>
        <input
          id = 'sim-yield'
          type="number"
          bind:value={$simConfig.yield_kt}
          min="0"
          step="0.1"
          placeholder="Auto-estimate"
        />
      </div>
    </div>

    <!-- PREVIEW SCORE -->
    <div class="preview-block">
      <div class="preview-title">CLASSIFICATION PREVIEW</div>
      <div class="preview-params">
        <span>LAT: {$simConfig.latitude.toFixed(2)}°</span>
        <span>LNG: {$simConfig.longitude.toFixed(2)}°</span>
        <span>DEP: {$simConfig.depth}km</span>
        <span>MAG: {$simConfig.magnitude.toFixed(1)}</span>
      </div>
    </div>

    <!-- ERROR -->
    {#if $simError}
      <div class="error-msg">⚠ {$simError}</div>
    {/if}

    <!-- ACTION BUTTONS -->
    <div class="action-row">
      <button class="reset-btn" on:click={resetSimConfig}>
        ↺ RESET
      </button>
      <button
        class="run-btn"
        on:click={handleRunSimulation}
        disabled={$isSimulating}
      >
        {#if $isSimulating}
          <span class="blink-orange">◉</span> RUNNING...
        {:else}
          ▶ RUN SIMULATION
        {/if}
      </button>
    </div>

    <div class="divider"></div>

    <!-- ACTIVE RESULT -->
    {#if $activeSimulation}
      {@const color = getThreatColor($activeSimulation.threat_level)}
      <div class="result-block" style="border-color: {color}44;">
        <div class="result-title" style="color: {color};">
          LAST RESULT
        </div>
        <div class="result-row">
          <span class="result-key">THREAT</span>
          <span style="color: {color}; font-weight: bold;">
            {$activeSimulation.threat_level}
          </span>
        </div>
        <div class="result-row">
          <span class="result-key">SCORE</span>
          <span style="color: {color};">{$activeSimulation.anomaly_score}</span>
        </div>
        {#if $activeSimulation.estimated_yield_kt}
          <div class="result-row">
            <span class="result-key">EST. YIELD</span>
            <span style="color: #ff6600;">~{$activeSimulation.estimated_yield_kt.toFixed(2)} kt</span>
          </div>
        {/if}
        <div class="result-label" style="color: {color};">
          {getThreatLabel($activeSimulation.threat_level)}
        </div>

        <!-- Reasons -->
        {#if $activeSimulation.reasons?.length}
          <div class="reasons">
            {#each $activeSimulation.reasons as reason}
              <div class="reason-item">• {reason}</div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- HISTORY -->
    {#if $simHistory.length > 0}
      <div class="section">
        <button class="section-title history-toggle" on:click={() => showHistory = !showHistory}>
          ◈ HISTORY ({$simHistory.length})
          <span style="float:right;">{showHistory ? '▲' : '▼'}</span>
        </button>

        {#if showHistory}
          <div class="history-list">
            {#each $simHistory as sim}
              {@const color = getThreatColor(sim.threat_level)}
              <div class="history-item" style="border-left-color: {color};">
                <div class="history-top">
                  <span style="color:{color};">M{sim.magnitude}</span>
                  <span style="color:{color};">[{sim.anomaly_score}]</span>
                </div>
                <div class="history-label">{sim.label}</div>
              </div>
            {/each}
          </div>

          <button class="clear-btn" on:click={handleClearHistory}>
            ✕ CLEAR HISTORY
          </button>
        {/if}
      </div>
    {/if}

  </div>
{/if}

<style>
  .sim-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0a1525;
    border: 1px solid #ff660066;
    color: #ff6600;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 8px 14px;
    cursor: pointer;
    letter-spacing: 1.5px;
    z-index: 1000;
    transition: all 0.2s;
  }

  .sim-toggle:hover,
  .sim-toggle.active {
    background: #ff66001a;
    border-color: #ff6600;
    box-shadow: 0 0 12px #ff660044;
  }

  .history-toggle {
    background: transparent;
    border: none;
    color: #445566;
    font-family: 'Courier New', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    margin-bottom: 2px;
  }

 .history-toggle:hover {
    color: #667788;
 }

  .sim-panel {
    position: fixed;
    bottom: 60px;
    right: 20px;
    width: 280px;
    max-height: 80vh;
    background: #070b14;
    border: 1px solid #ff660033;
    color: #8899aa;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 999;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: #1a2a3a #070b14;
    box-shadow: 0 0 24px #ff660022;
  }

  .panel-header {
    background: #0a1020;
    border-bottom: 1px solid #ff660033;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: bold;
    color: #ff6600;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sim-warning {
    margin-left: auto;
    font-size: 8px;
    color: #ff660088;
    letter-spacing: 1px;
  }

  .disclaimer {
    padding: 8px 12px;
    font-size: 9px;
    color: #445566;
    border-bottom: 1px solid #1a2a3a;
    line-height: 1.4;
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

  .preset-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .preset-btn {
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #667788;
    font-family: 'Courier New', monospace;
    font-size: 9px;
    padding: 5px 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preset-btn:hover,
  .preset-btn.active {
    border-color: #ff660066;
    color: #ff6600;
    background: #ff66001a;
  }

  .preset-name {
    font-size: 9px;
  }

  .preset-meta {
    font-size: 8px;
    color: #445566;
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
    color: #ff6600;
  }

  input[type='text'],
  input[type='number'] {
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
  }

  input[type='text']:focus,
  input[type='number']:focus {
    border-color: #ff660066;
  }

  input[type='range'] {
    accent-color: #ff6600;
    width: 100%;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #334455;
  }

  .preview-block {
    margin: 0 12px;
    padding: 8px;
    background: #0a1020;
    border: 1px solid #1a2a3a;
    border-radius: 2px;
  }

  .preview-title {
    color: #445566;
    font-size: 8px;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .preview-params {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 9px;
    color: #667788;
  }

  .error-msg {
    margin: 0 12px;
    padding: 6px 8px;
    background: #ff000011;
    border: 1px solid #ff000044;
    color: #ff6666;
    font-size: 9px;
    border-radius: 2px;
  }

  .action-row {
    display: flex;
    gap: 6px;
    padding: 10px 12px;
  }

  .reset-btn {
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #667788;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-btn:hover {
    border-color: #4af4;
    color: #4af;
  }

  .run-btn {
    flex: 1;
    background: #0a1525;
    border: 1px solid #ff660066;
    color: #ff6600;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 8px;
    cursor: pointer;
    letter-spacing: 1px;
    font-weight: bold;
    transition: all 0.2s;
  }

  .run-btn:hover:not(:disabled) {
    background: #ff66001a;
    box-shadow: 0 0 12px #ff660044;
  }

  .run-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .divider {
    border-top: 1px solid #1a2a3a;
    margin: 0 10px;
  }

  .result-block {
    margin: 10px 12px;
    padding: 10px;
    background: #0a1020;
    border: 1px solid #1a2a3a;
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-title {
    font-size: 9px;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .result-key {
    color: #445566;
  }

  .result-label {
    font-size: 9px;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  .reasons {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #1a2a3a;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reason-item {
    font-size: 8px;
    color: #556677;
    line-height: 1.4;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .history-item {
    background: #0a1020;
    border-left: 2px solid #1a2a3a;
    padding: 5px 8px;
  }

  .history-top {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    margin-bottom: 2px;
  }

  .history-label {
    font-size: 8px;
    color: #445566;
  }

  .clear-btn {
    background: transparent;
    border: 1px solid #ff000033;
    color: #ff4444;
    font-family: 'Courier New', monospace;
    font-size: 9px;
    padding: 5px;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
    letter-spacing: 1px;
  }

  .clear-btn:hover {
    background: #ff00001a;
    border-color: #ff0000;
  }

  .blink-orange {
    animation: blink 1s step-end infinite;
    color: #ff6600;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>