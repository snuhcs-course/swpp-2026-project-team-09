# 07: The test of an Administrator's change during a Judgement acts only on its own post

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

A merge queue build timed out on `main-server/test/judgement-sessions.integration.test.ts`, "A Draft an Administrator changes later > while the model reads the post publishes nothing of that Judgement" ("Test timed out in 5000ms"). The pull request under test touched nothing near it. The job's log has one error from that test's process: "The step failed on Source Post …: Error".

The test spies on `JudgementsService.judgePost`. After the real call, it patches its own post's event, with the version it read before and `.expect(200)`, on every call, whatever post the call was for. The test before it, "after a failed try is not tried again", waits only until its post is finished. Its first step run can finish that post once the Administrator's change lands, while the run its `nextCollection` started is still going. That run then calls `judgePost` for the earlier post through this test's spy, and the patch changes this test's event first. This test's own patch is then refused with 409: `.expect(200)` throws inside the step, the step fails on the post (logged as "Error"), the post is never finished, and `finished` waits until the test's five seconds run out.

The spy now patches only when `judgePost` is called for this test's post, and only once, so a call for another post, or a second run over this post, changes nothing.

## Acceptance criteria

- [x] With one `judgePost` call for another post put right after the spy, standing in for the run the test before left, the test timed out exactly as in the queue build ("The step failed on Source Post …: Error", "Test timed out in 5000ms") before the change, and passes after it.
- [x] Without that call, the file passes three runs in a row; lint, format and typecheck of `main-server` pass.
- [x] What the test checks is unchanged: during the Judgement of its post an Administrator changes the Draft, and nothing of that Judgement is published.

## Comments

### Decisions (2026-11-16)

- No server code changes: the step behaves as designed; only the test's spy reached past its own post.
- `JudgementWorld.nextCollection`, which seven files share, still returns before the run it starts. Making it wait for that run would end such leftovers everywhere, but needs every one of those files run again; left for a later ticket.
- Two other tests make the same kind of spy, whichever call comes first: `judgement-failures.integration.test.ts:154` and `judgement-settings.integration.test.ts:174` (`publishPost` rejected once), and `same-event-links.integration.test.ts:264` (`overLinks` rejected once). A call left over from the test before could use their one rejection, and the check would then fail, not hang. Not changed here.

### Agent usage (2026-11-16)

The A03 session did this ticket alone, without subagents.

- Agent time: about 20 minutes, an estimate from the transcript's timestamps; most of the rest was waiting for the shared test lock.
- Tokens: output 45,823; input 22,394,412, of which 21,697,767 were cache reads, 696,579 cache writes, and 66 uncached. Without cache reads: 742,468.
