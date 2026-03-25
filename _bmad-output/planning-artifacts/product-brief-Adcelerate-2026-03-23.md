---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-23-001.md'
  - '_bmad-output/project-context.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture.md'
  - 'docs/source-tree-analysis.md'
  - 'docs/development-guide.md'
  - 'docs/integration-architecture.md'
  - 'docs/component-inventory.md'
date: 2026-03-23
author: Dragonhearted
---

# Product Brief: Adcelerate

## Executive Summary

Adcelerate is a personal AI engineering operating system — a closed-loop, prompt-to-production platform built by and for a single agentic engineer. Its primary asset is an accumulated knowledge base: a compounding graph of domain expertise, quality standards, and performance history that grows with every system built. Each new capability (storyboard generation, cold email, image creation, video captioning) is constructed through a collaborative knowledge-capture process that extracts the engineer's tacit expertise, formalizes quality criteria, then builds and deploys the system autonomously. The user prompts a task, Adcelerate routes it to the right internal system, executes it end-to-end, self-validates against captured acceptance criteria, and delivers a finished output — no manual intervention, no open-loop feedback cycles. The result is a compounding engineering platform where every build permanently expands what one person can accomplish, and where system #50 builds faster and better than system #1 because the entire knowledge graph informs it.

---

## Core Vision

### Problem Statement

Solo engineers and freelancers working with AI coding agents are trapped in open-loop workflows. The current process — prompt an agent, review output, find errors, re-prompt, test manually, push to GitHub — requires constant human involvement at every step. The root cause is not agent intelligence — it's that domain knowledge evaporates between sessions. Each new session starts fresh, with no persistent memory of the engineer's standards, preferences, quality criteria, or accumulated expertise. Even with advanced agentic tools, the engineer remains the glue holding the loop together. Once a system is built, using it still requires manual operation. And built systems silently degrade over time with no monitoring or self-diagnosis. The result: an engineer who could be operating at 10x capacity spends most of their time babysitting AI agents and re-explaining what they already know.

### Problem Impact

- **Knowledge evaporation:** Domain expertise must be manually re-communicated every session — brand guidelines, storyboard structure, quality standards, client preferences — because no system captures it persistently
- **Time lost in feedback loops:** Every build cycle involves multiple rounds of prompt → error → re-prompt, consuming hours that should be minutes, because agents have no formalized criteria to self-validate against
- **Manual tool operation:** Built systems (storyboard generators, video captioners, email tools) require the engineer to manually invoke and operate them for each use
- **Silent system decay:** Applications break days after deployment with no alerting or diagnosis — problems discovered only when the engineer tries to use them
- **Inability to compound:** Each new project starts from scratch rather than building on accumulated system capabilities and interconnected domain knowledge

### Why Existing Solutions Fall Short

- **Agentic coding tools (GSD, Devin, SWE-Agent):** Still leave the engineer in an open feedback loop — better prompting, but not closed-loop execution. They optimize for general-purpose coding assistance, not for one engineer's operating system with accumulated institutional knowledge. Every task requires human shepherding through errors and iterations.
- **SaaS products (storyboard tools, email platforms, image generators):** Generic and opinionated. They don't encode the engineer's specific domain knowledge, brand language, preferred models, or workflow structure. The engineer often knows more about their domain than these tools offer.
- **Enterprise systems (Stripe's Minions):** Prove the architecture works at scale but are built for large organizations with dedicated infrastructure teams. No equivalent exists for a solo engineer building a personal operating system.
- **CI/CD pipelines:** Handle deployment automation but don't address the upstream problem of autonomous building, testing, and system composition.

### Proposed Solution

Adcelerate operates in three modes:

**Execute Mode** — The engineer assigns a task ("generate a storyboard for this client brief"). Adcelerate routes to the appropriate internal system, runs it end-to-end, self-validates against the quality definitions and acceptance criteria captured during build, and delivers the finished output (e.g., a PDF with scripting, image prompts, and generated visuals). No manual tool operation required.

**Build Mode** — When a new capability is needed, Adcelerate conducts a collaborative knowledge-capture interview — the hardest and most valuable part of the system. It asks about requirements, domain specifics, preferred models, brand guidelines, output formats, and critically: **how to know the output is good enough.** It captures quality definitions and acceptance criteria — not just process knowledge — so the system can self-validate in Execute Mode. It then builds, tests, and deploys the system within Adcelerate's ecosystem. Once built, the system is permanently available in Execute Mode, and its knowledge enriches every future build.

**Evolve Mode** — As new AI models, tools, and integrations emerge (new image models, Discord plugins, better transcription), the engineer directs Adcelerate to absorb and upgrade. When existing systems break or degrade, the system diagnoses the issue, proposes a fix, and awaits engineer approval before acting. The system proposes, the engineer approves, the evolution is executed.

Critical design principle: **The engineer is always the CEO.** Adcelerate proposes, reports, diagnoses, and flags — but never acts autonomously on decisions. Human-in-the-loop at decision points, closed-loop at execution.

### Key Differentiators

- **Compounding knowledge graph as moat:** Individual domain knowledge is copyable. A self-referential network of 50+ interconnected domain models — each with performance history, quality criteria, and cross-references — is not. The system knows what it knows, how well it worked, and how it connects to everything else. This graph is Adcelerate's primary asset.
- **The meta-system:** A system that builds systems. While Stripe built Minions manually, Adcelerate builds its own capabilities — each new build expands the platform's power, and the builder itself improves over time through accumulated recipes and performance memory.
- **Closed-loop execution with built-in QA:** Every system has formalized acceptance criteria captured during Build Mode. Agents self-validate against these criteria before delivering output. "Closed loop" means verified output, not just faster errors.
- **Compounding returns:** Each system built becomes a permanent teammate. Three systems create 7 combinations of capability. Ten create 1,023. Power grows exponentially, not linearly. System #50 builds in hours because the knowledge graph informs every decision.
- **Solo-scale agentic engineering:** Proven enterprise architecture (Stripe Minions pattern) adapted for a one-person operation — no consensus overhead, perfectly tuned to one engineer's workflow and knowledge.
- **Start deep, not wide:** Build fewer, excellent systems rather than many shallow ones. Coral reef architecture — slow, solid growth creates an unbreakable foundation.

---

## Target Users

### Primary User

**Dragonhearted — Solo Agentic Engineer & Agency Owner**

A technically deep engineer with extensive knowledge of agentic AI and generative AI, running a freelance agency that serves clients across video production, marketing, and content creation. Operates as builder, operator, and client-facing freelancer simultaneously.

**Context & Motivation:**
- Runs an agency where client engagements vary widely — video storyboards, cold email campaigns, image generation, and more
- Has deep domain expertise that exceeds what off-the-shelf SaaS tools offer
- Wants to encode personal knowledge and workflow patterns into reusable, autonomous systems
- Goal: operate at 10x capacity by eliminating manual tool operation and open-loop agent feedback cycles

**Three Operating Modes:**

**Builder Mode Persona:**
- Decides intuitively when a task warrants a dedicated system — no formula, no threshold
- Willing to invest significant time in knowledge-capture sessions to ensure complete context transfer
- Treats each build as a permanent expansion of the platform's capability
- Judges build-vs-skill-vs-manual on a case-by-case basis: recurring tasks get full systems, occasional complex tasks get skills, one-offs stay manual

**Operator Mode Persona:**
- Works iteratively and staged, not one-shot — reviews script before visuals, approves characters before rendering
- Provides input as the translator between client needs and system execution
- Judges output quality through domain expertise — "good enough to share with client" is the bar
- When information is missing, sources it from the client, then feeds back to the system

**Freelancer Mode Persona:**
- Clients interact with polished deliverables only — never the system itself
- Client feedback loops are external to Adcelerate — the engineer mediates between client and system
- Speed and quality of deliverables directly impact agency revenue and reputation

**Three Tiers of Capability Response:**
1. **Full System** — for recurring tasks (storyboards, cold email, captioning). Built through Build Mode with complete knowledge capture.
2. **Skill** — for occasional complex tasks (pitch deck generation). Lightweight, leverages existing tools and knowledge without a dedicated system.
3. **Manual/External** — for true one-offs. Not everything needs automation.

### Secondary Users

None. Clients are downstream recipients of deliverables, not system users. No other person interacts with Adcelerate directly.

### User Journey

**Daily Operation Flow:**

1. **Morning check-in:** Open terminal, review task queue (managed by a separate task management system)
2. **Task execution:** Assign tasks to Adcelerate — system routes to appropriate tool, executes, returns output
3. **Staged review:** Review outputs iteratively — script first, then visual direction, then full deliverable. Approve each stage before proceeding.
4. **Client delivery:** Share finalized output with client. Mediate any feedback externally, feed revisions back to Adcelerate if needed.
5. **Build decisions:** When a new recurring need surfaces, initiate Build Mode — collaborative knowledge-capture session of any length needed for complete context.
6. **Evolution:** When new models or tools emerge, direct Adcelerate to absorb and upgrade existing systems.

**"Aha!" Moment:** The first time a client brief arrives, the engineer prompts Adcelerate, and a complete storyboard with script, visuals, and brand-aligned styling comes back ready to share — in minutes instead of hours.

**Long-term Value:** Each build compounds. After 10+ systems, the engineer operates a personal AI agency where the bottleneck is client acquisition, not delivery capacity.

**Template Replication:** The Adcelerate architecture is domain-agnostic. When the engineer starts a new venture or takes on clients in a different vertical (e.g., coding, consulting), the same system is replicated with new domain knowledge — same three modes, new context.

---

## Success Metrics

### User Success Metrics

**Primary Success Signal: Capability Expansion**
- Number of operational systems within Adcelerate — each new system permanently expands what the engineer can deliver
- Ability to take on new client engagements that were previously too time-intensive
- Reduction in manual steps between client brief and deliverable output

**Quality Gate: The Two-Judge Standard**
- **Engineer judgment:** "I would put my name on this output" — the deliverable meets the engineer's own expert standard before it reaches the client
- **Client satisfaction:** First-submission approval rate — how often the client accepts the deliverable without requesting revisions
- Quality is the non-negotiable metric. Speed without quality is failure.

**Operational Success:**
- Tasks execute through existing systems without requiring the engineer to manually operate tools
- Build Mode sessions successfully produce working systems that enter Execute Mode without post-build fixes
- Systems remain stable over time — no silent degradation between uses

### Business Objectives

**3-Month Milestone:**
- Core systems operational (storyboard generation as first system)
- Able to serve more clients with faster turnaround than current manual workflow
- Build Mode proven — at least 2-3 systems built through Adcelerate's own build process
- Quality bar established — outputs consistently pass engineer's expert judgment

**12-Month Milestone:**
- Complete agency tooling suite — all recurring client deliverables have dedicated systems
- Full orchestrator mode — engineer assigns tasks, system delivers client-ready output
- System fully evolved with latest AI models and tools
- Template architecture proven — ready to replicate to new domains or ventures
- The bottleneck is client acquisition, not delivery capacity

### Key Performance Indicators

| KPI | Measurement | Target |
|-----|-------------|--------|
| **Systems built** | Count of operational systems in Adcelerate | 2-3 by 3 months, 10+ by 12 months |
| **Quality — self** | Engineer approves output without rework | >90% of Execute Mode outputs |
| **Quality — client** | Client approves on first submission | Increasing trend over time |
| **Closed-loop rate** | Tasks completed without open-loop re-prompting | >80% of Execute Mode tasks |
| **System stability** | Systems operate without breaking between uses | Zero silent failures (all issues diagnosed and reported) |
| **Build success rate** | Build Mode produces working systems on first deployment | Improving with each build as knowledge graph grows |

**What we are NOT measuring (intentionally):**
- Revenue growth, pricing, or financial metrics — not relevant at this stage
- Time savings as a formal metric — speed is a byproduct of quality systems, not a goal
- Client count — growth is organic, driven by delivery capacity expansion

---

## MVP Scope

### Core Features (v0 → v1 Upgrade)

Adcelerate v0 exists today: a monorepo with skills library (34+ marketing/growth skills), BMAD methodology (100+ workflow skills), observability dashboard, Claude Code hooks, Discord integration, and two built applications (Pinboard, Auto-captioner). The MVP milestone is upgrading v0 into v1 — the version that operates as a true orchestration system.

**1. Build Mode Blueprint**
- Standardized process defining how any system gets built within Adcelerate
- Knowledge-capture interview protocol that extracts domain expertise, quality criteria, and acceptance standards
- Blueprint applies to both new builds and upgrading existing systems (Pinboard, Auto-captioner)

**2. Execute Mode Routing**
- Task assignment → system routes to the appropriate tool → delivers output
- Engineer prompts a task, Adcelerate identifies which system handles it and executes
- Staged output delivery — script first, then visuals, then complete deliverable — with engineer approval gates

**3. Knowledge Capture and Persistence**
- Domain knowledge stored permanently and accessible across sessions
- Accumulated expertise informs every future build and execution
- Formalized quality definitions and acceptance criteria per system

**4. Closed-Loop Execution**
- Agents handle errors internally — iterate, test, validate against acceptance criteria
- Engineer receives verified output, not intermediate errors
- Output meets the Two-Judge Standard (engineer judgment + client satisfaction) before delivery

**5. Existing System Upgrades**
- Pinboard: diagnose underperformance, fix, and integrate into Adcelerate framework
- Auto-captioner: stabilize, fix recurring breakage, integrate into framework
- Both systems become operational teammates accessible through Execute Mode

### Out of Scope for MVP

- **Self-healing / proactive monitoring** — engineer will manually prompt diagnosis and fixes for now
- **Discord as command center** — CLI is the primary interface for v1
- **Evolve Mode as formal system** — upgrades to new models/tools will be manually directed
- **Builder-Companion autonomous builds** — v1 uses the blueprint with engineer collaboration, not fully autonomous building
- **Template replication to other domains** — agency work is the sole focus for v1
- **Performance Memory / Recipe auto-generation** — the self-evolving intelligence layer comes after orchestration is solid
- **Parallel pipeline execution** — sequential task execution is sufficient for v1

### MVP Success Criteria

| Criteria | Validation |
|----------|------------|
| **Blueprint works** | At least 2 systems (Pinboard, Auto-captioner) successfully upgraded through the Build Mode blueprint |
| **Execute Mode works** | Engineer can assign a task and receive client-ready output without manually operating tools |
| **Knowledge persists** | Domain knowledge from Build Mode sessions is available and used in future Execute Mode runs |
| **Closed loop proven** | >80% of Execute Mode tasks complete without open-loop re-prompting |
| **Quality bar met** | Outputs consistently pass engineer's expert judgment — "I would put my name on this" |
| **Systems stable** | Pinboard and Auto-captioner operate without silent breakage |

**Go/No-Go for v2:** When the engineer is routinely serving clients through Execute Mode with Pinboard and Auto-captioner, and the blueprint has been validated through real builds — v1 is proven, proceed to v2.

### Future Vision (v2 and Beyond)

**v2 — Self-Evolving System:**
- Performance Memory tracking success rates per system, per task type
- Recipe auto-generation from successful build patterns
- Proactive system health monitoring and self-diagnosis
- Builder-Companion that can build new systems with minimal engineer involvement

**v3 — Full Autonomy:**
- Discord as command center — assign tasks, approve outputs, review gap reports from mobile
- Ant colony autopilot for routine task chains
- Builder-Companion v2 (built by v1) with improved build quality
- Evolution snapshots and rollback capability

**Long-term:**
- Template replication to new domains and ventures
- Compounding knowledge graph spanning 50+ systems
- Full orchestrator mode — engineer assigns, system delivers directly to client
- The system that builds systems that build systems — recursive self-improvement
