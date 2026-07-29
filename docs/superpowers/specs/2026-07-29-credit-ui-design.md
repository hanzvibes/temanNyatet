# Credit UI Design

## Direction
Inline utility: credit remains visible in the summarize action without competing with note content, while exhaustion gets a clear animated recovery path.

## States
- Loading: compact skeleton/placeholder in the credit chip.
- Healthy: spark icon + numeric balance in a tinted chip.
- Low (1–2): warm amber tint and copy that gently signals limited remaining uses.
- Empty: muted/destructive tint, disabled summarize affordance, and an animated dialog when the user attempts to summarize.
- Subscription settings: a dedicated credit card with balance, one-credit-per-summary explanation, and a top-up CTA placeholder that can later route to Mayar checkout.

## Interaction
The summarize button keeps its existing action and loading behavior. The chip updates immediately from a successful response. Exhaustion opens a Radix dialog with fade/scale animation, concise Indonesian copy, a primary “Lihat opsi top-up” action, and a secondary dismiss action. The primary action opens the existing subscription settings section through the current overlay event.

## Visual language
Use the existing warm light palette, rounded surfaces, lucide icons, and Framer Motion. Avoid gradients and excessive card nesting. Use semantic labels, visible focus rings, pressed feedback, and respect reduced-motion preferences through existing motion primitives.

## Scope
Frontend only: CatatanPage summarize affordance/dialog and SettingsSheet subscription credit presentation. No API, database, or payment changes.
