# Add owner-only private calendar CRUD
Status: ready-for-agent
Type: task

## Comments

2026-09-27: Implementation and disposable-database verification complete, pending
coordinating review/integration. Main owns the separate private_events model and
additive migration. Owner-locked writes and private hints preserve privacy; new/time-
changing quest checks and meetup acceptance consume private event busy intervals.
Build and all48 tests passed. Live database/services, root API docs, socket and mobile
were not changed by this branch. This slice is manual calendar CRUD only.

2026-09-27: Root review, cross-service E2E, additive live migration with existing-row preservation, mobile/APK integration and local deployment completed.
