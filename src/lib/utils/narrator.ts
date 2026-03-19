export type AlertSeverity = 'info' | 'warning' | 'critical';

interface NarratorOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

// Default voice options per severity
const SEVERITY_OPTIONS: Record<AlertSeverity, NarratorOptions> = {
  info: {
    rate: 0.9,
    pitch: 1.0,
    volume: 0.8,
  },
  warning: {
    rate: 0.85,
    pitch: 0.9,
    volume: 1.0,
  },
  critical: {
    rate: 0.8,
    pitch: 0.7,
    volume: 1.0,
  },
};

// Script narasi per threat level
export const NARRATOR_SCRIPTS = {
  NATURAL: (location: string, magnitude: number) =>
    `Seismic event detected. Location: ${location}. Magnitude ${magnitude}. Classification: Natural. No threat identified.`,

  SUSPICIOUS: (location: string, magnitude: number, score: number) =>
    `Attention. Anomalous seismic event detected near ${location}. Magnitude ${magnitude}. Anomaly score: ${score}. Classification: Suspicious. Monitoring initiated.`,

  HIGH_ANOMALY: (location: string, magnitude: number, score: number) =>
    `Warning. High anomaly event detected. Location: ${location}. Magnitude ${magnitude}. Anomaly score: ${score}. Possible artificial seismic event. Recommend immediate analysis.`,

  CRITICAL: (location: string, magnitude: number, score: number) =>
    `Alert. Critical anomaly detected. Location: ${location}. Magnitude ${magnitude}. Anomaly score: ${score}. Possible detonation event. This is not a drill. Initiating threat protocol.`,

  SIMULATION: (location: string, magnitude: number) =>
    `Simulation mode active. Injecting seismic event at ${location}. Magnitude ${magnitude}. Running anomaly classification.`,
};

class Narrator {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private enabled: boolean = true;
  private queue: string[] = [];
  private speaking: boolean = false;

  init() {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      console.warn('SEISMON: Web Speech API not supported in this browser.');
      return;
    }

    this.synth = window.speechSynthesis;

    // Voices mungkin belum loaded saat init, pakai event
    const loadVoices = () => {
      this.voices = this.synth!.getVoices();
      this.preferredVoice = this.selectBestVoice();
    };

    loadVoices();
    this.synth.addEventListener('voiceschanged', loadVoices);
  }

  private selectBestVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length) return null;

    // Prioritas: English male voices yang dalam/tegas
    const preferred = [
      'Google UK English Male',
      'Microsoft David Desktop',
      'Microsoft George Desktop',
      'Alex',
    ];

    for (const name of preferred) {
      const found = this.voices.find((v) => v.name === name);
      if (found) return found;
    }

    // Fallback: cari voice bahasa Inggris apapun
    return this.voices.find((v) => v.lang.startsWith('en')) ?? this.voices[0];
  }

  private processQueue() {
    if (!this.synth || this.speaking || !this.queue.length) return;

    const text = this.queue.shift()!;
    this.speaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.preferredVoice;

    utterance.onend = () => {
      this.speaking = false;
      this.processQueue();
    };

    utterance.onerror = () => {
      this.speaking = false;
      this.processQueue();
    };

    this.synth.speak(utterance);
  }

  speak(text: string, severity: AlertSeverity = 'info') {
    if (!this.enabled || !this.synth) return;

    const options = SEVERITY_OPTIONS[severity];
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.voice = this.preferredVoice;

    // Untuk critical — interrupt semua dan langsung bicara
    if (severity === 'critical') {
      this.synth.cancel();
      this.queue = [];
      this.speaking = false;
      this.synth.speak(utterance);
      return;
    }

    // Untuk info/warning — masuk queue
    this.queue.push(text);
    this.processQueue();
  }

  stop() {
    if (!this.synth) return;
    this.synth.cancel();
    this.queue = [];
    this.speaking = false;
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) this.stop();
  }

  isEnabled() {
    return this.enabled;
  }

  getVoices() {
    return this.voices;
  }
}

// Singleton — satu instance untuk seluruh app
export const narrator = new Narrator();