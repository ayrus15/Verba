export type VocabularyItem = { id: string; word: string; meaning: string; example: string; pronunciation?: string; savedAt: string };
const storageKey = "verba-vocabulary-v1";

export function readVocabulary(): VocabularyItem[] {
  if (typeof window === "undefined") return [];
  try { const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]"); return Array.isArray(value) ? value.filter(isItem) : []; } catch { return []; }
}
export function writeVocabulary(items: VocabularyItem[]) { window.localStorage.setItem(storageKey, JSON.stringify(items)); }
function isItem(value: unknown): value is VocabularyItem {
  return !!value && typeof value === "object" && typeof (value as VocabularyItem).id === "string" && typeof (value as VocabularyItem).word === "string" && typeof (value as VocabularyItem).meaning === "string" && typeof (value as VocabularyItem).example === "string" && typeof (value as VocabularyItem).savedAt === "string";
}
