<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Map from '$lib/components/Map.svelte';
  import ThreatPanel from '$lib/components/ThreatPanel.svelte';
  import Timeline from '$lib/components/Timeline.svelte';
  import SimulationPanel from '$lib/components/SimulationPanel.svelte';
  import AlertOverlay from '$lib/components/AlertOverlay.svelte';
  import { startPolling, stopPolling, appMode, isLoading, fetchError, lastUpdated } from '$lib/stores/events';
  import { narrator } from '$lib/utils/narrator';

  let mapComponent: Map | undefined = $state(undefined);
  let timelinePanelOpen = $state(true);
  let narratorEnabled = $state(true);
  let bootSequence = $state(true);
  let bootLines: string[] = $state([]);
  let narratorGreeted = $state(false);

  const BOOT_MESSAGES = [
    'SEISMON v1.0 — Seismic Anomaly Monitor',
    'Initializing subsystems...',
    'Loading classifier engine... OK',
    'Connecting to USGS feed... OK',
    'Initializing Supabase connection... OK',
    'Loading region database... OK',
    'Calibrating anomaly thresholds... OK',
    'Narrator system ready... OK',
    'All systems nominal.',
    'Starting live monitoring...',
  ];

  onMount(() => {
    narrator.init();

    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_MESSAGES.length) {
        bootLines = [...bootLines, BOOT_MESSAGES[i]];
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          bootSequence = false;
          startPolling(60000);
          setTimeout(() => {
            narrator.speak(
              'SEISMON online. Live seismic monitoring active. Awaiting anomaly detection.',
              'info'
            );
          }, 500);
        }, 800);
      }
    }, 180);
  });

  onDestroy(() => {
    stopPolling();
    narrator.stop();
  });

  function toggleNarrator() {
    narratorEnabled = !narratorEnabled;
    narrator.setEnabled(narratorEnabled);
  }

  function handleFirstInteraction() {
  if (!narratorGreeted && narratorEnabled) {
    narratorGreeted = true;
    narrator.speak(
      'SEISMON online. Live seismic monitoring active. Awaiting anomaly detection.',
      'info'
      );
    }
  }
  
</script>

<svelte:head>
  <title>SEISMON — Seismic Anomaly Monitor</title>
  <meta name="description" content="Real-time seismic anomaly detection and nuclear test simulation for educational purposes." />
</svelte:head>

<!-- BOOT SEQUENCE -->
{#if bootSequence}
  <div class="boot-screen">
    <div class="boot-content">
      <div class="boot-logo">
        <pre class="ascii-logo">
███████╗███████╗██╗███████╗███╗   ███╗ ██████╗ ███╗   ██╗
██╔════╝██╔════╝██║██╔════╝████╗ ████║██╔═══██╗████╗  ██║
███████╗█████╗  ██║███████╗██╔████╔██║██║   ██║██╔██╗ ██║
╚════██║██╔══╝  ██║╚════██║██║╚██╔╝██║██║   ██║██║╚██╗██║
███████║███████╗██║███████║██║ ╚═╝ ██║╚██████╔╝██║ ╚████║
╚══════╝╚══════╝╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝</pre>
        <div class="boot-subtitle">SEISMIC ANOMALY MONITOR</div>
      </div>

      <div class="boot-log">
        {#each bootLines as line, i}
          <div class="boot-line" class:last={i === bootLines.length - 1}>
            <span class="boot-prompt">{'>'}</span>
            {line}
          </div>
        {/each}
        {#if bootLines.length < BOOT_MESSAGES.length}
          <div class="boot-cursor blink">_</div>
        {/if}
      </div>
    </div>
  </div>

<!-- MAIN DASHBOARD -->
{:else}
  <div class="dashboard">

    <!-- TOP BAR -->
    <div class="topbar">
      <div class="topbar-left">
        <span class="topbar-logo">SEISMON</span>
        <span class="topbar-version">v1.0</span>
        <span class="topbar-divider">|</span>
        <span
          class="mode-indicator"
          class:live={$appMode === 'LIVE'}
          class:historical={$appMode === 'HISTORICAL'}
          class:simulation={$appMode === 'SIMULATION'}
        >
          {#if $appMode === 'LIVE'}
            <span class="blink">●</span>
          {:else}
            ◈
          {/if}
          {$appMode} MODE
        </span>

        {#if $isLoading}
          <span class="loading-indicator blink">◉ FETCHING...</span>
        {/if}

        {#if $fetchError}
          <span class="error-indicator">⚠ {$fetchError}</span>
        {/if}
      </div>

      <div class="topbar-right">
        {#if $lastUpdated}
          <span class="last-updated">
            LAST UPDATE: {$lastUpdated.toUTCString().slice(0, 25)}
          </span>
        {/if}

        <!-- Narrator toggle -->
        <button
          class="topbar-btn"
          class:active={narratorEnabled}
          onclick={() => {handleFirstInteraction(); toggleNarrator();}}
          title="Toggle narrator"
        >
          {narratorEnabled ? '🔊 AUDIO ON' : '🔇 AUDIO OFF'}
        </button>

        <!-- Timeline toggle -->
        <button
          class="topbar-btn"
          class:active={timelinePanelOpen}
          onclick={() => {handleFirstInteraction(); timelinePanelOpen = !timelinePanelOpen; }}
        >
          ◈ TIMELINE
        </button>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="main-content">

      <!-- LEFT — Threat Panel -->
      <ThreatPanel />

      <!-- CENTER — Map -->
      <div class="map-wrapper">
        <Map bind:this={mapComponent} />

        <!-- Map overlay — coordinates display -->
        <div class="map-overlay-br">
          <div class="coord-display">
            SEISMON GLOBAL MONITOR
          </div>
        </div>

        <!-- Map overlay — grid lines decoration -->
        <div class="map-grid-overlay" aria-hidden="true"></div>
      </div>

      <!-- RIGHT — Timeline Panel -->
      {#if timelinePanelOpen}
        <Timeline />
      {/if}

    </div>

    <!-- SIMULATION PANEL — floating -->
    <SimulationPanel />

    <!-- ALERT OVERLAY — fullscreen -->
    <AlertOverlay />

  </div>
{/if}

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: #030508;
    color: #8899aa;
    font-family: 'Courier New', Courier, monospace;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  /* ============================================================
     BOOT SCREEN
  ============================================================ */
  .boot-screen {
    position: fixed;
    inset: 0;
    background: #030508;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .boot-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 700px;
    width: 100%;
    padding: 24px;
  }

  .boot-logo {
    text-align: center;
  }

  .ascii-logo {
    color: #00aaff;
    font-size: 8px;
    line-height: 1.2;
    white-space: pre;
    text-shadow: 0 0 20px #00aaff88;
  }

  .boot-subtitle {
    color: #334455;
    font-size: 11px;
    letter-spacing: 4px;
    margin-top: 8px;
  }

  .boot-log {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid #1a2a3a;
    padding: 16px;
    background: #070b14;
    min-height: 200px;
  }

  .boot-line {
    font-size: 11px;
    color: #556677;
    animation: fadeIn 0.2s ease;
  }

  .boot-line.last {
    color: #00ff41;
  }

  .boot-prompt {
    color: #00aaff;
    margin-right: 8px;
  }

  .boot-cursor {
    color: #00ff41;
    font-size: 14px;
  }

  /* ============================================================
     DASHBOARD
  ============================================================ */
  .dashboard {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: #030508;
  }

  /* TOP BAR */
  .topbar {
    height: 36px;
    background: #070b14;
    border-bottom: 1px solid #1a2a3a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    flex-shrink: 0;
    gap: 12px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .topbar-logo {
    color: #4af;
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 3px;
  }

  .topbar-version {
    color: #334455;
    font-size: 9px;
  }

  .topbar-divider {
    color: #1a2a3a;
  }

  .mode-indicator {
    font-size: 10px;
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mode-indicator.live { color: #00ff41; }
  .mode-indicator.historical { color: #4af; }
  .mode-indicator.simulation { color: #ff6600; }

  .loading-indicator {
    font-size: 9px;
    color: #4af;
    letter-spacing: 1px;
  }

  .error-indicator {
    font-size: 9px;
    color: #ff4444;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .last-updated {
    font-size: 8px;
    color: #334455;
    letter-spacing: 0.5px;
  }

  .topbar-btn {
    background: #0a1020;
    border: 1px solid #1a2a3a;
    color: #556677;
    font-family: 'Courier New', monospace;
    font-size: 9px;
    padding: 3px 8px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.2s;
    height: 22px;
  }

  .topbar-btn:hover,
  .topbar-btn.active {
    border-color: #4af4;
    color: #4af;
  }

  /* MAIN CONTENT */
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  /* MAP */
  .map-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .map-overlay-br {
    position: absolute;
    bottom: 32px;
    right: 10px;
    z-index: 500;
    pointer-events: none;
  }

  .coord-display {
    background: #070b1488;
    border: 1px solid #1a2a3a;
    color: #334455;
    font-size: 8px;
    padding: 3px 8px;
    letter-spacing: 1.5px;
    backdrop-filter: blur(4px);
  }

  .map-grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(#4af008 1px, transparent 1px),
      linear-gradient(90deg, #4af008 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0.015;
    pointer-events: none;
    z-index: 400;
  }

  /* ANIMATIONS */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-4px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .blink {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>