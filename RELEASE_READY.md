# ONE 1.0 — release candidate under validation

This candidate is **not yet cleared for App Store submission**. See `APP_STORE_AUDIT_20260919.md` for the observed evidence and remaining release gates.

Required automated checks: `npm ci`, `npm run check`, `npm test`, iOS production bundle and generated native configuration. An unsigned JavaScript export is not a signed iOS build or a device test.

Required operational checks: live authenticated backend/AI test, email confirmation and recovery redirects, deletion including Storage, signed TestFlight build, device smoke tests and complete App Store Connect metadata.
