---
status: accepted
---

# New capabilities of the Assistant join the chat as tools and prompt fragments

Amends [ADR 0005](0005-assistant-in-the-main-server-without-an-agent-framework.md), which gave every later AI feature its own entry point, system prompt and set of tools.

A capability a User reaches from the chat's input bar joins the chat Assistant: its tools go into the chat's tool list, and its rules into a prompt fragment appended to the chat's prompt, a constant of its own. The model chooses among all the tools. Its tools live in a module of their own and the chat's tool list only names them, so the fragment and the module change without touching the chat's other tools or the rest of its prompt, which other work changes at the same time. A run keeps what those tools judged in the tools' context, and a common step after the run reads it, so that the presenters stay as they are. The first such capability is 공강 (P04).

A Feature of its own is for what has an entry point of its own, such as a screen that starts it. There is no router and no new Feature for a capability of the chat, because a User has one input bar and does not choose a mode. Two Features behind one bar would need something to choose between them, and a request that spans both, such as a 공강 question followed by a request to recruit, would have to cross between them. Going by the tools alone also keeps one set of limits per message.

## Considered Options

- **A Feature of its own, as ADR 0005 says.** It has no entry point of its own, and the input bar would need a router in front of it.
- **A router in front of the chat.** It is one more model call per message and one more place that can choose wrongly, for a choice the model already makes among tools. It is reconsidered if regressions or worse tool choice remain after the prompt is fixed.
- **The rules written into the chat's prompt.** Everything lands in one string, so parallel work on the prompt collides, and a capability's rules cannot be told apart from the chat's.

## Consequences

- The model chooses among more tools with a longer prompt, so the chat can get worse. Every case of the fixed P19 set runs before and after the change, and no case may newly fail.
- Rules are stated by meaning, with no keyword lists, and the server decides what appears. The model only interprets the request and words the reply.
- The limit per Feature of ADR 0005, that a model picks from fewer tools, no longer holds for the chat. That one feature cannot reach another's data still holds between Features.
- Presenters accept any id a tool found in the message, so a new tool's results reach the existing cards by adding to the found ids.
