/**
 * Map a product name / category hint to a hero emoji.
 * Per FLOWER_DESIGN_SYSTEM.md §1.8 (Product card hero images).
 *
 * Keep this pure and dependency-free so it can be reused across:
 *  - product-list (individual)
 *  - product-detail
 *  - corporate-products grid
 */
const RULES: { match: RegExp; emoji: string }[] = [
  { match: /(laptop|computer|pc|desktop|macbook|notebook)/i, emoji: '💻' },
  { match: /(headphone|earbud|earphone|speaker|audio|headset|sound)/i, emoji: '🎧' },
  { match: /(watch|wearable|band|fitness)/i, emoji: '⌚' },
  { match: /(keyboard|keypad)/i, emoji: '⌨️' },
  { match: /(mouse|trackpad)/i, emoji: '🖱️' },
  { match: /(monitor|display|screen|tv)/i, emoji: '🖥️' },
  { match: /(phone|mobile|smartphone|iphone|pixel|galaxy)/i, emoji: '📱' },
  { match: /(camera|dslr|gopro|webcam)/i, emoji: '📷' },
  { match: /(tablet|ipad)/i, emoji: '📲' },
  { match: /(printer|scan)/i, emoji: '🖨️' },
  { match: /(game|console|xbox|playstation)/i, emoji: '🎮' },
  { match: /(book|novel|magazine)/i, emoji: '📚' },
  { match: /(shoe|sneaker|boot)/i, emoji: '👟' },
  { match: /(shirt|tee|jacket|hoodie|cloth|apparel)/i, emoji: '👕' },
  { match: /(bag|backpack|luggage)/i, emoji: '🎒' },
];

export function productEmoji(name: string | undefined | null, category?: string | null): string {
  const haystack = `${name ?? ''} ${category ?? ''}`;
  for (const r of RULES) if (r.match.test(haystack)) return r.emoji;
  return '📦';
}
