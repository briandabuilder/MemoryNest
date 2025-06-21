import { TranscriptionResult } from '../types';

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStartCallback?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript && this.onResultCallback) {
          const result: TranscriptionResult = {
            text: finalTranscript.trim(),
            confidence: event.results[event.results.length - 1][0].confidence || 0.8,
            duration: Date.now() - (this.startTime || Date.now()),
          };
          this.onResultCallback(result);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture error. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        this.onErrorCallback?.(errorMessage);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onEndCallback?.();
      };
    }
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  private startTime: number | null = null;

  startListening(
    onResult?: (result: TranscriptionResult) => void,
    onError?: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    if (!this.recognition) {
      onError?.('Speech recognition not supported in this browser');
      return false;
    }

    if (this.isListening) {
      onError?.('Already listening');
      return false;
    }

    this.onResultCallback = onResult || null;
    this.onErrorCallback = onError || null;
    this.onStartCallback = onStart || null;
    this.onEndCallback = onEnd || null;

    try {
      this.startTime = Date.now();
      this.recognition.start();
      return true;
    } catch (error) {
      onError?.(`Failed to start listening: ${error}`);
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  isListeningNow(): boolean {
    return this.isListening;
  }

  speak(text: string, options?: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }): void {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    // Stop any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default options
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;

    // Set voice if specified
    if (options?.voice) {
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    this.synthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }
    return this.synthesis.getVoices();
  }

  isSupported(): boolean {
    return !!(this.recognition || this.synthesis);
  }

  requestMicrophonePermission(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        resolve(false);
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          resolve(true);
        })
        .catch(() => {
          resolve(false);
        });
    });
  }

  // Utility method to format duration
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  }

  // Utility method to get confidence level description
  getConfidenceLevel(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  }
}

export const voiceService = new VoiceService();
export default voiceService; 