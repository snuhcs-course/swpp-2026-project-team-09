# 06: The pipeline runs once locally against the real webhook

Parent: [A02 spec](../spec.md)
Status: ready-for-human
Blocked by: 03, 05

Native files: none. Releases: none.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager.

## What to do

On ticket 03's branch, run the pipeline with its real Slack output, as ticket 03's note beside the test describes. Pass the webhook as an environment variable read with `read -rs` (`docker run --env SLACK_WEBHOOK_MAIN_SERVER` with no value on the command line), then append:

- one info, one warn and one error line in the main server's JSON shape;
- a line that is not JSON;
- a burst of 30 identical warnings.

## Done when

- [ ] The warn and error lines are posted to `#team9-main-server-error`; the info line and the line that is not JSON are not.
- [ ] The burst gives 10 posts.
- [ ] The posts' text (Fluent Bit's printed record) is readable enough for the team. If it is not, say why under Comments before ticket 09 applies; formatting beyond what the Slack output prints is out of the spec's scope.
- [ ] A screenshot of the posts, which shows no URL, is under Comments.

## Comments
