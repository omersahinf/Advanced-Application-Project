# Flower Design System

Single source of truth for visual design on the Flower e-commerce analytics platform. Pair this with `Flower Prototype.html` for pixel reference.

> **Backend is untouched.** This document describes the frontend look & feel only. All API contracts, entities, endpoints, and seed data remain as-is.

---

## 1. Brand

- **Name**: Flower
- **Logo**: 4-bar vertical chart icon (bar heights: 40%, 70%, 55%, 85%) in `--fathom` green + the word "Flower" in Georgia serif, weight 700.
- **Tagline (login)**: "E-commerce analytics with a multi-agent AI assistant."
- **Footer**: "CSE 214 · Advanced Application Development · Final Project"

### Logo SVG (drop-in)

```html
<span style="display:inline-flex;align-items:center;gap:8px">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="2"  y="14" width="3.5" height="8"  rx="1" fill="#034f46"/>
    <rect x="7"  y="9"  width="3.5" height="13" rx="1" fill="#034f46"/>
    <rect x="12" y="11" width="3.5" height="11" rx="1" fill="#034f46"/>
    <rect x="17" y="6"  width="3.5" height="16" rx="1" fill="#034f46"/>
  </svg>
  <span style="font:700 20px/1 Georgia, serif">Flower</span>
</span>
```

---

## 2. Color Tokens

All colors must be defined as CSS custom properties on `:root`. Never hard-code hex values in component SCSS — always reference the token.

```css
:root {
  /* Fathom green — primary brand */
  --fathom:        #034f46;   /* primary buttons, links, logo, accent */
  --fathom-dark:   #023a34;   /* hover state, darker accents */
  --fathom-light:  #dfe9e5;   /* light tint, selected backgrounds */

  /* Background / surface */
  --bg:            #e4e4d0;   /* page background — warm cream */
  --bg-2:          #f1f1dc;   /* secondary surface (nested cards, empty states) */
  --lumen:         #faf8ea;   /* cards, panels, elevated surfaces */

  /* Text */
  --text:          #1a1a1a;   /* primary text */
  --text-2:        #5a5a52;   /* secondary text, labels */
  --text-3:        #8a8a7c;   /* tertiary text, captions */

  /* Borders */
  --border:        #d5d5c0;   /* default card/input border */
  --border-2:      #c0c0a8;   /* stronger borders */

  /* Semantic — DO NOT use for brand/accent, only for state */
  --ok:            #16a34a;   /* success, DELIVERED, ACTIVE, positive delta, prices */
  --warn:          #ffa946;   /* warning, amber, star ratings */
  --err:           #dc2626;   /* error, CANCELLED, blocked, negative delta, low stock */
  --info:          #2563eb;   /* info states, SHIPPED */

  /* Fonts */
  --sans:    'Inter', system-ui, -apple-system, sans-serif;
  --serif:   'Georgia', 'Times New Roman', serif;
  --mono:    'JetBrains Mono', 'Menlo', monospace;
}
```

### Color usage rules

- **Primary CTA** backgrounds use `--fathom`. Hover → `--fathom-dark`.
- **Page backgrounds** use `--bg`. **Card / panel** backgrounds use `--lumen`.
- **Never use purple, pink, or magenta** — the brand is green. Earlier iterations had purple accents; those are deprecated.
- **Prices** are `--ok` (green), bold, no currency conversion beyond `$`.
- **Status pills** use semantic colors (see Status Pills below), never brand colors.
- **Star ratings** use `--warn` (amber).
- **Role-badge / avatar colors** for customers/users may use a stable-hashed palette (purple/teal/amber/red/blue/pink/green) for visual variety — these are INCIDENTAL, not brand.

---

## 3. Typography

- **Body, UI, labels**: Inter. Weights 400 (body), 500 (UI), 600 (semibold), 700 (bold).
- **Headings, page titles, logo**: Georgia serif, weight 700. Used for: login "Get started", page titles like "Orders Management", card section headers (`<h2>`).
- **Monospace**: JetBrains Mono or system mono. Used for: SKUs, order IDs (`#ORD-1234`), SQL code, session context values, email addresses in muted states.

### Type scale

| Role | Font | Size | Weight | Line height |
|---|---|---|---|---|
| Page title | Georgia serif | 32px | 700 | 1.15 |
| Section title (card header) | Georgia serif | 20px | 700 | 1.2 |
| Body | Inter | 14px | 400 | 1.5 |
| UI / button | Inter | 14px | 600 | 1 |
| Label | Inter | 12px | 500 | 1.3 |
| Small / caption | Inter | 11–12px | 400 | 1.3 |
| Table header | Inter | 11px | 600, letter-spacing 1px, UPPERCASE | 1 |
| KPI value | Inter | 28–32px | 700 | 1 |
| Mono (SKU/ID) | JetBrains Mono | 12–13px | 500 | 1 |

---

## 4. Spacing & Radius

- **Spacing scale**: 4, 8, 10, 12, 14, 16, 20, 24, 32, 40 px. Stick to this scale.
- **Page content padding**: `12px 32px 40px` (top, sides, bottom).
- **Card padding**: 18–20px default. Table cards: 0 (padding is on the `<td>`).
- **Gap between cards / sections**: 16–20px.

### Border radius

- **Cards / panels**: 12px
- **Buttons, inputs, pills, badges**: 8px
- **Avatars (square)**: 8px
- **Avatars (circle)**: 50%
- **Status pills**: 999px (full round)

### Shadows

Keep them subtle. Default card shadow:

```css
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02);
```

Modal / popover: `0 8px 24px rgba(0,0,0,0.12)`.

---

## 5. Core Components

### Buttons

```scss
.btn {
  padding: 8px 14px;
  border-radius: 8px;
  font: 600 14px/1 var(--sans);
  border: 1px solid var(--border);
  background: var(--lumen);
  color: var(--text);
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
}
.btn:hover { opacity: 0.85; }

.btn-primary {
  background: var(--fathom);
  color: white;
  border-color: var(--fathom);
}
.btn-primary:hover { background: var(--fathom-dark); }

.btn-ghost {
  background: transparent;
  border-color: transparent;
}

.btn-danger { color: var(--err); }

.btn-sm { padding: 5px 10px; font-size: 12px; }
```

### Inputs

```scss
.input, .select, .textarea {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--lumen);
  font: 400 14px/1.4 var(--sans);
  color: var(--text);
  outline: none;
}
.input:focus, .select:focus, .textarea:focus {
  border-color: var(--fathom);
  box-shadow: 0 0 0 3px rgba(3,79,70,0.12);
}
```

**Login inputs** are an exception — use bottom-border only (see Login page).

### Cards

```scss
.card {
  background: var(--lumen);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
```

### Status Pills

Full-round pill with colored dot + text. Small, uppercase, letter-spaced.

```scss
.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font: 600 10.5px/1 var(--sans);
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.status-pill::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
}

/* Status → color mapping */
.status-DELIVERED, .status-COMPLETED, .status-ACTIVE  { color: var(--ok);   background: rgba(22,163,74,0.12); }
.status-SHIPPED                                        { color: var(--info); background: rgba(37,99,235,0.12); }
.status-CONFIRMED                                      { color: var(--fathom); background: var(--fathom-light); }
.status-PENDING                                        { color: #b45309; background: rgba(255,169,70,0.18); }
.status-CANCELLED, .status-SUSPENDED, .status-BLOCKED  { color: var(--err);  background: rgba(220,38,38,0.12); }
```

### Colored Avatars (for customer/user rows)

32×32, 8px radius, white initials, bold, 11px. Color is stable-hashed from the name so the same customer always gets the same color.

Palette: `["#7c3aed","#0d9488","#f59e0b","#dc2626","#2563eb","#db2777","#16a34a","#9333ea"]`

```typescript
avatarColor(name: string): string {
  const palette = ["#7c3aed","#0d9488","#f59e0b","#dc2626","#2563eb","#db2777","#16a34a","#9333ea"];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
initials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
```

### KPI Card

```
┌─────────────────────────────┐
│ [icon]                [+24%]│
│                             │
│ $48,294                     │
│ Total Revenue               │
│ 312 new this month          │
└─────────────────────────────┘
```

- Icon in a 36px rounded square with colored tint background matching the metric's accent.
- Big value: 28–32px bold Inter.
- Label: 13px `--text-2`.
- Sub: 11–12px `--text-3`.
- Delta chip top-right: small pill, green for positive (`+24%`), red for negative.

### Tables

```scss
table { width: 100%; border-collapse: collapse; }
thead th {
  text-align: left;
  font: 600 11px/1 var(--sans);
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: rgba(3,79,70,0.03); }
```

### Badges (category chips, etc.)

```scss
.badge {
  padding: 3px 8px;
  border-radius: 8px;
  font: 500 11px/1 var(--sans);
  display: inline-flex; align-items: center; gap: 4px;
}
.badge-muted { background: var(--bg-2); color: var(--text-2); }
.badge-ok    { background: rgba(22,163,74,0.12);  color: var(--ok); }
.badge-warn  { background: rgba(255,169,70,0.18); color: #b45309; }
.badge-err   { background: rgba(220,38,38,0.12);  color: var(--err); }
```

---

## 6. Page Layout Patterns

Every main page follows this pattern:

```
┌─────────────────────────────────────────────────────────┐
│ Page Title 🛒                              [+ New X]    │  ← serif 32px + emoji + primary CTA
│ Alt açıklama / subtitle                                 │  ← 13px muted
├─────────────────────────────────────────────────────────┤
│ [Filter 1 ▾] [Filter 2 ▾] [🔍 Search...]                │  ← filter row
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Content (table, card grid, etc.)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Page emojis (right-side of the H1):
- Dashboard: 📊
- Orders: 🛒
- Products: 📦
- Reviews: ⭐
- Customers: 👥
- Cart: 🛍️
- Users (admin): 👤
- Stores: 🏬
- Categories: 🗂️
- Analytics: 📈
- Audit: 🔒
- Settings: ⚙️
- Analytics Chat: ✨

Note: the topbar should NOT render a duplicate title when a page has its own in-page H1. Hide the topbar title for pages that render their own header.

---

## 7. Page Specs

### 7.1 Login

Centered card on `--bg` background. Logo above card. Card is `--lumen` with 12px radius.

Structure:
1. **"Get started"** — Georgia serif, 36px, bold, centered
2. **Subtitle** — "E-commerce analytics with a multi-agent AI assistant." (muted, centered, 13px)
3. **Three quick-login buttons** — full width, 2px solid `#1a1a1a` border, rounded, transparent background. Each has an emoji + "Continue as Role":
   - 🔑 Continue as Admin
   - 💼 Continue as Corporate
   - 👤 Continue as Individual
4. **"or"** divider — muted, 13px, centered
5. **Email input** — bottom border only (2px solid `#1a1a1a`), no box. Placeholder "Enter your email".
6. **Password input** — same style. Placeholder "Enter your password".
7. **Continue** button — full width, primary green, 44px tall.
8. **Demo accounts footer** — muted mono text at the bottom.

### 7.2 App Shell

- **Sidebar** (240px wide, left): logo at top, section headings ("STORE", "AI"), nav items with icon + label. Active item has `--fathom-light` background + `--fathom` icon/text color. User chip at bottom.
- **Topbar** (sticky, transparent+blur): no page title on pages that render their own. Contains: role switcher pill (IND / CORP / ADM), notification bell, "✨ Ask Flower AI" chip, user avatar + dropdown.
- **Main** scrollable area: page content inside `padding: 12px 32px 40px`.

### 7.3 Individual (Shopper)

- **Dashboard**: 4 KPIs (Lifetime spend, Orders, Average order, Saved with discounts) + order history table + favorite categories donut.
- **Products**: card grid with emoji hero, name, green price, rating, "Add to cart" button.
- **Cart**: left = line items with qty steppers and remove, right = order summary sticky card with "Proceed to checkout".
- **Orders**: table with order ID, date, items count, total, status pill, "View details" button.
- **Reviews**: card list of reviews I've written.

### 7.4 Corporate (Seller / TechCorp)

- **Store Dashboard**: 4 KPIs (Revenue MTD, Orders MTD, Customers, Avg rating) + revenue trend line chart + orders-by-status donut + top products table.
- **Products Catalog** (`📦`): card grid. Each card has:
  - Emoji hero (1.6 aspect ratio, `--bg-2` background)
  - Product name (semibold)
  - Price in green + "X in stock" (red if < 40)
  - Star rating + count
  - Edit / Delete buttons at bottom
  - "+ Add Product" CTA top-right
  - "All Categories" dropdown + "🔍 Search products..." filter
- **Orders Management** (`🛒`): table with columns ORDER ID, CUSTOMER (avatar + name), ITEMS ("3 items"), TOTAL (bold), DATE, STATUS pill. Action button on the right advances the order state. Filters: "All Status", "All Time". CTA: "+ New Order".
- **Reviews**: card list grouped by product; each card has rating, customer, review body, seller reply field.

### 7.5 Admin

- **Platform Overview**: 4 KPIs (GMV, Active stores, Users, Flags) + revenue by store stacked bars + user breakdown donut.
- **Users**: table of all users with role badge, status pill, last-active date, suspend/activate actions.
- **Stores**: card grid — logo, name, owner, revenue, status, open/close actions.
- **Categories**: hierarchical tree with inline rename/delete/add-child.
- **Analytics**: multi-chart dashboard with date range picker.
- **Audit Logs**: dense table of every sensitive action; mono formatting.
- **Settings**: tabbed config panels.

### 7.6 Analytics Chat (Text2SQL)

Three-column layout:

- **Left (240px)**: sidebar (shared app shell sidebar).
- **Center (flex)**: chat. User bubble right-aligned with `--fathom-light` background. Assistant responses left-aligned with colored accent pill on left ("Role-scoped access" etc.). SQL blocks in mono with syntax highlighting. Results rendered as tables or Plotly charts. Suggestion chips row above the input. Input bar at the bottom: "Ask Flower AI · authenticated as <ROLE>".
- **Right (300px)**: agent pipeline panel. 5 steps vertical: Guardrails, SQL Generator, Executor, Analyst, Visualizer — each with icon, title, one-line description. Below it: session context block (`user_role = CORPORATE`, `user_id = 7`, `store_id = 1`) in mono.

Footer row under chat: "Role-scoped via JWT · SELECT-only READ ONLY txn · Gemini LangGraph".

---

## 8. Emoji Usage

Emojis appear in three places:
1. **Page titles** (right of the H1, 28px) — see section 6 for mapping.
2. **Login role buttons** — 🔑, 💼, 👤.
3. **Product card hero images** — 56px, mapped by product category/name:
   - Computers → 💻
   - Audio → 🎧
   - Wearables → ⌚
   - Keyboard → ⌨️
   - Mouse → 🖱️
   - Monitor → 🖥️
   - Phone → 📱
   - Camera → 📷
   - Default → 📦

**Do not** use emojis in body copy, button labels (except login), tooltips, or error messages.

---

## 9. Charts

Use one chart library consistently (recommend Plotly or a small wrapper around SVG). Colors:

- **Primary line / bar**: `--fathom`
- **Primary fill**: `rgba(3, 79, 70, 0.10)`
- **Secondary**: `--warn` (amber)
- **Categorical (donut)**: `#034f46`, `#16a34a`, `#ffa946`, `#dfe9e5`, `#7f1c34` (last for CANCELLED only)
- **Gridlines**: `var(--border)`, dashed, 1px
- **Axis labels**: `var(--text-3)`, 11px

---

## 10. Accessibility & Behavior

- Focus rings: `box-shadow: 0 0 0 3px rgba(3,79,70,0.25)` on interactive elements.
- Hit targets ≥ 36×36px on mobile, ≥ 32×32px on desktop.
- `:hover` → opacity 0.85 or background darken; `:active` → scale(0.98).
- All transitions: 0.15s ease-out unless specified.
- Empty states: centered icon + friendly message + optional CTA. Use `--text-3` for the description.

---

## 11. File Structure Recommendations

Where to put design-system code in the Angular project:

```
src/
  styles/
    _tokens.scss        ← color, spacing, radius variables
    _typography.scss    ← font faces, type scale
    _components.scss    ← .btn, .card, .input, .badge, .status-pill, tables
    _utilities.scss     ← spacing helpers, flex helpers
    styles.scss         ← imports all of the above
  app/
    shared/
      components/
        kpi-card/
        status-pill/
        colored-avatar/
        page-header/      ← renders H1 + emoji + subtitle + CTA slot
        product-card/
        flower-logo/
      pipes/
        fmt-usd.pipe.ts
        fmt-date.pipe.ts
```

---

## 12. What NOT to do

- Don't invent new primary colors. Stick to `--fathom` + semantic tokens.
- Don't use gradients for brand elements. Solid fills only.
- Don't add drop shadows to buttons.
- Don't use all-caps for body text, only for table headers and status pills.
- Don't use Inter for headings — use Georgia serif.
- Don't use emojis in AI-generated content, error messages, or tooltips.
- Don't add page content that isn't functional — no filler sections, no lorem ipsum, no hero banners with no purpose.
- Don't introduce a dark theme unless explicitly asked.
