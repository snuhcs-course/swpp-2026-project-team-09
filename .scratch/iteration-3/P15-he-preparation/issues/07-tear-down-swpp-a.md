# 07: Tear down swpp-a after the HE

Parent: [P15 spec](../spec.md) ("Deploying to swpp-a": Teardown)
Status: ready-for-agent
Blocked by: 06, and the PM's word after the HE

## What to build

After the evaluation, swpp-a returns to empty, so that no keys and no evaluators' answers stay on a course server.

## Steps that wait for the PM's word

1. **Teardown:** the whole teardown starts only after the PM says so in the chat, after the HE.

## Acceptance criteria

- [ ] **Timers:** the deploy and demo refresh timers are stopped and disabled, so nothing restarts the stack.
- [ ] **Removal:** the containers and the database volume are removed, and so is the environment file with the keys.
- [ ] **Empty again:** server A's host answers 503 again.
- [ ] **Untouched:** swpp-b, the Dev Server and Production are untouched, and the HE branch stays as it is.
- [ ] **Record:** the ticket's Comments record what was removed.
