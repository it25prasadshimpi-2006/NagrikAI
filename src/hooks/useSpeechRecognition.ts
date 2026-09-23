import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition type declarations for browsers
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type SupportedLanguage = 'en-IN' | 'hi-IN' | 'mr-IN';

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
  recordingSeconds: number;
}

export function useSpeechRecognition(onResultCallback?: (text: string) => void): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('en-IN');
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as unknown as IWindow).SpeechRecognition ||
    (window as unknown as IWindow).webkitSpeechRecognition
  );

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass =
      (window as unknown as IWindow).SpeechRecognition ||
      (window as unknown as IWindow).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        setTranscript((prev) => {
          const updated = prev ? `${prev} ${final.trim()}` : final.trim();
          if (onResultCallback) onResultCallback(updated);
          return updated;
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access blocked. Please permit microphone access in your browser settings.');
      } else if (event.error === 'network') {
        setError('Network error with speech recognition service.');
      } else if (event.error !== 'no-speech') {
        setError(`Speech recognition notice: ${event.error}`);
      }
      setIsListening(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [language, isSupported, onResultCallback]);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported) {
      setError('Web Speech API is not natively supported in this browser. Please type or use sample audio inputs.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
      }
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      // If already started, stop and restart
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
    }
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setRecordingSeconds(0);
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    language,
    setLanguage,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
    recordingSeconds,
  };
}
