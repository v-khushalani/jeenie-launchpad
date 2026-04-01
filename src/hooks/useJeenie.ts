/**
 * useJeenie Hook
 * 
 * Provides AI assistant functionality with:
 * - Automatic rate limiting via queue
 * - Response caching
 * - Retry with backoff
 * - Service status indicator
 */

import { useState, useCallback } from 'react';
import { aiAPI } from '@/services/api/modules/ai';
import type { JeenieMessage, JeenieResponse } from '@/services/api/types';
import { logger } from '@/utils/logger';

interface UseJeenieOptions {
  subject?: string;
  maxHistoryLength?: number;
}

interface UseJeenieResult {
  messages: JeenieMessage[];
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  queueStats: ReturnType<typeof aiAPI.getQueueStats>;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
}

export const useJeenie = (options: UseJeenieOptions = {}): UseJeenieResult => {
  const { subject, maxHistoryLength = 10 } = options;

  const [messages, setMessages] = useState<JeenieMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    const userMessage: JeenieMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare conversation history (limit to prevent token overflow)
      const conversationHistory = messages.slice(-maxHistoryLength);

      const { data, error: apiError } = await aiAPI.askJeenie({
        contextPrompt: message,
        subject,
        conversationHistory,
      });

      if (apiError) {
        // Handle specific error types with humor
        if (apiError.code === 'RATE_LIMITED' || apiError.message.includes('rate')) {
          setError('JEEnie abhi chai pe gaya hai! ☕ 2 second ruk, wapas aata hai!');
        } else if (apiError.message.includes('overloaded')) {
          setError('JEEnie pe traffic jam hai! 🚗 Thoda patience rakho, hum queue mein hain!');
        } else {
          setError('Oho! JEEnie thoda confuse ho gaya! 🤪 Dobara pooch, ye baar pakka jawab dega!');
        }
        return;
      }

      if (data?.response) {
        const assistantMessage: JeenieMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      logger.error('useJeenie error:', err);
      setError('Arre yaar! Network mein kuch gadbad hai! 🌐 Internet check karo aur dobara try karo.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, subject, maxHistoryLength]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    isAvailable: aiAPI.isAvailable(),
    queueStats: aiAPI.getQueueStats(),
    sendMessage,
    clearHistory,
  };
};

/**
 * Hook for study plan generation
 */
export const useStudyPlan = () => {
  const [plan, setPlan] = useState<{
    weeklySchedule: {
      day: string;
      subjects: string[];
      topics: string[];
      duration: number;
    }[];
    priorityTopics: string[];
    recommendations: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (params: {
    userId: string;
    goalExam: string;
    targetRank: number;
    availableHoursPerDay: number;
    examDate: string;
    weakTopics?: string[];
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await aiAPI.generateStudyPlan(params);

      if (apiError) {
        setError('Study plan banane mein thodi dikkat! 📚 Ek minute baad try karo.');
        return;
      }

      if (data?.plan) {
        setPlan(data.plan);
      }
    } catch (err) {
      logger.error('useStudyPlan error:', err);
      setError('Planner thoda busy hai! 📅 Thoda baad try karo, plan ban jayega!');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { plan, isLoading, error, generatePlan };
};

/**
 * Hook for text-to-speech
 * Uses the edge function to clean text, then browser SpeechSynthesis for actual audio
 */
export const useTextToSpeech = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call edge function to clean/prepare the text
      const { data, error: apiError } = await aiAPI.textToSpeech(text);

      if (apiError) {
        setError('Speaker thoda shy hai aaj! 🔊 Refresh karke try karo.');
        return null;
      }

      // Get cleaned text from response
      const cleanedText = (data as any)?.text || (data as any)?.audioContent || text;
      const voiceConfig = (data as any)?.voiceConfig;

      // Use browser's SpeechSynthesis API for actual audio playback
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to find a matching voice
        if (voiceConfig?.lang) {
          const voices = window.speechSynthesis.getVoices();
          const matchingVoice = voices.find(v => v.lang === voiceConfig.lang) 
            || voices.find(v => v.lang.startsWith(voiceConfig.lang.split('-')[0]));
          if (matchingVoice) {
            utterance.voice = matchingVoice;
          }
          utterance.lang = voiceConfig.lang;
        }

        window.speechSynthesis.speak(utterance);
        
        const speechUrl = `speech:${voiceConfig?.lang || 'en-US'}`;
        setAudioUrl(speechUrl);
        return speechUrl;
      } else {
        setError('Ye browser speech support nahi karta! 😔 Chrome try karo.');
        return null;
      }
    } catch (err) {
      logger.error('TTS error:', err);
      setError('Bolne mein thodi dikkat aa gayi! 🎙️ Dobara try karo.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop speech when component unmounts
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { audioUrl, isLoading, error, speak, stop };
};

/**
 * Hook for voice-to-text
 */
export const useVoiceToText = () => {
  const [text, setText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async (audioBlob: Blob) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await aiAPI.voiceToText(audioBlob);

      if (apiError) {
        setError('Voice samajh nahi aayi! 🎤 Thoda loud bolke try karo.');
        return null;
      }

      if (data?.text) {
        setText(data.text);
        return data.text;
      }
      return null;
    } catch (err) {
      logger.error('Voice-to-text error:', err);
      setError('Audio sun nahi paaya! 🔉 Dobara record karke try karo.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { text, isLoading, error, transcribe };
};
