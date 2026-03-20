export type AlertSeverity = 'info' | 'warning' | 'critical' | 'greeting';

interface NarratorOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

const SEVERITY_OPTIONS: Record<AlertSeverity, NarratorOptions> = {
  greeting: { rate: 0.9, pitch: 1.0, volume: 1.0 },
  info:     { rate: 0.9, pitch: 1.0, volume: 0.8 },
  warning:  { rate: 0.85, pitch: 0.9, volume: 1.0 },
  critical: { rate: 0.8, pitch: 0.7, volume: 1.0 },
};

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
  private queue: Array<{ text: string; severity: AlertSeverity }> = [];
  private speaking: boolean = false;

  init() {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      console.warn('SEISMON: Web Speech API not supported.');
      return;
    }

    this.synth = window.speechSynthesis;

    const loadVoices = () => {
      this.voices = this.synth!.getVoices();
      this.preferredVoice = this.selectBestVoice();
    };

    loadVoices();
    this.synth.addEventListener('voiceschanged', loadVoices);
  }

  private selectBestVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length) return null;

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

    return this.voices.find((v) => v.lang.startsWith('en')) ?? this.voices[0];
  }

  private processQueue() {
    if (!this.synth || this.speaking || !this.queue.length) return;

    const { text, severity } = this.queue.shift()!;
    this.speaking = true;

    const options = SEVERITY_OPTIONS[severity];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.voice = this.preferredVoice;

    utterance.onend = () => {
      this.speaking = false;
      // Dispatch event supaya AlertOverlay tau narrator selesai
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('seismon:narrator-finished'));
      }
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

    // greeting & critical — interrupt semua dan langsung bicara
    if (severity === 'critical' || severity === 'greeting') {
      this.synth.cancel();
      this.queue = [];
      this.speaking = false;

      const options = SEVERITY_OPTIONS[severity];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      utterance.voice = this.preferredVoice;

      utterance.onend = () => {
        this.speaking = false;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('seismon:narrator-finished'));
        }
        this.processQueue();
      };

      utterance.onerror = () => {
        this.speaking = false;
        this.processQueue();
      };

      this.speaking = true;
      this.synth.speak(utterance);
      return;
    }

    // info & warning — masuk queue
    this.queue.push({ text, severity });
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

  isEnabled() { return this.enabled; }
  isSpeaking() { return this.speaking; }
  getVoices() { return this.voices; }
}

export const narrator = new Narrator();