export type Rating = "again" | "hard" | "good" | "easy";

export type Bindings = {
  DB: D1Database;
  ASSETS?: Fetcher;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  FREE_BOOK_LIMIT?: string;
  FREE_CARDS_PER_BOOK_LIMIT?: string;
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
  error_code: string | null;
  error_message: string | null;
  tags?: string[];
  created_at: string;
};

export type StudyBook = {
  id: string;
  user_id: string;
  title: string;
  folder_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StudyBookSummary = StudyBook & {
  card_count: number;
  due_count: number;
};

export type ReviewState = {
  rating: Rating;
  state: number;
  intervalDays: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  learningSteps: number;
  lapses: number;
  repetitions: number;
  dueAt: Date;
  reviewedAt: Date;
};

export type DictionaryResult = {
  translation: string | null;
  sentence: string | null;
  sourceId: string | null;
  author: string | null;
  sourceUrl: string | null;
};
