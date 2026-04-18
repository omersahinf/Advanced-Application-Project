/**
 * Map a product name / category hint to a hero emoji.
 * Per FLOWER_DESIGN_SYSTEM.md §1.8 (Product card hero images).
 *
 * Keep this pure and dependency-free so it can be reused across:
 *  - product-list (individual)
 *  - product-detail
 *  - corporate-products grid
 *  - product-hero shared component
 *
 * ORDER MATTERS — first match wins. More specific rules must come
 * before broader ones (e.g. "bookshelf" before "book", "yoga mat"
 * before "mat", "webcam" before "camera").
 */
const RULES: { match: RegExp; emoji: string }[] = [
  // ── Electronics / Tech (specific) ───────────────────────────
  { match: /keyboard|keypad/i, emoji: '⌨️' },
  { match: /\bmouse\b|trackpad/i, emoji: '🖱️' },
  { match: /earbud|earphone|headphone|headset|airpod/i, emoji: '🎧' },
  { match: /speaker|soundbar|subwoofer/i, emoji: '🔊' },
  { match: /\bwatch\b|smartband|smart band/i, emoji: '⌚' },
  { match: /webcam/i, emoji: '📹' },
  { match: /camera|dslr|gopro/i, emoji: '📷' },
  { match: /monitor|display|screen(?!\s*protector)/i, emoji: '🖥️' },
  { match: /phone case|phone|iphone|pixel|galaxy|smartphone|mobile/i, emoji: '📱' },
  { match: /tablet|\bipad\b/i, emoji: '📲' },
  { match: /\bssd\b|\bhdd\b|hard drive|flash drive|usb drive|storage/i, emoji: '💾' },
  { match: /\busb\b|\bhub\b|adapter|dongle|charger|cable/i, emoji: '🔌' },
  { match: /laptop|macbook|notebook pc|ultrabook|chromebook/i, emoji: '💻' },
  { match: /printer|scanner/i, emoji: '🖨️' },
  { match: /console|xbox|playstation|nintendo|controller|joystick/i, emoji: '🎮' },
  { match: /router|modem|wifi/i, emoji: '📡' },

  // ── Kitchen (specific appliance / tool) ─────────────────────
  { match: /knife|cleaver/i, emoji: '🔪' },
  { match: /coffee maker|espresso machine|coffee machine/i, emoji: '☕' },
  { match: /blender|juicer|food processor|mixer/i, emoji: '🥤' },
  { match: /skillet|frying pan|\bpan\b|\bwok\b/i, emoji: '🍳' },
  { match: /kettle|teapot|sauce\s?pan/i, emoji: '🫖' },
  { match: /\bmug\b|travel mug|coffee cup/i, emoji: '☕' },
  { match: /dish\b|\bbowl\b|plate set|dinnerware/i, emoji: '🍽️' },
  { match: /water bottle|\bbottle\b|tumbler|flask/i, emoji: '🧴' },
  { match: /cutting board|chopping board/i, emoji: '🪵' },

  // ── Food & Beverages ────────────────────────────────────────
  { match: /green tea|matcha|black tea|\btea\b/i, emoji: '🍵' },
  { match: /coffee beans?|ground coffee|\bcoffee\b/i, emoji: '☕' },
  { match: /honey/i, emoji: '🍯' },
  { match: /quinoa|\brice\b|grain|oats|wheat|pasta/i, emoji: '🌾' },
  { match: /trail mix|\bnuts?\b|almond|cashew|walnut|pistachio/i, emoji: '🥜' },
  { match: /chocolate|cocoa/i, emoji: '🍫' },
  { match: /snack|chips|cracker|popcorn/i, emoji: '🍿' },
  { match: /\bwine\b|champagne/i, emoji: '🍷' },
  { match: /\bbeer\b|\bale\b|\blager\b/i, emoji: '🍺' },
  { match: /olive oil|cooking oil/i, emoji: '🫒' },

  // ── Beauty / Personal care ──────────────────────────────────
  { match: /toothbrush|toothpaste|dental floss/i, emoji: '🪥' },
  { match: /shampoo|conditioner|hair mask|hair\s?care/i, emoji: '🧴' },
  { match: /\bsoap\b|body wash|hand wash/i, emoji: '🧼' },
  {
    match: /face cream|moisturizer|lotion|serum|skincare|sunscreen|day cream|night cream/i,
    emoji: '🧴',
  },
  { match: /lipstick|lip gloss|makeup|mascara|foundation|eyeliner/i, emoji: '💄' },
  { match: /perfume|cologne|fragrance|eau de/i, emoji: '💐' },
  { match: /razor|shaver|shaving/i, emoji: '🪒' },
  { match: /nail polish|manicure/i, emoji: '💅' },

  // ── Home / Decor / Lighting / Furniture ─────────────────────
  { match: /candle|wax melt/i, emoji: '🕯️' },
  { match: /desk lamp|floor lamp|table lamp|\blamp\b|light bulb|\bled\b/i, emoji: '💡' },
  { match: /wall art|poster|painting|picture frame|artwork|canvas art|canvas print/i, emoji: '🖼️' },
  { match: /sofa|couch|recliner|loveseat/i, emoji: '🛋️' },
  { match: /pillow|cushion/i, emoji: '🛋️' },
  { match: /bed\b|mattress|headboard/i, emoji: '🛏️' },
  { match: /bookshelf|bookcase|shelving|cabinet|wardrobe|dresser/i, emoji: '🗄️' },
  { match: /office chair|dining chair|\bchair\b|stool|armchair/i, emoji: '🪑' },
  { match: /\bdesk\b|\btable\b|workbench/i, emoji: '🪑' },
  { match: /yoga mat|exercise mat|pilates mat/i, emoji: '🧘' },
  { match: /\brug\b|carpet|doormat|floor mat/i, emoji: '🪆' },
  { match: /curtain|blind|drape/i, emoji: '🪟' },
  { match: /clock|timer/i, emoji: '⏰' },
  { match: /vase|planter|pot\s*plant/i, emoji: '🪴' },
  { match: /towel|bath mat|linen/i, emoji: '🧻' },

  // ── Books / Stationery ──────────────────────────────────────
  { match: /\bbook\b|novel|magazine|journal|diary|textbook/i, emoji: '📚' },
  { match: /\bpen\b|\bpencil\b|marker|highlighter/i, emoji: '✏️' },
  { match: /notebook|notepad|sketchbook/i, emoji: '📓' },

  // ── Fashion: shoes ──────────────────────────────────────────
  { match: /sneaker|trainer|running shoes?|\bshoes?\b/i, emoji: '👟' },
  { match: /\bboot\b|boots\b/i, emoji: '🥾' },
  { match: /heels?\b|stiletto/i, emoji: '👠' },
  { match: /sandal|flip[- ]?flop/i, emoji: '🩴' },

  // ── Fashion: apparel ────────────────────────────────────────
  { match: /t[- ]?shirt|\btee\b|polo shirt|blouse|\bshirt\b/i, emoji: '👕' },
  { match: /jeans|trousers|\bpants\b|chinos?|slacks/i, emoji: '👖' },
  { match: /\bdress\b|gown|skirt/i, emoji: '👗' },
  { match: /jacket|coat|parka|blazer|windbreaker/i, emoji: '🧥' },
  { match: /sweater|hoodie|cardigan|pullover|jumper/i, emoji: '🧶' },
  { match: /sunglasses|eyeglasses|\bglasses\b/i, emoji: '🕶️' },
  { match: /handbag|\btote\b|purse|clutch|wallet/i, emoji: '👜' },
  { match: /backpack|rucksack|daypack|\bbag\b/i, emoji: '🎒' },
  { match: /\bhat\b|\bcap\b|beanie/i, emoji: '🧢' },
  { match: /scarf|shawl/i, emoji: '🧣' },
  { match: /\bgloves?\b|mitten/i, emoji: '🧤' },
  { match: /\bsocks?\b/i, emoji: '🧦' },
  { match: /bikini|swimsuit|swimwear/i, emoji: '👙' },
  { match: /\bring\b|necklace|earring|bracelet|jewelry|jewellery/i, emoji: '💍' },

  // ── Fitness / Outdoor / Sports ──────────────────────────────
  { match: /dumbbell|barbell|kettlebell|weights?/i, emoji: '🏋️' },
  { match: /bicycle|\bbike\b|cycling/i, emoji: '🚲' },
  { match: /tent|camping|sleeping bag/i, emoji: '⛺' },
  { match: /ball|football|basketball|soccer/i, emoji: '⚽' },
  { match: /helmet/i, emoji: '⛑️' },

  // ── Toys / Kids / Games ─────────────────────────────────────
  { match: /\btoy\b|plush|teddy|stuffed animal/i, emoji: '🧸' },
  { match: /puzzle|\blego\b|building block/i, emoji: '🧩' },
  { match: /board game|card game/i, emoji: '🎲' },

  // ── Pet ─────────────────────────────────────────────────────
  { match: /dog food|cat food|pet food|pet toy|leash|collar/i, emoji: '🐾' },

  // ── Category fallbacks (lowest priority) ────────────────────
  { match: /computer|electronic|tech/i, emoji: '💻' },
  { match: /audio|video|sound/i, emoji: '🎧' },
  { match: /kitchen|cookware|cooking/i, emoji: '🍳' },
  { match: /furniture/i, emoji: '🪑' },
  { match: /decor|decoration|home\s*&?\s*garden|home$/i, emoji: '🖼️' },
  { match: /beauty|skincare|haircare|cosmetic/i, emoji: '🧴' },
  { match: /fashion|apparel|clothing|clothes/i, emoji: '👕' },
  { match: /shoes?\b|footwear/i, emoji: '👟' },
  { match: /wearable/i, emoji: '⌚' },
  { match: /phones?\s*&?\s*accessories|phone/i, emoji: '📱' },
  { match: /organic|grocery|groceries|food/i, emoji: '🥗' },
  { match: /snacks?/i, emoji: '🍿' },
  { match: /fitness|sports?|exercise|\bgym\b/i, emoji: '🏋️' },
  { match: /toys?/i, emoji: '🧸' },
  { match: /books?/i, emoji: '📚' },
];

export function productEmoji(name: string | undefined | null, category?: string | null): string {
  const haystack = `${name ?? ''} ${category ?? ''}`;
  for (const r of RULES) if (r.match.test(haystack)) return r.emoji;
  return '📦';
}
