<div align="center">

# Kept

**A private, local-first expense tracker.**
No account. No cloud. No tracking. Every number stays on your device.

</div>

---

Kept is a personal-finance **ledger with spending stats** for **Android, iOS, and
web** from one Expo/React Native codebase. All data lives in on-device SQLite —
there is no backend to sync to and nothing to sign up for. The app is protected by
a PIN lock and supports local import/export.

> **Status:** local-first MVP. `apps/mobile` (Expo) is the active app;
> `apps/web` (React/Vite) is reference-only; `apps/api` (FastAPI/Postgres) is
> **parked** — kept as the seed for optional future sync, not part of the MVP.
> The full plan lives in [`doc/master-plan.md`](doc/master-plan.md) — it is the
> source of truth.

## Repository layout

```
apps/
  mobile/   Expo / React Native app (active) — see apps/mobile/README.md
  web/      React + Vite reference app
  api/      FastAPI + Postgres backend (parked)
doc/        Planning & product docs (see below)
docs/       Public GitHub Pages site (landing + privacy policy)
store-assets/  Play Store art (icon, feature graphic)
scripts/    Repo tooling
```

## Quick start

Everything runs from the repo root via the top-level `Makefile`, or per-app with
`make -C apps/<app> <target>`.

```bash
make run-mobile        # Expo dev server (press w / a / i for web / Android / iOS)
make run-mobile-web    # web target (fastest dev loop)
make lint              # lint + typecheck across active apps
make test              # test suites across active apps
```

See [`apps/mobile/README.md`](apps/mobile/README.md) for the mobile stack, layout,
and full command list.

## Documentation

| Doc                                                              | What                                             |
| --------------------------------------------------------------- | ------------------------------------------------ |
| [`doc/master-plan.md`](doc/master-plan.md)                       | Source of truth — full plan & phases             |
| [`doc/prd.md`](doc/prd.md)                                        | Product requirements                             |
| [`doc/rfc-001-expense-manager.md`](doc/rfc-001-expense-manager.md) | Architecture RFC                               |
| [`doc/implementation-plan-fe.md`](doc/implementation-plan-fe.md)  | Frontend implementation plan                     |
| [`doc/implementation-plan-be.md`](doc/implementation-plan-be.md)  | Backend implementation plan (parked)             |
| [`doc/dashboard-ledger-ux-onepager.md`](doc/dashboard-ledger-ux-onepager.md) | Dashboard & ledger UX                 |
| [`doc/branding-logo.md`](doc/branding-logo.md)                    | Brand identity, app-icon concept & prompts       |
| [`doc/android-install.md`](doc/android-install.md)                | Installing the Android build                      |
| [`doc/play-store-listing.md`](doc/play-store-listing.md)          | Store listing copy & Data Safety answers         |
| [`doc/play-store-closed-test.md`](doc/play-store-closed-test.md)  | Closed-test setup                                |
| [`doc/play-store-release.md`](doc/play-store-release.md)          | Play release steps                               |
| [`RELEASING.md`](RELEASING.md)                                    | Release / build flow                             |

## License

Kept is **dual-licensed**. Non-commercial use is free under the
[PolyForm Noncommercial License 1.0.0](LICENSE); commercial or production use
requires a separate license — see [`COMMERCIAL_LICENSE.md`](COMMERCIAL_LICENSE.md).

Copyright © 2025 Srajan Pathak. All rights reserved.
