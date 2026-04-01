export type SlopHit = { type: string; match: string };

export type ScoredResponse = {
  slop_hits: SlopHit[];
  word_count: number;
  has_bullets: boolean;
};

export type RunScore = {
  slop_score: number;
  pure_slop_rate: number;
  em_dash_rate: number;
  total_words: number;
  total_slop_instances: number;
  bullet_rate: number;
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function detectOpener(text: string, items: string[]): SlopHit[] {
  const preview = text.slice(0, 100).toLowerCase();
  for (const item of items) {
    if (preview.includes(item.toLowerCase())) {
      return [{ type: "opener_slop", match: item }];
    }
  }
  return [];
}

export function detectValidation(text: string, items: string[]): SlopHit[] {
  const lower = text.toLowerCase();
  const hits: SlopHit[] = [];
  for (const item of items) {
    if (lower.includes(item.toLowerCase())) {
      hits.push({ type: "validation_slop", match: item });
    }
  }
  return hits;
}

export function detectWordLevel(text: string, items: string[]): SlopHit[] {
  const hits: SlopHit[] = [];
  for (const item of items) {
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    if (re.test(text)) {
      hits.push({ type: "word_level_slop", match: item });
    }
  }
  return hits;
}

export function detectPhraseLevel(text: string, items: string[]): SlopHit[] {
  const lower = text.toLowerCase();
  const hits: SlopHit[] = [];
  for (const item of items) {
    if (lower.includes(item.toLowerCase())) {
      hits.push({ type: "phrase_level_slop", match: item });
    }
  }
  return hits;
}

export function detectReframe(text: string): SlopHit[] {
  const re = /not (?:just )?[\w\s]+, but (?:also )?[\w\s]+/gi;
  return re.test(text) ? [{ type: "reframe_slop", match: "reframe pattern" }] : [];
}

export function detectEmDash(text: string): SlopHit[] {
  const count = (text.match(/—/g) ?? []).length;
  return count >= 2 ? [{ type: "em_dash_slop", match: `${count} em dashes` }] : [];
}

export function detectStructural(text: string): SlopHit[] {
  const re = /\n[-•*]|\n\d+\./g;
  return re.test(text) ? [{ type: "structural_slop", match: "markdown bullets/list" }] : [];
}

type SlopList = {
  categories: {
    opener_slop: { items: string[] };
    validation_slop: { items: string[] };
    word_level_slop: { items: string[] };
    phrase_level_slop: { items: string[] };
    [key: string]: unknown;
  };
};

export function scoreResponse(text: string, slopList: SlopList): ScoredResponse {
  const { categories } = slopList;
  const slop_hits: SlopHit[] = [
    ...detectOpener(text, categories.opener_slop.items),
    ...detectValidation(text, categories.validation_slop.items),
    ...detectWordLevel(text, categories.word_level_slop.items),
    ...detectPhraseLevel(text, categories.phrase_level_slop.items),
    ...detectReframe(text),
    ...detectEmDash(text),
    ...detectStructural(text),
  ];

  return {
    slop_hits,
    word_count: countWords(text),
    has_bullets: detectStructural(text).length > 0,
  };
}

export type CategoryBreakdown = Record<string, number>;

export function computeCategoryBreakdown(responses: ScoredResponse[]): CategoryBreakdown {
  const breakdown: CategoryBreakdown = {};
  for (const r of responses) {
    for (const hit of r.slop_hits) {
      breakdown[hit.type] = (breakdown[hit.type] ?? 0) + 1;
    }
  }
  return breakdown;
}

export function computeRunScore(responses: ScoredResponse[]): RunScore {
  const total_words = responses.reduce((sum, r) => sum + r.word_count, 0);
  const total_slop_instances = responses.reduce(
    (sum, r) => sum + r.slop_hits.length,
    0
  );
  const slop_score =
    responses.length > 0
      ? Math.round((responses.filter(r => r.slop_hits.length > 0).length / responses.length) * 1000) / 10
      : 0;
  const bullet_rate =
    responses.filter((r) => r.has_bullets).length / responses.length;

  const EXCLUDED = new Set(["structural_slop", "em_dash_slop"]);
  const pure_slop_rate =
    responses.length > 0
      ? Math.round(
          (responses.filter((r) =>
            r.slop_hits.some((h) => !EXCLUDED.has(h.type))
          ).length /
            responses.length) *
            1000
        ) / 10
      : 0;

  const em_dash_rate =
    responses.length > 0
      ? Math.round(
          (responses.filter((r) =>
            r.slop_hits.some((h) => h.type === "em_dash_slop")
          ).length /
            responses.length) *
            1000
        ) / 10
      : 0;

  return { slop_score, pure_slop_rate, em_dash_rate, total_words, total_slop_instances, bullet_rate };
}
