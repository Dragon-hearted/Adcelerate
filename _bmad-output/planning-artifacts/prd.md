---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: 'complete'
completedAt: '2026-03-24'
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-Adcelerate-2026-03-23.md'
  - '_bmad-output/project-context.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture.md'
  - 'docs/source-tree-analysis.md'
  - 'docs/development-guide.md'
  - 'docs/integration-architecture.md'
  - 'docs/component-inventory.md'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 7
  projectContext: 1
classification:
  projectType: 'developer_tool'
  domain: 'general_ai_automation'
  complexity: 'medium'
  projectContext: 'brownfield'
workflowType: 'prd'
---

# Product Requirements Document — Adcelerate

**Author:** Dragonhearted
**Date:** 2026-03-24

## Executive Summary

Adcelerate is a personal AI engineering operating system that transforms a solo engineer's accumulated domain expertise into a compounding, closed-loop platform. Built as a v0 → v1 upgrade of an existing monorepo (skills library, observability dashboard, Claude Code hooks, two applications), the v1 milestone converts a collection of independent tools into a unified orchestration system with three modes: **Build** (collaborative knowledge capture → autonomous system construction), **Execute** (task routing → self-validated output delivery), and **Knowledge Persistence** (domain expertise, quality criteria, and acceptance standards retained permanently across sessions).

The platform serves a single user — a solo agentic engineer running a freelance agency — who operates as builder, operator, and client-facing freelancer simultaneously. The core problem: domain knowledge evaporates between AI agent sessions, forcing the engineer into open-loop workflows where every build cycle requires re-communicating standards, re-prompting through errors, and manually operating built tools. Adcelerate closes this loop by formalizing *how to know output is good enough* during build time, then enforcing those criteria autonomously at execution time.

Adcelerate is designed as a **living platform** — as new tools and capabilities emerge (computer control, new AI models, new APIs, new interaction paradigms), they can be introduced and automatically integrated into the existing system. Each new capability enriches the knowledge graph, extends what existing systems can do, and compounds the platform's power. The architecture absorbs evolution rather than resisting it.

### What Makes This Special

The primary asset is a **compounding knowledge graph** — a self-referential network of interconnected domain models, each carrying performance history, quality criteria, and cross-references. This is a **meta-system that builds systems** through a standardized Build Mode blueprint, encoding the engineer's specific expertise and self-validating against captured acceptance criteria. The platform is **tool-agnostic and evolution-ready** — new capabilities slot into the existing orchestration layer automatically.

Critical design principle: **the engineer is always the CEO**. Adcelerate proposes, reports, diagnoses, and flags — but never acts autonomously on decisions. Human-in-the-loop at decision points, closed-loop at execution.

## Project Classification

| Dimension | Value |
|-----------|-------|
| **Project Type** | Developer Tool / Personal Platform |
| **Domain** | General — AI/Automation focus |
| **Complexity** | Medium (technical depth, no regulatory constraints) |
| **Project Context** | Brownfield — v0 operational, upgrading to v1 |

## Success Criteria

### User Success

- **Two-Judge Standard:** Every deliverable passes two gates — (1) engineer judgment ("I would put my name on this") and (2) client satisfaction (first-submission approval without revisions)
- **Zero manual tool operation:** Tasks assigned to Adcelerate execute through the appropriate system and return output without the engineer manually operating tools
- **Build-to-Execute continuity:** Build Mode sessions produce working systems that enter Execute Mode without post-build fixes or manual wiring

### Business Success

- **3-Month Milestone:** Core systems operational (storyboard generation as first system), 2-3 systems built through Adcelerate's own Build Mode process, quality bar established — outputs consistently pass engineer's expert judgment
- **12-Month Milestone:** Complete agency tooling suite, full orchestrator mode (engineer assigns → system delivers client-ready output), template architecture proven and ready to replicate to new domains, bottleneck is client acquisition not delivery capacity

### Technical Success

- **Closed-loop rate:** >80% of Execute Mode tasks complete without open-loop re-prompting
- **Output quality:** >90% of Execute Mode outputs pass engineer approval without rework
- **System stability:** Zero silent failures — all issues diagnosed and reported, no breakage between uses
- **Build success rate:** Improving with each build as knowledge graph grows

### Measurable Outcomes

| KPI | Measurement | Target |
|-----|-------------|--------|
| Systems built | Count of operational systems in Adcelerate | 2-3 by 3 months, 10+ by 12 months |
| Quality — self | Engineer approves output without rework | >90% of Execute Mode outputs |
| Quality — client | Client approves on first submission | Increasing trend over time |
| Closed-loop rate | Tasks completed without open-loop re-prompting | >80% of Execute Mode tasks |
| System stability | Systems operate without breaking between uses | Zero silent failures |
| Build success rate | Build Mode produces working systems on first deployment | Improving with each build |

## User Journeys

### Journey 1: Builder Mode — "The Storyboard System"

Dragonhearted has been manually creating video storyboards for clients for months — writing scripts, generating image prompts, creating visuals, assembling deliverables. Each project takes hours and the process is identical every time: brief intake, script structure, visual direction, brand alignment, output assembly. The third time a client asks for a rush storyboard, the thought lands: *this should be a system.*

He opens his terminal and initiates Build Mode. Adcelerate begins the knowledge-capture interview — not a form, not a checklist, but a collaborative session. "What makes a good storyboard script? How do you decide on visual style? What does 'on-brand' mean for your clients? When you review a finished storyboard, what specifically makes you say 'this is ready to send'?" The questions dig into tacit knowledge he's never articulated: the pacing rules he follows intuitively, the way he adjusts tone for different industries, the visual composition principles he applies without thinking.

The session takes as long as it needs — an hour, maybe two. Every answer is formalized into quality criteria and acceptance standards. When it's done, Adcelerate builds the system: prompt chains, model selection, output formatting, validation checks — all wired to the captured knowledge. The system enters Execute Mode. It's a permanent teammate now.

**Capabilities revealed:** Knowledge-capture interview protocol, quality criteria formalization, acceptance standard definition, autonomous system construction, system registration into Execute Mode routing.

### Journey 2: Execute Mode — "Tuesday Morning Client Delivery"

It's Tuesday morning. A client brief landed overnight — a 60-second product explainer video needs a storyboard by end of day. Previously this meant four hours of focused work. Now Dragonhearted opens his terminal and assigns the task: "Generate a storyboard for this client brief" with the brief attached.

Adcelerate routes to the storyboard system. The system processes the brief, generates a script, and returns it for review — stage one. He reads through, adjusts the tone for this particular client's voice, approves. Stage two: visual direction and image prompts generated based on the approved script and the client's brand guidelines (captured during Build Mode). He reviews, approves with one small tweak. Stage three: full storyboard assembled — script, visuals, timing, transitions — validated against the acceptance criteria. The system confirms: output passes all quality gates.

He reviews the final deliverable. It's good — he'd put his name on it. He sends it to the client. First-submission approval. The whole process took 30 minutes instead of four hours. He takes on two more client briefs that afternoon.

**Capabilities revealed:** Task routing to correct system, staged output delivery with approval gates, self-validation against acceptance criteria, brand/client context awareness, Two-Judge Standard enforcement.

### Journey 3: Evolution — "Absorbing a New Image Model"

A new image generation model drops — dramatically better at photorealistic product shots than anything Adcelerate currently uses. Dragonhearted sees the announcement and recognizes it would improve three of his existing systems: storyboards, social media visuals, and ad creative.

He directs Adcelerate to absorb the new model. The system analyzes what the model can do, maps it against existing system capabilities, and proposes an integration plan: "This model improves visual output for storyboards (product shots), social media (lifestyle images), and ad creative (hero images). Recommended: swap the image generation step in these three systems from the current model to the new one. Quality criteria remain unchanged — outputs will be validated against the same acceptance standards. Shall I proceed?"

He approves. Adcelerate rewires the three systems, runs validation against existing acceptance criteria to confirm output quality holds, and reports back: all three systems upgraded, all quality gates still passing. The knowledge graph is updated — model performance data, integration patterns, and cross-references between the three affected systems. The next time a new model drops, the integration pattern is already known.

**Capabilities revealed:** New capability detection and mapping, impact analysis across existing systems, integration plan proposal with human approval gate, automated rewiring, validation against existing acceptance criteria, knowledge graph update, pattern learning for future evolutions.

### Journey 4: Troubleshooting — "The Silent Break"

Thursday evening, Dragonhearted tries to run the auto-captioner on a client video. It fails silently — no output, no error. Previously he'd spend an hour digging through logs, testing theories, and patching. Now he asks Adcelerate to diagnose.

Adcelerate inspects the autoCaption system: checks the pipeline end-to-end, identifies that a Whisper.cpp dependency updated and broke the audio extraction step. It reports the diagnosis clearly: "autoCaption failure: Whisper.cpp model format changed in latest update. Audio extraction step receives incompatible output. Proposed fix: pin Whisper.cpp to last working version and add a model compatibility check to the pipeline. Shall I proceed?"

He approves. Adcelerate patches the system, runs the client's video through successfully, and adds the compatibility check as a permanent guard. The knowledge graph records the failure pattern — if similar dependency-break issues occur in other systems, the diagnosis path is faster.

**Capabilities revealed:** End-to-end system diagnosis, root cause identification, fix proposal with human approval gate, automated patching, guard rail addition, failure pattern recording for future diagnosis acceleration.

### Journey Requirements Summary

| Capability Area | Revealed By Journeys |
|----------------|---------------------|
| **Knowledge-capture interview protocol** | Builder |
| **Quality criteria & acceptance standard formalization** | Builder, Execute |
| **Autonomous system construction** | Builder |
| **Task routing to correct system** | Execute |
| **Staged output delivery with approval gates** | Execute |
| **Self-validation against acceptance criteria** | Execute, Evolution |
| **New capability detection & integration** | Evolution |
| **Impact analysis across systems** | Evolution |
| **Human approval gates at decision points** | All journeys |
| **End-to-end system diagnosis** | Troubleshooting |
| **Fix proposal & automated patching** | Troubleshooting |
| **Knowledge graph update & pattern learning** | Builder, Evolution, Troubleshooting |
| **Living platform evolution** | Evolution |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Meta-System Architecture (New Paradigm)**
A system that builds its own systems. Each build permanently expands platform capability, and the builder itself improves through accumulated recipes and patterns. The platform's power grows exponentially with each system added — three systems create 7 capability combinations; ten create 1,023.

**2. Compounding Knowledge Graph as Moat**
A self-referential network of interconnected domain models — each carrying performance history, quality criteria, and cross-references. Individual domain knowledge is copyable; 50+ interconnected models with performance data and cross-system relationships are not.

**3. Closed-Loop Autonomous Execution**
Formalized acceptance criteria captured during Build Mode, enforced during Execute Mode. Moves from "AI assists, human verifies everything" to "AI delivers verified output against captured expert judgment."

**4. Enterprise Patterns at Solo Scale**
Stripe Minions-class orchestration architecture adapted for a one-person operation — no consensus overhead, perfectly tuned to one engineer's workflow and accumulated knowledge.

**5. Living Platform Evolution**
Tool-agnostic architecture that absorbs new capabilities (computer control, new AI models, new APIs) automatically. Existing systems rewire to leverage new tools without manual rebuilding.

### Innovation Validation

The critical innovation risk is the **knowledge-capture interview** — the entire system depends on extracting tacit expertise well enough that agents can self-validate against it.

- **Architecture inspiration:** Draw from proven context-capture systems — BMAD's structured elicitation workflows (already operational with 100+ skills) and GSD's intent-extraction-to-direct-implementation pattern.
- **Progressive proof:** Validate through real builds — Pinboard and autoCaption upgrades prove the blueprint works before building new systems from scratch.
- **Two-Judge Standard as ultimate gate:** If the engineer wouldn't put their name on the output, the knowledge capture was insufficient — iterate on criteria, not just output.

### Innovation Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Knowledge capture too shallow — acceptance criteria miss real expert judgment | BMAD-style structured elicitation with multiple passes, validated against real output |
| Knowledge graph becomes stale as domain expertise evolves | Engineer can update captured knowledge; systems re-validate against updated criteria |
| Over-reliance on formalized criteria misses tacit "feel" | Staged delivery with human approval gates preserves engineer judgment at decision points |

## Developer Tool / Personal Platform — Specific Requirements

### Project-Type Overview

Adcelerate is a CLI-only personal engineering platform. No GUI, no web interface for the orchestration layer itself (existing apps like Pinboard and the observability dashboard retain their own UIs). All interaction with Build Mode, Execute Mode, and Evolution happens through the terminal.

### Technical Architecture Considerations

**Language & Runtime:**
- **Primary:** TypeScript + Node.js (native stack for all built systems)
- **Secondary:** Python (hooks, integration scripts, tooling)
- **Extensible:** Other languages supported when specific system use cases demand it, but TypeScript/Node.js is the default
- **Runtime:** Bun as the primary TypeScript runtime (established in v0)

**Dependency & Project Management:**
- Each system built through Adcelerate lives as an independent sub-project with its own dependencies
- No shared workspace or monorepo dependency linking — isolation by design
- New systems created via Build Mode follow the existing submodule-style pattern
- Build Mode must scaffold independent project structures automatically

**Interface:**
- Pure CLI — no GUI for orchestration
- All Build/Execute/Evolution interactions happen in the terminal
- Engineer communicates with Adcelerate through natural language prompts in CLI

**Knowledge Storage Format:**
- Same markdown-based format as existing documentation
- Different structure from BMAD skills — optimized for agent readability and direct consumption
- Knowledge files must be structured so agents can capture and read through them without specialized skill invocation
- Quality criteria, acceptance standards, and domain knowledge stored in agent-native format

### Migration Strategy

**Pinboard & autoCaption — Migrate As-Is:**
- Both systems migrate into the Adcelerate framework in their current state
- No pre-migration fixes — they enter the framework with existing issues intact
- Once Build Mode is operational, use the new system to diagnose and fix issues in both apps
- This serves dual purpose: (1) fixes the apps, (2) validates the Build Mode blueprint through real usage

**Migration validates the system:** If Adcelerate can successfully diagnose and fix Pinboard and autoCaption through its own Build Mode, the blueprint is proven.

### Implementation Considerations

- Build Mode must generate TypeScript/Node.js project scaffolding by default
- Knowledge capture output format must be distinct from BMAD — lightweight, agent-optimized, no workflow overhead
- CLI interaction patterns should feel natural — prompt-in, result-out — not menu-driven
- System isolation means Build Mode must handle dependency installation, configuration, and testing per-system independently

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform Validation MVP — prove the Build/Execute/Knowledge loop works for a single engineer before expanding capabilities.

**Resource Requirements:** Solo engineer (Dragonhearted) + AI agent ecosystem (Claude Code, existing skills/hooks infrastructure). No additional team members needed.

**Validation Target:** Can Adcelerate fix Pinboard and autoCaption through its own Build Mode, then serve a client through Execute Mode without open-loop re-prompting?

### MVP Feature Set (Phase 1)

**Core MVP Capabilities:**

1. **Build Mode Blueprint** — Standardized process for how any system gets built. Knowledge-capture interview protocol that extracts domain expertise, quality criteria, and acceptance standards.
2. **Execute Mode Routing** — Task assignment → system routes to appropriate tool → delivers output. Staged output delivery with engineer approval gates.
3. **Knowledge Capture and Persistence** — Domain knowledge stored permanently and accessible across sessions. Formalized quality definitions and acceptance criteria per system.
4. **Closed-Loop Execution** — Agents handle errors internally, iterate, test, validate against acceptance criteria. Engineer receives verified output, not intermediate errors.
5. **Existing System Upgrades** — Pinboard and autoCaption diagnosed, fixed, and integrated into the Adcelerate framework as operational teammates.

**Core User Journeys Supported:**
- Journey 1: Builder Mode (full support)
- Journey 2: Execute Mode (full support)
- Journey 4: Troubleshooting (diagnosis + fix proposal, simplified automation)

**Must-Have Capabilities:**

| Capability | MVP Scope | Rationale |
|-----------|-----------|-----------|
| Knowledge-capture interview protocol | Full | Foundation of entire system — without this, nothing works |
| Quality criteria & acceptance standard formalization | Full | Required for closed-loop execution |
| Autonomous system construction | Full | Build Mode core deliverable |
| Task routing to correct system | Full | Execute Mode core deliverable |
| Staged output delivery with approval gates | Full | Engineer-as-CEO principle |
| Self-validation against acceptance criteria | Full | Closed-loop differentiator |
| Knowledge persistence across sessions | Full | Solves the core problem (knowledge evaporation) |
| End-to-end system diagnosis | Basic | Needed to fix Pinboard/autoCaption |
| Fix proposal with human approval | Basic | Needed to fix Pinboard/autoCaption |
| Agent-optimized knowledge storage format | Full | Distinct from BMAD, lightweight, agent-native |

**Explicitly NOT in MVP:**
- Evolution Mode (manual upgrades for v1)
- New capability auto-integration
- Performance Memory / recipe auto-generation
- Discord command center
- Builder-Companion autonomous builds
- Parallel pipeline execution

**MVP Go/No-Go:** When the engineer is routinely serving clients through Execute Mode with Pinboard and autoCaption, and the blueprint has been validated through real builds — v1 is proven.

### Phase 2 — Self-Evolving System

- Performance Memory tracking success rates per system, per task type
- Recipe auto-generation from successful build patterns
- Proactive system health monitoring and self-diagnosis
- Builder-Companion that builds new systems with minimal engineer involvement
- Journey 3 (Evolution) fully automated — new capabilities detected, mapped, and integrated with approval

### Phase 3 — Full Autonomy

- Discord as mobile command center — assign tasks, approve outputs, review gap reports
- Ant colony autopilot for routine task chains
- Evolution snapshots and rollback capability
- Template replication to new domains and ventures
- Living platform evolution — new capabilities auto-integrate and compound
- The system that builds systems that build systems

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Knowledge capture produces vague/unusable acceptance criteria | Medium | Critical | Progressive proof: validate with Pinboard/autoCaption first. Iterate interview protocol based on real results. Draw from BMAD elicitation and GSD patterns. |
| Task routing misidentifies target system | Low | Medium | Start with 2-3 systems only. Routing logic is simple at small scale. |
| Built systems break existing systems | Medium | High | Independent sub-project isolation. Integration testing against existing acceptance criteria before deployment. |
| Agent-optimized knowledge format doesn't capture enough context | Medium | High | Test format with Pinboard/autoCaption knowledge capture first. Iterate structure before building new systems. |

**Market Risks:**
- Not applicable — single-user platform, no market validation needed. The engineer is both builder and customer.

**Resource Risks:**
- Solo engineer is the only resource. If blocked on one system, switch to another. The sequential nature of v1 (no parallel pipelines) is intentional — reduces complexity at the cost of throughput.
- Absolute minimum: one working system (Pinboard or autoCaption) fully operational through Build → Execute cycle proves the architecture.

## Functional Requirements

### Knowledge Capture & Persistence

- **FR1:** Engineer can initiate a knowledge-capture interview session for any new or existing system
- **FR2:** System can ask structured elicitation questions that extract tacit domain expertise from the engineer
- **FR3:** System can formalize captured knowledge into quality criteria and acceptance standards
- **FR4:** Engineer can review and refine captured quality criteria before they become active
- **FR5:** System can persist domain knowledge, quality criteria, and acceptance standards across sessions in agent-optimized format
- **FR6:** System can load and reference persisted knowledge during Build and Execute operations without specialized skill invocation
- **FR7:** Engineer can update previously captured knowledge when domain expertise evolves

### System Construction (Build Mode)

- **FR8:** Engineer can direct the system to build a new capability from captured knowledge
- **FR9:** System can scaffold an independent TypeScript/Node.js sub-project with its own dependencies
- **FR10:** System can wire prompt chains, model selection, output formatting, and validation checks based on captured knowledge
- **FR11:** System can run tests and validate a newly built system against its acceptance criteria before deployment
- **FR12:** System can register a newly built system into Execute Mode routing upon successful validation
- **FR13:** Engineer can review and approve each stage of the build process before it proceeds

### Task Routing & Execution (Execute Mode)

- **FR14:** Engineer can assign a task via CLI using natural language
- **FR15:** System can identify which registered system handles a given task
- **FR16:** System can route the task to the correct system and initiate execution
- **FR17:** System can execute tasks end-to-end through the target system without manual tool operation
- **FR18:** System can handle errors internally during execution — iterate, retry, and recover without surfacing intermediate failures to the engineer

### Output Delivery & Validation

- **FR19:** System can deliver output in stages (e.g., script → visuals → complete deliverable) with engineer approval gates between stages
- **FR20:** Engineer can review, approve, modify, or reject output at each stage
- **FR21:** System can self-validate final output against the captured acceptance criteria for that system
- **FR22:** System can report validation results to the engineer before final delivery
- **FR23:** Engineer can override validation results and accept or reject output based on expert judgment

### System Diagnosis & Maintenance

- **FR24:** Engineer can direct the system to diagnose a failing or underperforming system
- **FR25:** System can inspect a system's pipeline end-to-end and identify root causes of failure
- **FR26:** System can propose a fix with clear explanation of the diagnosis and proposed changes
- **FR27:** Engineer can approve or reject proposed fixes before they are applied
- **FR28:** System can apply approved fixes and verify the system operates correctly after patching
- **FR29:** System can add guard rails or compatibility checks to prevent recurrence of diagnosed issues

### Knowledge Graph & Compounding

- **FR30:** System can maintain cross-references between systems, their knowledge, and their dependencies
- **FR31:** System can record failure patterns and diagnosis paths for future reference
- **FR32:** System can leverage accumulated knowledge from previous builds to inform new builds
- **FR33:** System can track which systems are affected when shared dependencies or models change
- **FR34:** Engineer can query the knowledge graph to understand system relationships and capabilities

### Platform Management

- **FR35:** Engineer can view all registered systems and their operational status
- **FR36:** Engineer can invoke any registered system through a unified CLI interface
- **FR37:** System can report system health — operational, degraded, or broken — for each registered system
- **FR38:** Engineer can migrate existing applications (Pinboard, autoCaption) into the framework without pre-migration modifications
- **FR39:** System can manage independent sub-project dependencies, configuration, and testing per-system

## Non-Functional Requirements

### Reliability & Stability

- **NFR1:** Registered systems must not fail silently — all failures produce a diagnosable error state visible to the engineer
- **NFR2:** System state (knowledge graph, registered systems, acceptance criteria) must survive session restarts without data loss
- **NFR3:** Build Mode must not modify or break existing registered systems when constructing new ones (sub-project isolation)
- **NFR4:** Execute Mode must not deliver output that has not passed self-validation against acceptance criteria (unless engineer explicitly overrides)
- **NFR5:** Applied fixes must be verified before being marked as complete — no "fix and hope" deployments

### Integration

- **NFR6:** Knowledge storage format must be readable by AI agents without specialized parsers or skill invocation — plain markdown with structured conventions
- **NFR7:** New sub-projects created by Build Mode must follow the existing independent dependency pattern (own package.json, own bun.lock, no shared workspace)
- **NFR8:** System must integrate with Claude Code's existing hook and session infrastructure without requiring modifications to the hook system
- **NFR9:** Built systems must support the existing justfile orchestration pattern for cross-project commands

### Security

- **NFR10:** API keys and credentials must remain in environment variables or .env files — never persisted in knowledge files or committed to version control
- **NFR11:** Knowledge files must not contain sensitive client data — only domain expertise, quality criteria, and process knowledge

### Performance

- **NFR12:** CLI interactions must feel responsive — task assignment and routing decisions within seconds, not minutes
- **NFR13:** Knowledge graph queries (system lookup, cross-reference checks) must complete without perceptible delay at the scale of 10+ registered systems
