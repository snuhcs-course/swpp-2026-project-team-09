# The UAT (cycle 2) on swpp-a

The branch `uat/Main` is the Release `snunow/all/26.11.22-12` with seven accounts picked from a list on the sign-in
screen, and commands that prepare and reset the User Acceptance Test. It is never merged. Server A (swpp-a,
`http://swpp26t09.147-46-242-169.sslip.io`) follows it, and the UAT APK talks to that server only. Production, its
Releases and the Dev Server are not touched: no tag is pushed, and the APK's workflow
(`.github/workflows/uat-apk.yml`) exists only on this branch.

## Accounts

| Letter | Name   | Department   | Friend ID  | Who holds the phone        |
| ------ | ------ | ------------ | ---------- | -------------------------- |
| A1     | 김서연 | 컴퓨터공학부 | `UATA2345` | Tester 1                   |
| A2     | 정하윤 | 화학부       | `UATA3456` | Tester 2                   |
| A3     | 최민준 | 기계공학부   | `UATA4567` | Tester 3                   |
| B      | 이도현 | 경영학과     | `UATB2345` | Helper 1                   |
| C      | 박지호 | 심리학과     | `UATC2345` | Nobody: it only holds data |
| D      | 한지우 | 국어국문학과 | `UATD2345` | Helper 2                   |
| E      | 윤서아 | 통계학과     | `UATE2345` | Nobody: it only holds data |

In the sheet's prompts, `{B 이름}` is 이도현, `{C 이름}` 박지호 and `{D 이름}` 한지우.

## Putting server A on the branch (once)

From a laptop on the university's network:

```bash
ssh swpp-a
sudo git -C /srv/team/snu-now fetch origin uat/Main
sudo git -C /srv/team/snu-now reset --hard FETCH_HEAD     # the checkout, and with it deploy.sh, now follow uat/Main
grep -n '^HE_ACCOUNTS' /srv/team/snu-now-secrets/snu-now.env   # must read HE_ACCOUNTS=on
grep -c '^OPENROUTER_API_KEY=.\+' /srv/team/snu-now-secrets/snu-now.env   # 1: the Assistant has a key
sudo bash /srv/team/snu-now/infra/deploy/bootstrap.sh     # installs the changed unit file; never rewrites the settings
sudo systemctl start snu-now-redeploy
journalctl -u snu-now-deploy -f                            # until the run says it deployed
curl -s http://swpp26t09.147-46-242-169.sslip.io/deploy-status
```

The deploy run takes the tip of `uat/Main` once its CI checks (`main-server`, `socket-server`, `worker-server`,
`flow-tests`) have passed; the branch's name ends in `/Main`, so CI runs them at the full level. The main server
migrates the database forward when it starts. Whatever the database held is replaced by `setup` below.

To go back: `sudo git -C /srv/team/snu-now fetch origin 3.0/P15-he && sudo git -C /srv/team/snu-now reset --hard
FETCH_HEAD`, then the bootstrap and a redeploy as above.

## The commands

On the server:

```bash
sudo /srv/team/snu-now/infra/deploy/uat.sh setup       # the whole session as its first step needs it
sudo /srv/team/snu-now/infra/deploy/uat.sh status      # where every account stands
sudo /srv/team/snu-now/infra/deploy/uat.sh reset a1    # one tester back to the start (a1, a2 or a3)
sudo /srv/team/snu-now/infra/deploy/uat.sh s2-cancel   # cancels "[UAT] Event" (S2, before UAT-1 step 9)
```

- **`setup`** empties what Users made, removes every User but the seven, cancels the other events of today and
  tomorrow, and writes the sheet's data at times counted from the run: today is D0 and tomorrow D1. The phones stay
  signed in. Run it right before the session, and again after a rehearsal. It prints when "[UAT] 짧은 행사" ends and
  when "[UAT] Event" starts (30 and 75 minutes after the run), and whether tomorrow has lunch menus; when it has
  none, the newest day's lunch is copied onto it.
- **`reset a1`** sets one tester back: Friends with C and E only, 위치 공유 off and never turned off (so the question
  of UAT-3 step 9 shows again), the two classes, the request to "[UAT] 공강 신청함", the party of two, no position and
  no Assistant messages today. What that tester made, and what B and D did in it, goes. The other testers and what B
  and D hold elsewhere stay.
- **`s2-cancel`** does what the sheet has D do on the admin site, which cannot sign in over plain HTTP.
- **`status`** changes nothing.

After `setup` or `reset`, start the app again on the phones it names.

## What stays with the helpers' phones

S1 (D activates "[UAT] Open"), ending the activation and the two event parties in S2, B accepting the lunch
invitations, and B adding "[UAT] B 수업" 11:00–14:30 for tomorrow are done on the phones, as the sheet says.

## The APK

Every push to `uat/Main` that changes the app builds it in GitHub Actions (workflow "UAT APK"), as the artifact
`snu-now-uat-apk`. It is a release build signed with the template's debug key, on the update channel `uat`, with the
check for a newer native build left out.

```bash
gh run list --workflow "UAT APK" --branch uat/Main --limit 1
gh run download <run id> --name snu-now-uat-apk
scp snu-now-uat-*.apk swpp-a:/srv/team/snu-now-apk/      # then http://swpp26t09.147-46-242-169.sslip.io/apk/ on a phone
```

A phone that has the Production app must remove it first when its signature differs.

## Afterwards

Delete the branch `uat/Main`; the workflow goes with it. Server A can stay as it is or go back to `3.0/P15-he`.
