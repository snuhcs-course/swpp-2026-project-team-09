# Running the pipeline against Slack

`pipeline.bats` runs the pipeline with stdout in place of Slack. This runs it once with its real Slack output, so that a person sees what `#team9-main-server-error` would get (A02 ticket 06). It needs Docker and the main server's webhook.

**The webhook URL is a secret.** It goes in through `read -rs` and an environment variable only: never on a command line, in a file, in chat or in a screenshot. Fluent Bit's log names Slack's host and port, never the URL's path.

From this folder (`infra/production/terraform/fluent-bit`), in one terminal:

1. Put the pipeline together as the Helm release does, with a log file named like a main-server pod's:

   ```bash
   work=$(mktemp -d)
   mkdir -p "$work/conf" "$work/log/containers"
   cat test/service.conf inputs.conf filters.conf server-filters.conf outputs.conf >"$work/conf/fluent-bit.conf"
   log=$work/log/containers/main-server-0-0_snunow_main-server-0.log
   : >"$log"
   ```

2. Paste the webhook at the prompt, which shows nothing, then press Enter:

   ```bash
   read -rs SLACK_WEBHOOK_MAIN_SERVER && export SLACK_WEBHOOK_MAIN_SERVER
   ```

3. Start Fluent Bit. `--env` with a name and no value passes the variable from the shell:

   ```bash
   docker run --detach --name fluent-bit-slack --env SLACK_WEBHOOK_MAIN_SERVER --volume "$work/conf:/config:ro" --volume "$work/log:/var/log:ro" fluent/fluent-bit:5.1.5 --config /config/fluent-bit.conf
   ```

4. Append one info, one warn and one error line in the main server's JSON shape, and a line that is not JSON:

   ```bash
   append() { printf '%s stdout F %s\n' "$(date -u +%Y-%m-%dT%H:%M:%S.000000000Z)" "$1" >>"$log"; }
   append '{"level":"log","pid":1,"timestamp":1795420800000,"message":"A test info line, by hand","context":"Ticket06"}'
   append '{"level":"warn","pid":1,"timestamp":1795420800000,"message":"A test warning, by hand","context":"Ticket06"}'
   append '{"level":"error","pid":1,"timestamp":1795420800000,"message":"A test error, by hand","context":"Ticket06","stack":"Error: a test error\n    at Ticket06 (by-hand.js:1:1)"}'
   append 'A line that is not JSON, by hand'
   ```

   Within a few seconds the channel gets one post, or two, with a line for the warning and one for the error. The info line and the line that is not JSON are not posted. Each line reads like this, with the time the line was written:

   ```text
   ["timestamp": 1795420800.000000000, {"server"=>"main-server", "level"=>"warn", "context"=>"Ticket06", "message"=>"A test warning, by hand"}]
   ```

   The stack's line breaks show as `\x0a`, and any character outside ASCII as `\x..` bytes.

5. Wait a little over a minute, so that those two lines leave the throttle's window, then append a burst of 30 identical warnings:

   ```bash
   sleep 65
   for i in $(seq 30); do append '{"level":"warn","pid":1,"timestamp":1795420800000,"message":"A burst warning, by hand","context":"Ticket06"}'; done
   ```

   The channel gets 10 of them. Each flush is one post with a line per record, so the 10 most likely come as a single post of 10 lines, not as 10 posts.

6. Check Fluent Bit's log: each post gives `hooks.slack.com:443, HTTP status=200`. A warning that the variable `${SLACK_WEBHOOK_MAIN_SERVER}` is used but not set means it was not exported in step 2.

   ```bash
   docker logs fluent-bit-slack 2>&1 | grep -E 'slack|warn|error'
   ```

7. Remove the container, which holds the webhook in its settings, and forget the variable:

   ```bash
   docker rm --force fluent-bit-slack
   unset SLACK_WEBHOOK_MAIN_SERVER
   rm -r "$work"
   ```
