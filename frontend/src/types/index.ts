export type TranslationStatus = 'idle' | 'uploading' | 'translating' | 'downloading' | 'completed' | 'error';

export interface Language {
  code: string;
  name: string;
}

export interface TranslationError {
  message: string;
  code?: string;
}
