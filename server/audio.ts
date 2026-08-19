import type { Bindings } from "@/lib/types";

async function hashText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function audioObjectKey(text: string, voice = "default", modelVersion = "v1"): Promise<string> {
  const hash = await hashText(`${text}\0${voice}\0${modelVersion}`);
  return `audio/en/${modelVersion}/${hash}.mp3`;
}

async function generateOne(env: Bindings, cardId: string, text: string, kind: "term" | "sentence"): Promise<void> {
  if (!env.AUDIO_GENERATOR_URL || !text) return;
  const key = await audioObjectKey(text);
  const column = kind === "term" ? "term_audio_key" : "sentence_audio_key";
  const statusColumn = kind === "term" ? "term_audio_status" : "sentence_audio_status";
  try {
    const existing = await env.AUDIO.head(key);
    if (!existing) {
      const response = await fetch(env.AUDIO_GENERATOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "en", modelVersion: "v1" }),
      });
      if (!response.ok) throw new Error(`audio generator returned ${response.status}`);
      await env.AUDIO.put(key, await response.arrayBuffer(), { httpMetadata: { contentType: "audio/mpeg", cacheControl: "public, max-age=31536000, immutable" } });
    }
    await env.DB.prepare(`UPDATE cards SET ${column} = ?, ${statusColumn} = 'ready' WHERE id = ?`).bind(key, cardId).run();
  } catch (error) {
    console.error("audio_generation_failed", error instanceof Error ? error.message : "unknown error");
    await env.DB.prepare(`UPDATE cards SET ${statusColumn} = 'failed' WHERE id = ?`).bind(cardId).run();
  }
}

export async function generateBookAudio(env: Bindings, bookId: string): Promise<void> {
  const result = await env.DB.prepare("SELECT id, term, sentence FROM cards WHERE book_id = ?").bind(bookId).all<{ id: string; term: string; sentence: string | null }>();
  await Promise.all(result.results.flatMap((card) => [
    generateOne(env, card.id, card.term, "term"),
    card.sentence ? generateOne(env, card.id, card.sentence, "sentence") : Promise.resolve(),
  ]));
}
