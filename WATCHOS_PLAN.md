# ONE for Apple Watch — MVP plan

## Product goal
Apple Watch should be a fast action surface for ONE, not a miniature copy of the full app.

## Recommended architecture
Build an independent watchOS app in SwiftUI that talks directly to the existing ONE backend. Do not depend on WatchConnectivity as the primary data path; it can be added later as an optimization when an iPhone companion exists.

## MVP screens
1. **Pulse** — next reminders, open checklist count, urgent items.
2. **Checklists** — grouped checklist items backed by `one_reminders`; tap to complete/reopen.
3. **Ask ONE** — dictate a short request, send text to the existing ONE AI endpoint, show a compact answer.

## Complication / Smart Stack
Use WidgetKit for a small ONE complication/widget showing the next reminder or number of open items and opening the relevant screen in ONE.

## Authentication
Avoid typing email/password on the Watch. Pair the Watch from an already authenticated ONE session using a short-lived device-link code. Exchange it for a revocable Watch session stored in Keychain.

## Backend reuse
- `one_reminders`: checklist/reminder source and completion state.
- `one_actions`: action history where useful.
- `one-ai`: existing AI endpoint for short text requests.
- Add a small device-link endpoint/table only when implementation begins.

## Out of scope for MVP
- PDF generation on Watch.
- Full document/photo analysis.
- Full construction-site administration.
- Long AI conversations.
- Email/password account creation directly on Watch.

## Suggested sequence
1. Finish checklist → reminders + PDF in the web app.
2. Normalize checklist grouping in `one_reminders.source`.
3. Create watchOS SwiftUI project.
4. Implement device linking and Keychain session.
5. Implement Pulse + Checklists.
6. Add Ask ONE via dictation.
7. Add WidgetKit complication / Smart Stack.
