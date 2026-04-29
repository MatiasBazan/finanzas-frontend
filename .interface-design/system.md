# Finanzas · Editorial Financial

Personal-finance app (ARS/AR). Direction: **editorial financial — modern, professional, light**.

## Intent

- **User**: dueño revisando saldo de tarjetas, cuotas, gastos del mes. Quiere algo cuidado y profesional, no terminal de trader, no SaaS dashboard genérico.
- **Verbs**: leer saldo · ver vencimientos · cargar gasto · cerrar deuda · importar resumen PDF.
- **Feel**: **editorial financial premium**. Light mode, papel cool. Tipo Stripe Atlas / Mercury / Linear, pero sin parecerse a ninguno. Mezcla serif (headlines) + sans (UI) + mono (figuras).

## Tokens (`app/globals.css`)

```
--paper        oklch(0.987 0.003 220)  canvas
--paper-lifted oklch(1 0 0)            card surface (lifted)
--paper-deep   oklch(0.965 0.005 220)  inputs / table head / hover

--ink       oklch(0.18 0.015 240)  primary text
--ink-soft  oklch(0.38 0.012 240)  secondary
--ink-mute  oklch(0.55 0.010 235)  tertiary / meta
--ink-faint oklch(0.72 0.008 235)  placeholder / muted

--rule       oklch(0.905 0.005 235)  hairline standard
--rule-soft  oklch(0.945 0.005 235)  internal divider
--edge       oklch(0.855 0.008 235)  input border

--teal       oklch(0.42 0.10 200)   ÚNICO accent (petróleo)
--teal-soft  oklch(0.58 0.08 200)
--teal-bg    oklch(0.42 0.10 200 / 0.06)

--neg   oklch(0.50 0.18 25)  desat deep red — debt / destructive
--pos   oklch(0.50 0.10 155) sage deep — paid / positive
--warn  oklch(0.62 0.13 60)  desat amber — alto / vencer pronto
```

Tailwind utilities: `bg-paper`, `bg-paper-lifted`, `bg-paper-deep`, `text-ink`, `text-ink-soft`, `text-ink-mute`, `text-ink-faint`, `border-rule`, `border-rule-soft`, `border-edge`, `bg-teal`, `text-teal`, `bg-teal-bg`, `text-neg`, `bg-neg-bg`, `text-pos`, `bg-pos-bg`, `text-warn`, `bg-warn-bg`.

## Depth strategy

**Hairlines + lift only on overlays.**

- Surfaces: `paper` (canvas) → `paper-lifted` (card) → `paper-deep` (inset / table head / hover).
- Borders: `border-rule` between sections, `border-rule-soft` within panel rows, `border-edge` only on inputs.
- Cards: `border border-rule` + flat. **No shadow on cards.**
- Overlays (Dialog, Popover): `lift` utility — soft layered shadow defined in `globals.css`. Only place shadows live.
- Sidebar: same `bg-paper` as canvas, separated by `border-r border-rule`.

## Radius

`--radius: 0.5rem` (8px).
- Inputs/buttons: `rounded-md` (≈ 6px)
- Cards/dialogs: `rounded-lg` (8px)
- Tags / dots: `rounded-full`
- **Never `rounded-2xl`** — too soft for editorial.

## Spacing

Base 4px. Standard:
- Page horizontal: `px-5 lg:px-8`
- Page vertical: `py-7`
- Page max width: `max-w-7xl`
- Section gap: `mt-10`, `pt-7 border-t border-rule`
- Strip / header bottom: `pb-5 border-b border-rule`
- Table rows: `py-3` to `py-3.5`
- Form field gap: `space-y-4`
- Form label/input gap: `mb-1.5`

## Typography

Three families, each with a job:
- **Source Serif 4** (`--font-serif`, class `serif`) — page titles, section headers, dialog titles, hero numbers' word equivalents (e.g. "Sin vencimientos"). Adds editorial weight.
- **Inter** (`--font-inter`, default body) — UI text, labels, descriptions.
- **JetBrains Mono** (`--font-mono`) — **all figures, dates, codes**. Tabular-nums + slashed-zero auto-applied via `.font-mono` rule.

Sizes:
- Page title (sidebar / topbar): `serif text-[20px] font-medium tracking-tight`
- Section header: `serif text-[17px] font-medium tracking-tight`
- Hero number (KPI / saldo): `font-mono text-[26px] leading-none tracking-tight`
- Body: `text-[13px]` to `text-[13.5px]`
- Eyebrow micro-label: `.eyebrow` (11px tracked 0.10em uppercase ink-mute, weight 500)
- Meta / fine print: `text-[11.5px]` to `text-[12px]` `text-ink-mute` / `text-ink-faint`

## Signature elements

1. **Number-first hierarchy** — Stat cards put the figure (`$1.234.567`) at 26px mono first, label small above as `eyebrow`. Like Stripe/Mercury.
2. **`<span class="peso">$</span>` ledger column** — Peso symbol in mono, `--ink-faint`, `0.25ch` margin-right. Aligns ledger-style across the whole interface.
3. **Delta inline** — `↑ 12.4%` / `↓ 3.1%` next to KPI value, color = pos/neg by direction. Pro = comparar.
4. **Status as 6px dot + label** in `text-pos` / `text-warn` / `text-ink-mute`. Never as pill/badge.
5. **DTE phrasing natural** — `en 5 días` / `vencida hace 3d`. Not `+5d` / `-3d` (that was terminal).
6. **Mezcla tipográfica** — serif title + sans body + mono figures coexist on every page. Editorial signal.
7. **Eyebrow micro-labels** — `eyebrow` class on every section/field label. Small caps tracked.
8. **`⌘ K Buscar` kbd chip** — top bar shows keyboard hint as `.kbd` chips. Modern pro.
9. **Donut center label** — donut with `Total $X` rendered in absolute center.
10. **Hairlines instead of cards everywhere** — sections separated by `border-t border-rule`, content flows openly. Card grid only when grouping (KPI row, tarjetas).

## Defaults rejected

| Default | Replacement |
|---|---|
| Multi-color metric card grid | Single `border border-rule rounded-lg` strip with `gap-px` between cells (creates hairline divider via bg-rule showing through) |
| Pie chart 8-color rainbow | Donut with top-4 categories + "otras", palette = teal/warn/pos/neg/ink-mute, max 5 segments |
| Generic blue accent | Single `--teal` petróleo, used on: primary action, active nav, focus ring, donut primary segment |
| Bootstrap red destructive | `--neg` desat deep red, used on: debt amounts, confirm destructive |
| Pill badges with bg fill | Eyebrow text in tracked uppercase, no fill |
| Lucide icons everywhere | Mostly removed. Inline SVG only for hamburger; no icons in stat cards or table rows |
| Glow shadows / gradient logo | Serif "Finanzas" wordmark, no icon, no glow |
| Soft shimmer skeletons | `bg-paper-deep animate-pulse rounded-sm` strips |

## Component patterns

### Page header (top of every dashboard page)

```tsx
<div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-rule">
  <div>
    <p className="eyebrow">Movimientos</p>
    <p className="mt-1 text-[13px] text-ink-mute">{count} registros · subtotal {amount}</p>
  </div>
  <button className="h-9 px-3.5 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors">
    + Nuevo
  </button>
</div>
```

### Primary button (filled teal)

```tsx
className="h-9 px-3.5 text-[13px] font-medium bg-teal text-paper hover:bg-ink rounded-md transition-colors"
```

Hover swaps to ink (near-black) — keeps focus on action without growing the accent palette.

### Secondary / ghost button

```tsx
className="h-9 px-3.5 text-[13px] text-ink-mute hover:text-ink transition-colors"
```

For destructive confirm: `text-neg font-medium`.

### Input

```tsx
className="h-9 bg-paper-deep border border-edge rounded-md text-ink placeholder:text-ink-faint text-[13px] px-3 focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/15"
```

Add `font-mono` for numeric / date / email fields.

### Stat (number-first KPI cell)

See `Stat` in `app/(dashboard)/dashboard/page.tsx`. Pattern: `bg-paper-lifted px-5 py-5` inside a `gap-px bg-rule border border-rule rounded-lg overflow-hidden` wrapper. Eyebrow → 26px mono value with `.peso $` → delta + aux line at 12px.

### Eyebrow label

```tsx
<span className="eyebrow">Categoría</span>
```

Globally available via `globals.css`. Use for: section labels, table headers, form field labels (paired with explicit `<span>` text), micro-meta.

### Status dot + label

```tsx
<span className="inline-flex items-center gap-1.5 text-pos">
  <span className="h-1.5 w-1.5 rounded-full bg-pos" />
  pagada
</span>
```

### Peso symbol on figures

```tsx
<span className="font-mono text-ink">
  <span className="peso">$</span>
  {fmtNum(value)}
</span>
```

`.peso` is `font-mono`, `text-ink-faint`, with `0.25ch` margin-right. Creates ledger-aligned column feel.

### Recharts tooltip (editorial light)

```ts
const TOOLTIP_STYLE = {
  background: 'oklch(1 0 0)',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  color: 'var(--ink)',
  fontSize: 12,
  padding: '8px 10px',
  boxShadow: '0 8px 24px -12px oklch(0.25 0.02 240 / 0.18)',
};
```

Bars: `fill="var(--teal)"`, `radius={[3,3,0,0]}`, `maxBarSize={36}`.
Donut: stroke = `var(--paper)` 2px (creates separation), inner 56 / outer 84.

### Dialog / Popover overlay

```tsx
<DialogContent className="bg-paper-lifted border border-rule rounded-lg lift text-ink sm:max-w-md">
```

`.lift` is the only shadow utility. Hairline border + soft layered shadow.

### Auth pages

Top wordmark strip (`h-16 border-b border-rule`) → centered form column `max-w-sm` → footer strip with light meta. Eyebrow + `serif text-[28px]` title + body description above form.

## Iconography

Almost zero. Removed. Only:
- Hamburger SVG inline in dashboard top bar (mobile)
- ASCII `+` for new-item buttons
- Status dots (6px circles) instead of icon badges

## Animation

- Hover: `transition-colors` ~150ms (Tailwind default).
- Loading: `animate-pulse` on dot or skeleton bar.
- No spring, no scale, no glow.

## Locale conventions

- Currency: `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`. Plus separate `fmtNum` for cases where we render the `$` ourselves via `.peso`.
- Compact ticks: `notation: 'compact', maximumFractionDigits: 1`
- Dates: `dd MMM yyyy` for tables (`day: '2-digit', month: 'short', year: 'numeric'`), `dd MMM` for compact tape, `mes year` long-form for `fmtMes` ladder rows.
- Microcopy: full Spanish sentences, natural — `"Aún no hay gastos registrados"`, `"Próximo vencimiento"`, `"vencida hace 3d"`. **No** terminal lingo (`parse_ok`, `commit`, `auth_error`).

## File map

- `app/globals.css` — tokens + `.eyebrow` `.serif` `.peso` `.lift` `.kbd` `.edge-bar` utilities + scrollbar/selection
- `app/layout.tsx` — Inter + JetBrains Mono + Source Serif 4 loaded; no `dark` class
- `app/(dashboard)/layout.tsx` — sidebar serif wordmark + active edge-bar accent + topbar with page title in serif
- `app/(dashboard)/dashboard/page.tsx` — number-first KPIs + delta + donut with center total + bar chart + recent activity ledger
- `app/(dashboard)/gastos/page.tsx` — table with eyebrow categoría, peso column, hover-reveal actions
- `app/(dashboard)/deudas/page.tsx` — table + ladder with bar fills + DTE natural phrasing
- `app/(dashboard)/tarjetas/page.tsx` — card panels with dual-currency hero + cuotas list + PDF import dialog
- `app/(auth)/login,register` — wordmark strip → editorial title → form → footer
