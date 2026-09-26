# Main-server Prisma conversion

User explicitly requested Prisma ORM. Adopt pinned Prisma 7.10.0 with an independent
main schema and migration history. Preserve existing APIs, data, ownership, versions,
transaction locks, cache revision ordering, location consent and transactional outbox.
No automatic baseline/reset. Coordinator verifies and baselines the live database.

Acceptance: genuine Prisma CRUD throughout main services, tagged SQL for lock and
consent semantics, fresh concurrent migration, existing-data baseline preservation,
full regression suite, and non-root Docker runtime startup against disposable data.
