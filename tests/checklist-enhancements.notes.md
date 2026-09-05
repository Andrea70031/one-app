# Checklist enhancement verification

Manual verification targets for the current static/PWA architecture:

- AI responses always receive an **Esporta PDF** action.
- Responses containing at least two numbered, bullet, checkbox, or structured checklist items also receive **Salva nei Promemoria**.
- Checklist save creates one `one_reminders` row per item when authenticated and a local fallback when cloud save is unavailable.
- Checklist items share `source.kind=checklist`, a checklist id, title, index, and total so a later Apple Watch UI can group them.
- PDF generation is dependency-free, supports multiple pages, uses WinAnsi text encoding for common Italian accented characters, and downloads an A4 PDF.
- PWA cache is bumped to `one-v12` and includes the checklist enhancement asset.
