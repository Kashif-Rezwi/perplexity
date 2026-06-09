# Design System

Extracted from Perplexity's actual UI across all reference screenshots (home, thread answer view, links tab, collapsed sidebar). Every decision here is grounded in observed pixel-level detail.

---

## Color Palette

Defined as CSS custom properties in `globals.css`. Referenced via Tailwind's arbitrary value syntax `bg-[var(--color-...)]` or directly in component classes.

### Backgrounds
| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#111111` | Main page background |
| `--color-sidebar` | `#171717` | Sidebar panel (barely lighter than page) |
| `--color-surface` | `#1F1F1F` | Input box, code block bg, elevated cards |
| `--color-surface-hover` | `#272727` | Hover bg on nav items, thread list items |
| `--color-surface-active` | `#232323` | Active/selected item pill background |

### Borders
| Token | Hex | Usage |
|---|---|---|
| `--color-border` | `#2A2A2A` | Input box outline, card borders |
| `--color-border-subtle` | `#1E1E1E` | Dividers between sections |

### Text
| Token | Hex | Usage |
|---|---|---|
| `--color-text` | `#EDEDED` | Primary readable text, answer body |
| `--color-text-muted` | `#9A9A9A` | Nav item labels, source domain names |
| `--color-text-faint` | `#555555` | Placeholder, "No recent sessions" |
| `--color-text-link` | `#20808D` | Source titles in links tab, active indicators |

### Accent (Teal)
| Token | Hex | Usage |
|---|---|---|
| `--color-accent` | `#20808D` | Submit button bg, active tab underline, source links, `>` chevrons |
| `--color-accent-hover` | `#1A9099` | Hover on accent elements |
| `--color-accent-faint` | `rgba(32, 128, 141, 0.15)` | Citation badge bg, subtle teal surfaces |

### Feature Cards (Home page only)
| Card | Gradient | Direction |
|---|---|---|
| Search card | `#1A7A6E → #1DA882` | `135deg` |
| Computer card | `#0E2B34 → #1A3D4A` | `135deg` |

---

## Typography

- **UI Font**: `Inter` loaded via `next/font/google` — `--font-inter` CSS variable
- **Wordmark font**: Thin weight (`300`), large display, used only for the home logo

### Type Scale
| Role | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `label` | `11px` | 400 | 1.4 | Timestamps, "bash" code block label |
| `caption` | `12px` | 400 | 1.5 | Thread history items, source URL |
| `nav` | `13px` | 400 | 1 | Sidebar nav labels |
| `body` | `14px` | 400 | 1.6 | Input placeholder, snippet text |
| `answer` | `15px` | 400 | 1.75 | AI answer body text |
| `heading-sm` | `16px` | 600 | 1.4 | Answer `### headings`, source titles |
| `heading-md` | `18px` | 700 | 1.3 | Answer `## headings` |
| `question` | `15px` | 400 | 1.6 | User question in thread bubble |
| `wordmark` | `36px` | 300 | 1 | "perplexity" home page title |

---

## Spacing

Base unit: **4px**. Used consistently across all gaps, paddings, and margins.

| Value | px | Common usage |
|---|---|---|
| `1` | 4px | Icon-to-label gaps, tiny offsets |
| `2` | 8px | Inline badge padding, small gaps |
| `3` | 12px | Sidebar item vertical padding |
| `4` | 16px | Sidebar item horizontal padding, card padding |
| `5` | 20px | Between nav sections |
| `6` | 24px | Content block gaps |
| `8` | 32px | Page section spacing |
| `10` | 40px | Major section breaks |
| `12` | 48px | Desktop page horizontal padding |

---

## Border Radius

| Name | Value | Usage |
|---|---|---|
| `xs` | `4px` | Inline code pill, small badges |
| `sm` | `6px` | Code block header, small chips |
| `md` | `8px` | Sidebar active item pill |
| `lg` | `12px` | Search input, thread question bubble, source card |
| `xl` | `16px` | Feature cards (home), follow-up input |
| `full` | `9999px` | Avatar, submit button |

---

## Layout & Structure

### Two-Column Shell

```
+--[Sidebar]--+--[Main Content Area]--+
```

| State | Width | What shows |
|---|---|---|
| Expanded (default, ≥ 1024px) | `220px` | Logo + collapse toggle + icon + label |
| Collapsed (user toggled / tablet) | `56px` | Logo + collapse toggle + icon only |
| Hidden (mobile < 768px) | `0px` | Slide-in overlay triggered by hamburger |

### Main Content
- Max width: `768px` centered within the remaining space
- On thread page: full-height, scrollable, with the follow-up input sticky at the bottom
- Horizontal padding: `48px` desktop, `24px` tablet, `16px` mobile

---

## Sidebar Anatomy

### Header (always visible)
- Logo icon: top-left, `28px`, white
- Collapse toggle: top-right, `20px`, `#9A9A9A`, hover `#EDEDED`
- Height: `56px`, flex row with `justify-between`

### Nav Items (expanded state)
Each item is a flex row: `icon (18px) + label (13px)` with `gap-3`, `px-4 py-3`, `rounded-md`.

| State | Icon color | Label color | Background |
|---|---|---|---|
| Default | `#9A9A9A` | `#9A9A9A` | transparent |
| Hover | `#EDEDED` | `#EDEDED` | `#272727` |
| Active | `#EDEDED` | `#EDEDED` | `#232323` |

The **"New"** item uses a `+` icon (not a `Plus` pill shape). It always renders with the same nav item layout.

### Nav Items (collapsed state)
- Only icon visible, centered in the `56px` column
- Tooltip on hover (optional in V1)
- Same active/hover color rules

### Thread History (below nav)
Scrollable list of past threads, one item per row:
- Font: `12px`, color `#9A9A9A`, truncated with ellipsis
- Height: `~30px` per item, `px-4`
- Active thread item: slightly brighter text `#EDEDED`, `...` overflow menu appears on hover (out of scope V1)
- "No recent sessions": `12px`, `#555555`, `px-4 pt-2`

### Bottom (pinned)
In the reference this shows user avatar + notification icons. In our V1 (no auth):
- Show nothing, or a minimal "Sign in" row — defer to Phase 3 decision

---

## Thread Page Components

### User Question Bubble
- Appears right-aligned above the answer
- Background: `#1F1F1F`
- Border: `1px solid #2A2A2A`
- Border radius: `12px`
- Padding: `12px 16px`
- Max width: `~80%` of content area
- Font: `15px`, `#EDEDED`

### Answer Body
- Left-aligned, no container — text sits directly on `bg-page`
- Font: `15px / 1.75` line height, `#EDEDED`
- Bold text: `font-weight: 600`, same color
- Paragraphs: `margin-bottom: 16px`

### Code Blocks
- Background: `#1F1F1F`
- Border: `1px solid #2A2A2A`
- Border radius: `8px`
- Language label: top-left, `11px`, `#9A9A9A`, e.g. "bash"
- Copy icon: top-right, `16px`, `#9A9A9A`
- Code font: monospace, `13px`, `#EDEDED`
- Padding: `12px 16px`

### Inline Code
- Background: `#252525`
- Border radius: `4px`
- Padding: `2px 6px`
- Font: monospace, same size as surrounding text, `#EDEDED`

### Tab Bar (Answer / Links / Images)
- Sits at the very top of the main content area, sticky
- Tabs: `14px`, `#9A9A9A` default → `#EDEDED` active
- Active indicator: `2px` teal underline (`#20808D`) flush with bottom of tab bar
- Height: `~44px`
- Gap between tabs: `24px`
- **V1: Only "Answer" tab is implemented. Links/Images are out of scope.**

### Follow-Up Input (bottom of thread)
- Sticky at the bottom of the main content, above the page edge
- Same visual as home page input, but no feature cards below
- Placeholder: `"Ask a follow-up"`
- Background: `#1F1F1F`
- Border: `1px solid #2A2A2A`
- Border radius: `16px`
- Padding: `14px 16px`
- Toolbar row: `+`, `Search ▾`, `Model ▾` (out of scope V1, omit), mic (out of scope V1), submit arrow button
- Submit button: circular, `32px`, `#20808D` background, white arrow icon

---

## Source Card (Links Tab / Sources Panel)

Used in Phase 5 (sources panel) and later Phase 7 (detailed view). Observed from the Links tab screenshot.

### Layout (per card)
```
[Favicon 40×40] [Domain (bold 12px)]
                [URL (11px, muted)]
                [Title (teal, 14px, linked)]
                [Snippet (13px, 2 lines, muted)]
```

- Favicon/logo: `40×40px`, `rounded-lg`, loaded via Google S2 API
- Domain: `12px`, `#EDEDED`, `font-weight: 500`
- URL: `11px`, `#9A9A9A`, truncated
- Title: `14px`, `#20808D`, linked, truncated at 1 line
- Snippet: `13px`, `#9A9A9A`, max 2 lines, `-webkit-line-clamp: 2`
- Card padding: `12px 0` (no card background — items are in a plain list)
- Divider: `1px solid #1E1E1E` between items

---

## Iconography

- Library: **Lucide React**
- Stroke style: `1.5px` (default Lucide), not filled
- Standard size: `18px`
- Small size: `16px` (toolbar, copy buttons)
- Large size: `20px` (logo, primary actions)
- Default color: `#9A9A9A`
- Active/hover: `#EDEDED`
- Accent: `#20808D` (submit button arrow, active ">" chevrons)

---

## Animations & Transitions

| Element | Property animated | Duration | Easing |
|---|---|---|---|
| Sidebar expand | `width` | `200ms` | `ease` |
| Sidebar labels | `opacity` | `150ms` | `ease` |
| Nav item hover | `background-color` | `100ms` | `ease` |
| Thread turn in | `transform + opacity` | `250ms` | `ease-out` |
| Page fade-in | `opacity` | `200ms` | `ease` |
| Tab underline | `left + width` | `150ms` | `ease` |

All transitions should be disabled with `prefers-reduced-motion: reduce`.

---

## What We Are NOT Building (V1 Scope)

The screenshots show features outside our backend's V1 scope. Do not implement these:

| Feature | Where seen | Why excluded |
|---|---|---|
| Top nav tabs (Discover, Finance, Health…) | Home header | No backend support |
| Computer / Spaces / Artefacts nav items | Sidebar | No backend support |
| Model selector dropdown | Input toolbar | No backend support |
| Microphone input | Input toolbar | No backend support |
| Upgrade plan button | Sidebar bottom | No auth/billing in V1 |
| Images / Links tabs on thread page | Thread header | Out of V1 scope |
| Thread `...` overflow menu | Thread history items | No edit/delete endpoints |
| "Pro" badge | Input tooltip | No subscription in V1 |
| Share button | Thread header | Out of V1 scope |
