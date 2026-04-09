# Trove'a — Claude Code Instructions

You are implementing Trove'a, a mobile-first Merchant OS for Gen-Z curators in Nigeria. This is a React 18 + TypeScript (Vite) frontend — static mockup only, no Supabase wiring yet. All data comes from fixtures.

Before touching any code, read the supporting docs in this directory:
- `ARCHITECTURE.md` — full file structure, type shapes, store APIs, all constants
- `DESIGN.md` — canonical visual rules, tokens, and neumorphic material system
- `CONVENTIONS.md` — every rule you must follow without exception
- `PHASES.md` — what's built, what each upcoming phase covers
- `PERSONAS.md` — the five Curator types and their exact commerce models

---

## Project Root

```
src/
├── styles/          tokens.css + global.css + cards.css (import order: tokens, global, components)
├── lib/             types, fixtures, utils, constants, stores
├── components/      primitives + merchant shell
├── pages/           auth, onboarding, merchant, public
├── App.tsx          full route tree
└── main.tsx         tokens.css + global.css imported here
```

Path alias: `@/` = `src/`

---

## The One Constraint That Overrides Everything

This is a Phase 1 static mockup. **No real API calls. No Supabase. No fetch().** All data comes from fixtures in `src/lib/fixtures/`. When Phase 2 arrives, Supabase will be wired in — not now.

---

## Output Rules (Non-Negotiable)

1. **Output every modified file in full.** No truncation. No `// ... rest stays the same`. No ellipsis. Complete files only.
2. **Never invent import paths.** Only import from paths that exist or are being created in this same task.
3. **All animation imports from `@/lib/motion` only** — never directly from `framer-motion`.
4. **All type-only imports use `import type { }`** — required by Vite's `isolatedModules` config.
5. **No `as any` casts.** Ever.
6. **New pages always get a `.tsx` + `.module.css` pair.** Never inline styles on a new page.
7. **After outputting files**, write a brief implementation note: what was created, what was modified, any decisions made, any items skipped and why.

---

## When You Are Unsure

- Check `DESIGN.md` for the canonical visual tokens, neumorphic patterns, and theme presets.
- Check `ARCHITECTURE.md` for exact type shapes and constant field names before writing code that accesses them.
- Check `CONVENTIONS.md` for the styling rule before hardcoding any value.
- The fixture data in `ARCHITECTURE.md` is the source of truth for what fields exist on merchants, products, receipts.
- If a constant field name is ambiguous (e.g. `.name` vs `.label`, `.heading` vs `.headingFont`), the correct shapes are documented in `ARCHITECTURE.md`. Trust that doc over your training data — past bugs have all come from field name mismatches.