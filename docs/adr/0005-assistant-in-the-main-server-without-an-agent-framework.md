# The Assistant runs in the main server on a thin model library, not on LangChain or LangGraph

The Assistant (P07, Iteration 2) is a module of the main server. It calls the model through OpenRouter with the Vercel AI SDK, which runs the loop of model call, tool call and answer and nothing more. Each tool is a zod schema of its input and a plain function that calls the main server's services, and only one thin adapter registers the tools with the SDK.

We chose this over LangChain or LangGraph, in a Python service or in the main server, because the Assistant's design leaves their distinctive features unused. A Quest the Assistant proposes is made by the app, after the User confirms it, along the path the party form already takes, so the server never pauses a run to wait for a person and needs no checkpointer. Conversations live on the phone and are not stored. Search narrows by fixed conditions and lets the model rank what is left, with no embeddings or vector store. One agent with about eight tools needs no orchestration of several. What makes the answers accurate is the tools themselves: resolvers that return candidates instead of letting the model invent ids, lookups that return only data matching the request or say there is none, and Proposals checked against the same rules as the app. A framework would send the same tool schemas to the same model. A Python service would also have had to forward each User's authentication to the main server and keep a second copy of every input shape.

## Considered Options

- **Python with LangGraph, as a new service.** It has the richest ecosystem, but it adds a language, a service, authentication forwarding and duplicated schemas, for features the design does not use.
- **LangGraph.js or LangChain.js in the main server.** It adds concepts the team would have to learn (state graphs, reducers, checkpointers) and layers between the code and what the model actually receives, which is what debugging accuracy needs to see.
- **The provider's SDK with a hand-written loop.** It is as small, but switching models (OpenRouter) is simpler with the AI SDK.

## Consequences

- Tracing is weaker than LangSmith's: it is logs, or the AI SDK's OpenTelemetry support.
- Tools do not depend on the SDK, so a later feature can use them under LangGraph, and moving the Assistant would replace only the loop. Signs that it is time: the server must carry out an action after approval, a conversation must be stored and resumed days later, a flow has fixed steps with branches, or several agents with different roles must work together.
- Later AI features (managing a Quest, AI matching, scheduling a Closed Quest between Friends) share the model's configuration but each has its own entry point, system prompt and set of tools. No single agent holds every tool, so that a model picks from fewer tools and one feature cannot reach another's data. [ADR 0009](0009-new-capabilities-join-the-chat-as-tools-and-prompt-fragments.md) amends this: a capability of the chat joins it as tools and a prompt fragment.
- Scheduling between Friends is planned as each side's conditions parsed into structured availability, overlapping times computed by the server and only candidate times shown to both, not as agents negotiating in free text, which would leak what each side wrote.
