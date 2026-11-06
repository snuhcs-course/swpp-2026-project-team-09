# Agent structure for the SNU Now Assistant

Researched 2026-10-26. Question: for a product assistant with campus data behind tools, Korean users, one experienced developer, and a grading need for measurable quality, which agent structure fits best, and how does the current design map onto it?

## Sources opened

Eight pages were opened. The OpenAI guide was read in full as extracted PDF text; the other seven were read through a fetch tool that summarizes the page, so numbers below are as it reported them from the page text.

| Id | Source | Date |
|---|---|---|
| BEA | Anthropic, Building effective agents, https://www.anthropic.com/engineering/building-effective-agents | 2024-12-19 |
| WTA | Anthropic, Writing effective tools for agents, https://www.anthropic.com/engineering/writing-tools-for-agents | 2025-09-11 |
| MAR | Anthropic, How we built our multi-agent research system, https://www.anthropic.com/engineering/multi-agent-research-system | 2025-06-13 |
| OAI | OpenAI, A practical guide to building agents (PDF), https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf | not printed in the PDF |
| SDK | Vercel AI SDK, Loop control, https://ai-sdk.dev/docs/agents/loop-control | version not stated on the page |
| TAU | Yao et al., τ-bench, arXiv 2406.12045v1, https://arxiv.org/html/2406.12045v1 | 2024-06-17 |
| TAU2 | Barres et al., τ²-bench, arXiv 2506.07982v1, https://arxiv.org/html/2506.07982v1 | 2025-06-09 |
| LG | LangChain, LangGraph JS, Workflows and agents, https://docs.langchain.com/oss/javascript/langgraph/workflows-agents | undated |

Not opened (the fetch budget ran out), so nothing below rests on them: Google ADK multi-agent docs, the OpenAI Agents SDK handoffs page, the BFCL v3 multi-turn blog, and Anthropic's tool-use docs. Handoffs are covered here only through OAI's description.

## Terms

- A **workflow** runs LLMs and tools along code paths fixed in advance; an **agent** lets the LLM decide its own steps and tool use (BEA; LG uses the same split).
- BEA's advice is to start from the simplest thing that works and add complexity only when it pays: agentic systems buy task performance with latency and cost, workflows give predictability for well-defined tasks, and one well-built LLM call with retrieval is often enough (BEA).
- OAI does not count an app as an agent unless the LLM controls workflow execution, and it splits orchestration into single-agent and multi-agent systems (OAI p.4, p.13).

## Measured evidence

| Finding | Number | Source |
|---|---|---|
| pass^k = probability that all k i.i.d. trials of a task succeed, averaged over tasks; pass@k = at least one succeeds | definition | TAU |
| gpt-4o, function calling, pass^1 | retail 61.2, airline 35.2 | TAU Table 2 |
| gpt-4o retail pass^8 | below 25% | TAU |
| claude-3-haiku pass^1 (an old Haiku, not comparable to Haiku 5.5) | retail 19.0, airline 14.4 | TAU Table 2 |
| Native function calling beats text ReAct and Act; a "think" tool did not help function-calling agents | qualitative, exact scores only in a figure | TAU |
| gpt-4o retail failures (36 agent failures out of 115 runs): wrong argument or information, wrong decision against domain rules, partial resolution of compound requests | about 55% (the paper's figure is garbled; inferred from the other two), 25%, 19% | TAU |
| Removing the domain policy from the system prompt (gpt-4o) | retail 61.2 → 56.8, airline 33.2 → 10.8 (the paper's text uses 33.2, its table 35.2) | TAU |
| Tool calls with non-existent ids per retail task | gpt-4o 0.46, gpt-3.5-turbo 2.08 (function calling), 6.34 (Act) | TAU |
| Share of agent cost that is input (long system prompt with policy and function definitions) | 95.9% | TAU |
| Evaluation: final database state must equal the annotated goal state, and replies must contain required facts; no LLM judge; at least 3 trials; agent temperature 0 | method | TAU |
| gpt-4.1 pass^1 | retail 74, airline 56, telecom 34 | TAU2 |
| Drop from agent-controls-everything to dual control (the user also acts through tools) | gpt-4.1 about 18 points, o4-mini about 25 points | TAU2 |
| pass^k falls faster with k in the dual-control telecom domain than in airline | qualitative | TAU2 |
| Policy written as a step-by-step workflow | slight improvement in default and no-user modes | TAU2 |
| The evaluated agent in both benchmarks is one function-calling agent with tools | structure | TAU, TAU2 |
| Multi-agent (Opus 4 lead, Sonnet 4 subagents) vs single-agent Opus 4 on an internal research eval | +90.2% | MAR |
| Token use relative to chat | agents about 4x, multi-agent about 15x | MAR |
| Share of BrowseComp performance variance explained by token usage alone | 80% (95% with tool-call count and model) | MAR |
| Concise vs detailed tool response in the Slack example | 72 vs 206 tokens | WTA |

## The six structures

### 1. Single agent, typed tools, server-side validation (current design)

- **When it wins.** OAI recommends maximizing one agent before splitting, because adding tools to one agent keeps evaluation and maintenance simple (OAI p.14, p.16). It is the structure that τ-bench and τ²-bench measure, so its failure modes are the best documented (TAU, TAU2).
- **Failure modes.** Wrong arguments, policy violations, half-done compound requests, invented ids, and run-to-run inconsistency that pass^k exposes (TAU). The documented fix is the tool interface, not more agents: make wrong calls hard (BEA's poka-yoke example of requiring absolute file paths), consolidate tools around tasks, return high-signal fields instead of opaque ids, and return actionable errors (BEA, WTA).
- **Cost and latency.** One model call per step, each carrying the whole system prompt and every tool definition. Input dominates cost (95.9% in TAU), so prompt caching is the main cost lever. Steps run one after another, so latency is the step count times model latency.

### 2. Router plus specialist agents per feature

- **When it wins.** BEA's routing pattern suits inputs that fall into distinct categories better handled separately, including sending easy requests to cheaper models (BEA). OAI says to split agents when a prompt fills with if-then-else branches or when tools overlap; the trigger is overlap more than count, since some systems handle more than 15 distinct tools while others fail with fewer than 10 overlapping ones (OAI p.16).
- **Two forms.** (a) The entry point chooses the specialist: an app screen calls its own feature, so no model call is spent on routing. (b) A triage LLM chooses, either as a manager calling specialists as tools or as decentralized handoffs that transfer the conversation (OAI p.17–23).
- **Failure modes and cost.** Form (b) adds one model call and a new error class, a misroute, that the harness must then score. Form (a) costs nothing extra and shrinks each tool list.

### 3. Orchestrator with sub-agents

- **When it wins.** Breadth-first work that splits into independent parallel parts or overflows one context window, as in research (MAR); BEA's orchestrator-workers pattern is for tasks whose subtasks cannot be predicted (BEA).
- **Measured.** +90.2% on Anthropic's research eval, at about 15x chat tokens (MAR).
- **Failure modes.** Spawning 50 subagents for simple queries, duplicated work from vague delegation, coordination cost that grows with each agent, and the whole system blocking on its slowest subagent. It fits poorly where agents must share context or depend on each other's results (MAR).
- **Fit for us.** Campus requests are short and sequential (resolve a friend, then search, then propose), and every step needs the same context, which is exactly MAR's poor-fit case. The token multiple would also strain the 30 s budget.

### 4. Plan-then-execute with a verifier

- **When it wins.** BEA's evaluator-optimizer pattern pays off when evaluation criteria are clear and a critique measurably improves the next attempt (BEA).
- **Evidence.** τ²-bench's Oracle Plan ablation, where the agent is given the exact tool-call sequence, scores higher, so planning is a real bottleneck. But a plan the model writes itself is not the oracle (TAU2). The closest test of an explicit thinking step inside a function-calling agent, τ-bench's think tool, showed no gain (TAU); that is indirect evidence, not a test of plan-then-execute.
- **Fit for us.** Code that checks a result against the server's rules is a verifier with no added latency and no added variance. LLM judges belong in the offline harness, where MAR found a single 0.0–1.0 judge call with pass/fail closest to human grading (MAR).

### 5. Explicit workflow or state graph (LangGraph style)

- **When it wins.** Flows with fixed steps and branches, and runs that must persist, stream, or be debugged and deployed as graphs (LG). TAU2 finds that writing a policy as a step-by-step workflow helps slightly (TAU2).
- **Failure modes.** OAI argues that declarative graphs get cumbersome as flows grow more dynamic and often need a framework-specific language; that is the opinion of a vendor with a code-first SDK (OAI p.20). BEA warns that frameworks can hide the prompts and that wrong assumptions about what runs underneath are a common source of customer errors (BEA).
- **Fit for us.** Forming a Party pauses for the User's tap, but that tap goes through the app's existing form, not a paused server run, so nothing needs a checkpointer (docs/adr/0005-assistant-in-the-main-server-without-an-agent-framework.md). The AI SDK can express phases inside one loop: `prepareStep` can change `activeTools`, `toolChoice` (for example forcing a tool on step 0), the model, and the messages for each step (SDK).

### 6. Agentic vs workflow

This is a per-step choice, not one per system. Use the agent where the request's wording decides which lookups to run, and use a workflow (plain code) wherever there is a side effect or a rule. OAI's human-intervention triggers agree: irreversible or high-stakes actions wait for a person, and repeated failures hand control back (OAI p.31).

## Cost and latency at a glance

| Structure | Model calls per message | Note |
|---|---|---|
| 1 Single loop | 1 per step (cap 8) | input-heavy, so caching pays (TAU) |
| 2a Route by entry point | same as 1 | smaller tool lists |
| 2b LLM router or handoff | +1 | a misroute is a new failure class |
| 3 Orchestrator | several agents | about 15x chat tokens (MAR) |
| 4 Planner plus LLM verifier | +1 to 2 | a code verifier adds none |
| 5 State graph | whatever the graph calls | adds framework concepts, not tokens |

## Judgement

The best fit is structure 1 inside structure 2a: one single-agent tool loop per feature entry point, typed and consolidated tools, deterministic server-side verification, and every side effect behind the User's tap. It is the structure that τ-bench and τ²-bench measure, so the course can grade it with the same instruments (action classes, argument accuracy, end-state checks, pass^k). Both OpenAI and Anthropic recommend it as the starting point. The documented failure modes of this structure (wrong arguments, invented ids, rule violations) are fixed in the tools, which is where the design already puts its effort. Multi-agent orchestration pays only for parallel, context-heavy research at about 15x tokens, which the campus workload is not. An LLM router, a planner, and a graph framework each add a call or a concept without addressing a failure the harness shows today; ADR 0005 already names the signals that would justify a graph. The one recommended practice the design lacks is measuring with a stronger model first: OAI advises building the baseline with the most capable model and then checking where a smaller one falls short, so one harness run on a larger model would show how much of the remaining error is Haiku's.

### How the current design maps

| Recommended element | Current design | Gap or planned step |
|---|---|---|
| One tool loop per entry point | `runFeature(model, feature, …)` in `main-server/src/assistant/adapter.ts`, `stopWhen: stepCountIs(maxSteps)`, 8 steps, 30 s; `Feature` in `feature.ts` is an entry point with its own prompt and tools | Only one feature so far; later features become new `Feature`s (ADR 0005) |
| Hard-to-misuse tools (poka-yoke) | Resolvers return none, one, or several and never guess | Structured time inputs (planned) answer TAU's largest failure class, wrong arguments |
| Ids must come from tools | Presenters reject ids not seen in a tool result this turn (`found-ids.ts`) | Targets TAU's invented-id failures directly |
| Code verifier | `proposeQuest` is checked against the server's rules | none |
| Person approves side effects | Nothing is created until the User taps | none |
| Per-step phases | not used | `prepareStep` with `activeTools` or `toolChoice` if a flow needs phases (SDK) |
| Context management | The phone sends the last 20 messages | Summary of the previous turn's tool calls (planned); `prepareStep` can also prune messages (SDK) |
| Cost | no caching | Prompt caching (planned); input is 95.9% of agent cost in TAU |
| Measurement | about 60 cases scored by action class, tool and argument accuracy, and pass^3 | Add a held-out split and log runtime, tool-call count, tokens, and tool errors per case (WTA); the `onStepEnd` observer already reports tokens and tool errors. Add compound-request cases (19% of TAU failures). Run one baseline with a stronger model (OAI p.8) |

## Unverified or caveats

- The OAI PDF prints no date. Its commonly cited date, April 2025, is unverified.
- The SDK page now names the step condition `isStepCount` and shows `ToolLoopAgent` stopping at 20 steps by default; the repo pins `ai@^7.0.137` and imports `stepCountIs`. Which names the installed version exports was not checked (no `node_modules` in this checkout). The page does not say whether `prepareStep` can change the system prompt.
- τ-bench's exact ReAct and Act scores and its pass^k values for each k appear only in figures, which were not read. The ~55% wrong-argument share is inferred. The two airline baselines in the paper (35.2 vs 33.2) disagree.
- τ²-bench telecom figures for models other than gpt-4.1 were not cross-checked against the paper's table, so they are left out.
- Whether OpenRouter passes Anthropic prompt-cache controls through for `anthropic/claude-haiku-5.5` is unverified.
- Google ADK patterns, OpenAI Agents SDK handoff details, and BFCL v3 multi-turn results are unverified (pages not opened).
