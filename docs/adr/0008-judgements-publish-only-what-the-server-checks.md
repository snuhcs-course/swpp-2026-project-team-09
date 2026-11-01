# A Judgement publishes only the sessions the server's checks pass, and fails closed

From Iteration 3 (P05), a Draft that the collection rules leave unpublished is read by the AI, and a Judgement may publish it without an Administrator. The model does not decide publication: for each session it gives a time and place together with the lines of the post it read them from, and the main server checks them. A session is published only if every check passes: the model says the post announces an event at all, the lines are in the post, the date, weekday and time agree with them, they are not an application period, the start comes before the end, a session lasts at most 24 hours unless it is read as running over a period, and the place matches exactly one Place. Everything else stays a Draft and shows the Administrator the values, the lines and the failed checks. A model error, a timeout or a malformed answer publishes nothing.

We chose this over letting the model's answer stand, as hangsha does, because a wrong time or place sends Users to the wrong place, while a Draft left unpublished only costs an Administrator's look. Hangsha fills its events from the model and shows them even when the call fails, and its parser appears to have stopped running for about three weeks without anyone noticing.

## Consequences

- Judgements run in the main server after a Collection's message is stored and answered, not in the worker, which waits only five seconds for the main server's answer. Nothing collected is published inside that request: publication waits until the same event posted on another Source has been looked for. The same step can later be run over the Drafts already stored.
- One setting turns automatic publication off, so that Judgements found to make mistakes can be stopped at once; it is turned off when a floor of the metrics for wrong publications is missed.
- A Global Event records its Publication Route, and its Judgement for Administrators. Neither reaches the app.
- Before a post is sent to the model, e-mail addresses and phone numbers are masked. If a mask hides a date by mistake, the checks fail and the session stays a Draft.
