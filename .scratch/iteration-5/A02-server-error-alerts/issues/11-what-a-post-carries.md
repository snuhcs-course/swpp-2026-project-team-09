# 11: A post to Slack carries a cut message, no whole stack, and no mention

Parent: [A02 spec](../spec.md)
Status: needs-triage
Blocked by: 04

Native files: none. Releases: none; a `terraform apply` puts the changed pipeline in place.

## What to build

From the apply of ticket 09 on, the pipeline posts a record's `message` and `stack` whole (`fluent-bit-pipeline/filters.conf` keeps both keys as they are). 23 `logger.warn` and `logger.error` calls in `main-server/src` put `${String(error)}` in the message, and NestJS logs an unhandled 500 with its message and stack. So whatever an error's text holds is copied to Slack, and `<!channel>` inside a third party's error text would ping the channel, since Slack reads its own markup in a post.

Decide and build the shape of a post:

- how long a `message` may be, and whether `stack` is dropped, cut to its first lines, or kept;
- how Slack's markup in a record (`<!channel>`, `<!here>`, `<@…>`) is made harmless;
- whether a database error's text prints a query's arguments, and if it does, whether the server prints its short form.

Until this is done the team accepts the whole text for the private channel (the spec's Out of Scope says so).

## Done when

- [ ] `pipeline.bats` has a case for a long message, one for a stack, and one for a mention, each showing what reaches the output.
- [ ] The infra README's "Server logs in Slack" says what a post carries.
- [ ] The spec's Out of Scope line about a post's `message` and `stack` is gone.

## Comments
