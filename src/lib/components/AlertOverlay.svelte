<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { criticalEvents, anomalyEvents, appMode } from '$lib/stores/events';
  import { getThreatColor, getThreatLabel } from '$lib/utils/classifier';
  import { narrator, NARRATOR_SCRIPTS } from '$lib/utils/narrator';

  let visible = $state(false);
  let currentAlert: any = $state(null);
  let alertQueue: any[] = $state([]);
  let processing = $state(false);
  let scanlineActive = $state(false);

  const alertedIds = new Set<string>();

  let unsubCritical: (() => void) | null = null;
  let unsubAnomaly: (() => void) | null = null;
  let unsubMode: (() => void) | null = null;

  onMount(() => {
    narrator.init();

    window.addEventListener('seismon:narrator-finished', handleNarratorFinished);

    unsubCritical = criticalEvents.subscribe((evts) => {
      for (const evt of evts) {
        if (!alertedIds.has(evt.usgs_id)) {
          alertedIds.add(evt.usgs_id);
          alertQueue = [...alertQueue, { ...evt, alertType: 'CRITICAL' }];
          processQueue();
        }
      }
    });

    unsubAnomaly = anomalyEvents.subscribe((evts) => {
      for (const evt of evts) {
        if (!alertedIds.has(evt.usgs_id) && evt.threat_level !== 'NATURAL') {
          alertedIds.add(evt.usgs_id);
          if (evt.threat_level !== 'CRITICAL') {
            alertQueue = [...alertQueue, { ...evt, alertType: evt.threat_level }];
            processQueue();
          }
        }
      }
    });

    unsubMode = appMode.subscribe((mode) => {
      if (mode === 'LIVE') {
        narrator.stop();
      }
    });
  });

  onDestroy(() => {
    window.removeEventListener('seismon:narrator-finished', handleNarratorFinished);
    unsubCritical?.();
    unsubAnomaly?.();
    unsubMode?.();
    narrator.stop();
  });

  function handleNarratorFinished() {
    if (!processing && alertQueue.length > 0) {
      processQueue();
    }
  }

  function processQueue() {
    if (processing || !alertQueue.length) return;
    if (narrator.isSpeaking()) return;

    processing = true;
    currentAlert = alertQueue[0];
    alertQueue = alertQueue.slice(1);
    visible = true;
    scanlineActive = true;

    triggerNarration(currentAlert);

    if (currentAlert.alertType !== 'CRITICAL') {
      setTimeout(() => {
        dismissAlert();
      }, 8000);
    }
  }

  function triggerNarration(alert: any) {
    if (!alert) return;

    const loc = alert.location ?? 'Unknown location';
    const mag = alert.magnitude;
    const score = alert.anomaly_score;

    switch (alert.alertType) {
      case 'CRITICAL':
        narrator.speak(NARRATOR_SCRIPTS.CRITICAL(loc, mag, score), 'critical');
        break;
      case 'HIGH_ANOMALY':
        narrator.speak(NARRATOR_SCRIPTS.HIGH_ANOMALY(loc, mag, score), 'warning');
        break;
      case 'SUSPICIOUS':
        narrator.speak(NARRATOR_SCRIPTS.SUSPICIOUS(loc, mag, score), 'info');
        break;
    }
  }

  function dismissAlert() {
    visible = false;
    currentAlert = null;
    scanlineActive = false;

    setTimeout(() => {
      processing = false;
      processQueue();
    }, 600);
  }
</script>

{#if visible && currentAlert}
  <div
    class="backdrop"
    class:critical={currentAlert.alertType === 'CRITICAL'}
    style="border-color: {getThreatColor(currentAlert.threat_level)}22;"
  >

    {#if scanlineActive}
      <div class="scanline"></div>
    {/if}

    <div
      class="alert-box"
      class:critical-box={currentAlert.alertType === 'CRITICAL'}
      style="
        border-color: {getThreatColor(currentAlert.threat_level)};
        box-shadow: 0 0 40px {getThreatColor(currentAlert.threat_level)}44;
      "
    >
      <!-- TOP BAR -->
      <div
        class="alert-topbar"
        style="
          background: {getThreatColor(currentAlert.threat_level)}22;
          border-bottom-color: {getThreatColor(currentAlert.threat_level)}44;
        "
      >
        <div class="alert-type" style="color: {getThreatColor(currentAlert.threat_level)};">
          {#if currentAlert.alertType === 'CRITICAL'}
            <span class="blink">⚠</span> CRITICAL ALERT
          {:else if currentAlert.alertType === 'HIGH_ANOMALY'}
            ◈ HIGH ANOMALY DETECTED
          {:else}
            ◉ SUSPICIOUS EVENT
          {/if}
        </div>
        <div class="alert-meta">
          {#if currentAlert.is_simulation}
            <span class="sim-tag">SIMULATION</span>
          {/if}
          <span class="alert-time">
            {new Date(currentAlert.time).toUTCString().slice(0, 25)}
          </span>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="alert-content">

        <!-- LEFT — Stats -->
        <div class="alert-stats">
          <div class="stat-big">
            <div class="stat-big-val" style="color: {getThreatColor(currentAlert.threat_level)};">
              M{currentAlert.magnitude.toFixed(1)}
            </div>
            <div class="stat-big-label">MAGNITUDE</div>
          </div>

          <div class="stat-big">
            <div class="stat-big-val" style="color: {getThreatColor(currentAlert.threat_level)};">
              {currentAlert.depth}km
            </div>
            <div class="stat-big-label">DEPTH</div>
          </div>

          <div class="stat-big">
            <div class="stat-big-val" style="color: {getThreatColor(currentAlert.threat_level)};">
              {currentAlert.anomaly_score}
            </div>
            <div class="stat-big-label">SCORE</div>
          </div>

          {#if currentAlert.yield_kt}
            <div class="stat-big">
              <div class="stat-big-val" style="color: #ff6600;">
                ~{currentAlert.yield_kt.toFixed(1)}kt
              </div>
              <div class="stat-big-label">EST. YIELD</div>
            </div>
          {/if}
        </div>

        <!-- RIGHT — Details -->
        <div class="alert-details">
          <div class="alert-location" style="color: {getThreatColor(currentAlert.threat_level)};">
            {currentAlert.location}
          </div>

          <div class="alert-coords">
            {currentAlert.latitude.toFixed(3)}°N,
            {currentAlert.longitude.toFixed(3)}°E
          </div>

          <div class="alert-threat" style="color: {getThreatColor(currentAlert.threat_level)};">
            {getThreatLabel(currentAlert.threat_level)}
          </div>

          {#if currentAlert.reasons?.length}
            <div class="alert-reasons">
              {#each currentAlert.reasons as reason}
                <div class="reason">▸ {reason}</div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- BOTTOM BAR -->
      <div
        class="alert-bottom"
        style="border-top-color: {getThreatColor(currentAlert.threat_level)}22;"
      >
        <div
          class="alert-footer-text"
          style="color: {getThreatColor(currentAlert.threat_level)}88;"
        >
          SEISMON ANOMALY DETECTION SYSTEM — EDUCATIONAL USE ONLY
        </div>

        <button
          class="dismiss-btn"
          style="
            border-color: {getThreatColor(currentAlert.threat_level)}66;
            color: {getThreatColor(currentAlert.threat_level)};
          "
          onclick={dismissAlert}
        >
          {currentAlert.alertType === 'CRITICAL' ? '■ ACKNOWLEDGE' : '✕ DISMISS'}
        </button>
      </div>
    </div>

    {#if currentAlert.alertType === 'CRITICAL'}
      <div class="corner corner-tl" style="border-color: {getThreatColor(currentAlert.threat_level)};"></div>
      <div class="corner corner-tr" style="border-color: {getThreatColor(currentAlert.threat_level)};"></div>
      <div class="corner corner-bl" style="border-color: {getThreatColor(currentAlert.threat_level)};"></div>
      <div class="corner corner-br" style="border-color: {getThreatColor(currentAlert.threat_level)};"></div>
    {/if}

  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: #00000088;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease;
  }

  .backdrop.critical {
    background: #11000099;
  }

  .scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      #ffffff04 2px,
      #ffffff04 4px
    );
    pointer-events: none;
    z-index: 1;
  }

  .alert-box {
    position: relative;
    background: #070b14;
    border: 1px solid;
    font-family: 'Courier New', Courier, monospace;
    color: #8899aa;
    font-size: 11px;
    width: 560px;
    max-width: 90vw;
    z-index: 2;
    animation: slideIn 0.3s ease;
  }

  .critical-box {
    animation: slideIn 0.2s ease, criticalPulse 2s ease-in-out infinite;
  }

  .alert-topbar {
    padding: 10px 16px;
    border-bottom: 1px solid;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .alert-type {
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 2px;
  }

  .alert-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sim-tag {
    background: #ff660022;
    color: #ff6600;
    border: 1px solid #ff660044;
    font-size: 8px;
    padding: 1px 5px;
    border-radius: 2px;
  }

  .alert-time {
    font-size: 9px;
    color: #445566;
  }

  .alert-content {
    padding: 16px;
    display: flex;
    gap: 20px;
  }

  .alert-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 80px;
  }

  .stat-big { text-align: center; }

  .stat-big-val {
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .stat-big-label {
    font-size: 8px;
    color: #445566;
    letter-spacing: 1px;
    margin-top: 2px;
  }

  .alert-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .alert-location {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .alert-coords {
    font-size: 10px;
    color: #556677;
  }

  .alert-threat {
    font-size: 10px;
    letter-spacing: 1px;
    margin-top: 4px;
  }

  .alert-reasons {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #1a2a3a;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .reason {
    font-size: 9px;
    color: #556677;
    line-height: 1.4;
  }

  .alert-bottom {
    padding: 10px 16px;
    border-top: 1px solid;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .alert-footer-text {
    font-size: 8px;
    letter-spacing: 0.5px;
  }

  .dismiss-btn {
    background: transparent;
    border: 1px solid;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 6px 14px;
    cursor: pointer;
    letter-spacing: 1.5px;
    transition: all 0.2s;
  }

  .dismiss-btn:hover {
    background: #ffffff11;
  }

  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border-style: solid;
    z-index: 3;
  }

  .corner-tl { top: 8px; left: 8px; border-width: 2px 0 0 2px; }
  .corner-tr { top: 8px; right: 8px; border-width: 2px 2px 0 0; }
  .corner-bl { bottom: 8px; left: 8px; border-width: 0 0 2px 2px; }
  .corner-br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes criticalPulse {
    0%, 100% { box-shadow: 0 0 40px #ff000044; }
    50% { box-shadow: 0 0 80px #ff000088; }
  }

  .blink {
    animation: blink 0.5s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
</style>