# 08: The rest of the first setup, and the checks by hand

Parent: [A01 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02, 03, 04, 05, 06, 07, 09, all merged into the iteration branch

Starts after tickets 01 to 07 and 09 are merged. Outside the scope of agent implementation; an agent may drive the terminal steps with a team member present. Production must answer before the user-testing submission on 11/13.

Ticket 03 already checked the quotas, applied tickets 01 to 03 in account A, and ran the database Job.

## What to do

Follow the runbook's first setup:

1. Apply again with tickets 04 to 06 merged, so that the certificate is issued.
2. Set the repository variables from `terraform output`, and put the parameters under `/snunow/production/` that the database Job's steps did not, with `aws ssm put-parameter --type SecureString` and Production's own generated values.
3. Add `https://admin.snunow.com` to the admin Google client's authorized JavaScript origins and to the Kakao JavaScript key's site domains, leave the Kakao REST key without an allowed-IP list, and publish the Google OAuth consent screen.
4. Tag a reviewed commit of the iteration branch as the first Release, `snunow/all/YY.MM.DD-N`, and follow its run in the Actions tab.
5. Apply with the records variable on, so that `api` and `admin` point at the ALB.
6. Run each Source's collection once by hand in the worker pod.
7. Build the Production APK, tag its commit `snunow/app/YY.MM.DD-N`, and attach the APK to that tag's GitHub release page.

Then make the checks below.

## Acceptance criteria

- [ ] The first Release, `snunow/all/...`, passed every step in each server's job, and its OIDC token matched the deploy role's `sub` form, which only a real token confirms.
- [ ] `api.snunow.com` and `admin.snunow.com` resolve to the ALB and serve a valid certificate.
- [ ] From a phone off the campus network: `https://api.snunow.com/health/ready` answers; the app signs in; a walking route and an Assistant answer work; a WebSocket stays open for more than three minutes.
- [ ] From a laptop outside AWS: `https://api.snunow.com/admin/administrators` and `/ADMIN/administrators` answer 404; `admin.snunow.com` signs an Administrator in and publishes a Global Event.
- [ ] Every Source's collection, run once by hand, succeeds from AWS's addresses.
- [ ] Each team member reaches the cluster with kubectl and with Freelens or Lens.
- [ ] A Release of one server, for example `snunow/main-server/...`, made while a script sends requests without pause, causes no failed request while its pods change, and leaves the other servers' pods as they were.
- [ ] A Release whose commit's CI fails does not deploy, for example a tag on a throwaway commit with a failing test, deleted afterwards. A tag with a malformed name, for example `snunow/main-server/26.11.32-1`, fails at the name check, before any AWS step.
- [ ] The app tag's GitHub release page carries the APK, named after the tag (for example `snunow-app-26.11.13-1.apk`), and the app tag started no Release run.
- [ ] After the first week, `kubectl top` is recorded under `## Comments`, and the memory settings or the node size are raised if memory runs short.
- [ ] The budget's first alert, at $50, reaches all four team members. It comes about 10 days after the first apply, so this item may be ticked last.
- [ ] The time the setup and checks took is recorded under `## Comments`; agent time, if an agent drove steps, goes in an `### Agent usage (YYYY-MM-DD)` section.
