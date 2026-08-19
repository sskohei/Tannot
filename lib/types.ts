export type AudioStatus = "pending" | "ready" | "failed";
export type Rating = "again" | "hard" | "good" | "easy";

export type Bindings = {
  DB: D1Database;
  AUDIO: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  AUDIO_GENERATOR_URL?: string;
  AUDIO_BASE_URL?: string;
  FREE_BOOK_LIMIT?: string;
};

export type Card = {
  id: string;
  book_id: string;
  term: string;
  normalized_term: string;
  translation: string | null;
  sentence: string | null;
  sentence_source_id: string | null;
  sentence_author: string | null;
  sentence_source_url: string | null;
  term_audio_key: string | null;
  sentence_audio_key: string | null;
  term_audio_status: AudioStatus;
  sentence_audio_status: AudioStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

export type StudyBook = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ReviewState = {
  rating: Rating;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  dueAt: Date;
};

export type DictionaryResult = {
  translation: string | null;
  sentence: string | null;
  sourceId: string | null;
  author: string | null;
  sourceUrl: string | null;
};
