import type { ReadabilityScore, ReadabilityTier } from "@/types";

/** Rough English syllable counter — good enough for a reading-ease estimate. */
function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  const vowelGroups = cleaned.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (cleaned.endsWith("e") && count > 1) count -= 1;
  return Math.max(count, 1);
}

function tierForScore(score: number): ReadabilityTier {
  if (score >= 80) return "very-easy";
  if (score >= 60) return "easy";
  if (score >= 40) return "moderate";
  if (score >= 20) return "difficult";
  return "very-difficult";
}

function gradeLevelForScore(score: number): string {
  if (score >= 90) return "5th grade";
  if (score >= 80) return "6th grade";
  if (score >= 70) return "7th grade";
  if (score >= 60) return "8th–9th grade";
  if (score >= 50) return "10th–12th grade";
  if (score >= 30) return "College";
  return "College graduate";
}

/**
 * Computes the Flesch Reading Ease score for a block of text.
 * Formula: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
 */
export function computeReadability(text: string): ReadabilityScore {
  const trimmed = text.trim();

  if (!trimmed) {
    return { fleschScore: 0, tier: "very-difficult", gradeLevel: "—" };
  }

  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const sentenceCount = Math.max(sentences.length, 1);
  const wordCount = Math.max(words.length, 1);

  const rawScore =
    206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);

  const fleschScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    fleschScore,
    tier: tierForScore(fleschScore),
    gradeLevel: gradeLevelForScore(fleschScore),
  };
}

export const READABILITY_TIER_LABEL: Record<ReadabilityTier, string> = {
  "very-easy": "Very easy",
  easy: "Easy",
  moderate: "Moderate",
  difficult: "Difficult",
  "very-difficult": "Very difficult",
};
