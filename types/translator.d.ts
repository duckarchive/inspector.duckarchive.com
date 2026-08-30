/**
 * Chrome built-in AI Translator / LanguageDetector APIs (Chrome 138+, Edge 148+).
 * Not in TypeScript's DOM lib yet — these are the parts we use.
 * Docs: https://developer.chrome.com/docs/ai/translator-api
 */

type AIAvailability = "available" | "downloadable" | "downloading" | "unavailable";

interface AICreateMonitor extends EventTarget {
  addEventListener(
    type: "downloadprogress",
    listener: (event: { loaded: number }) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
}

interface AITranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

interface AITranslator {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  translateStreaming(input: string): ReadableStream<string>;
  destroy?(): void;
}

interface AILanguageDetectorResult {
  detectedLanguage: string;
  confidence: number;
}

interface AILanguageDetector {
  detect(input: string): Promise<AILanguageDetectorResult[]>;
  destroy?(): void;
}

declare const Translator: {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<AIAvailability>;
  create(options: AITranslatorCreateOptions): Promise<AITranslator>;
};

declare const LanguageDetector: {
  availability(): Promise<AIAvailability>;
  create(options?: { monitor?: (monitor: AICreateMonitor) => void }): Promise<AILanguageDetector>;
};
