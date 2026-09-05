# Checklist + Watch foundation

This branch adds the first reusable checklist workflow for ONE and documents the recommended Apple Watch MVP.

## Checklist workflow
- Export any ONE AI answer as a dependency-free A4 PDF.
- Detect structured/numbered/bulleted/checkbox checklists.
- Convert checklist items into spuntabili ONE reminders.
- Preserve checklist grouping metadata in `one_reminders.source` for future watchOS consumption.
- Keep a local reminder fallback when cloud sync is unavailable.

## Apple Watch direction
See `WATCHOS_PLAN.md` for the proposed independent SwiftUI watchOS app: Pulse, Checklists, Ask ONE, and a WidgetKit complication/Smart Stack surface.
