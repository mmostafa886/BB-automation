---
marp: true
theme: gaia
paginate: true
backgroundColor: #1a1a2e
color: #eee
---

<!-- _class: lead -->

# Claude Code SKILLS
## Automating QA at Scale

A 15-20 minute overview for SDETs, developers, and stakeholders

---

## Agenda

1. What are Claude Code SKILLS?
2. SDET Use Cases — The QA Lifecycle
3. How SKILLS Work in This Project
4. Agentic SKILLS — Multi-Step Automation
5. Portability — Can We Use SKILLS Elsewhere?
6. CI/CD Pipelines — Real-World Integration
7. Optimization & Roadmap

---

<!-- _class: lead -->

## Part 1: What Are Claude Code SKILLS?

---

## Slide 3: What Are Claude Code SKILLS?

**SKILLS** are reusable, named AI workflow modules stored as Markdown files in `.claude/skills/`

Invoked with `/skill-name` in Claude Code chat

Each skill encodes:
- Expert instructions (multi-step workflow)
- Tool permissions (Bash, Edit, Write, Grep, APIs)
- Auto-chaining logic (one skill triggers the next)
- External integrations (Jira, Playwright MCP)

Think of them as **plugins or macros for intelligent test automation**

---

## Slide 4: Anatomy of a SKILL File

```
---
name: tcs-to-plscript
description: Manual Test Cases → Playwright TypeScript specs
type: content generator + TAF builder
tools: [Bash, Write, Edit, Read, Grep]
---

# Step 1: Parse test case markdown
Read the TC file, extract test case scenarios...

# Step 2: Generate locators
For each page mentioned, create src/locators/<page>-locators.ts

# Step 3: Generate page objects
Create src/pages/<page>-page-self-healing.ts with 
action and assertion methods...

# Auto-chains into:
/polish-generated-code
```

---

## Slide 5: SKILLS vs. Prompts vs. Scripts vs. Cursor Rules

| Aspect | SKILLS | Plain Prompt | Shell Script | Cursor Rules |
|---|---|---|---|---|
| **Where** | `.claude/skills/` | Chat input | filesystem | `.cursor/rules/` |
| **Execution** | Claude Code agent (agentic) | One-shot LLM response | OS shell | Cursor Agent (manual steps) |
| **Tool access** | Full (Bash, Edit, Write, APIs) | No tool calls | OS tools only | Limited (no auto-chaining) |
| **Auto-chaining** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Reproducible** | ✅ Yes | ❌ May vary | ✅ Yes | ⚠️ Partial |
| **Complexity** | Multi-step workflows | Single step | Fixed steps | Context-aware only |

---

<!-- _class: lead -->

## Part 2: SDETs & SKILLS

---

## Slide 6: SDET QA Lifecycle — Mapped to SKILLS

```
Requirements         Test Design           Test Automation
/brd-to-uss         /uss-to-tcs           /tcs-to-plscript
                    /jira-uss-to-tcs       /jira-tcs-to-plscript
                    /merge-tc-sets        /taf-full-pipeline

                    Execution             Reporting
                    /execute-and-fix-tests /tcs-to-jira
                    /analyze-trace        /jira-full-pipeline

                    Maintenance
                    /rename-and-merge-module
                    /move-specs-to-module
```

**Value to SDETs:** Eliminate manual, repetitive tasks → focus on strategy

---

<!-- _class: lead -->

## Part 3: SKILLS in This Project

---

## Slide 7: Overview — 22 Active SKILLS Across 7 Tiers

| Tier | Purpose | Example Skills | Count |
|---|---|---|---|
| **Orchestration** | Full pipelines | taf-full-pipeline, brd-full-pipeline, jira-full-pipeline | 3 |
| **Content Generation** | BRD→US→TC→Code | brd-to-uss, uss-to-tcs, tcs-to-plscript, jira-uss-to-tcs, jira-tcs-to-plscript | 5 |
| **TAF Builders** | Page objects, locators | scaffold-taf-infrastructure, create-page-locators, create-selfhealing-page | 4 |
| **Polish & Quality** | Code cleanup | polish-generated-code, add-teststep-hooks | 2 |
| **Debugging** | Fix failing tests | execute-and-fix-tests, analyze-trace | 2 |
| **Management** | Test organization | move-specs-to-module, rename-and-merge-module, merge-tc-sets | 3 |
| **Jira Integration** | Push to Jira | tcs-to-jira, register-page-in-pom | 2 |

---

## Slide 8: The 4-Layer TAF Architecture

Every test is built in layers:

```
Layer 1: LOCATORS
└─ src/locators/<page>-page-locators.ts
   Pure selector data (CSS, XPath, ARIA roles)

Layer 2: PAGE OBJECTS
└─ src/pages/<page>-page-self-healing.ts
   Action methods (click, fill, navigateTo, ...)
   Assertion methods (assertVisible, assertHasText, ...)
   Extends SelfHealingPageBase

Layer 3: POM MANAGER
└─ src/pages/pom-lazy-self-healing.ts
   Lazy-initialized singleton for all page objects

Layer 4: TEST SPECS
└─ tests/generated/<Module>/tc-*.spec.ts
   Call pomSelfHealing.<page>.<method>()
   No direct locator usage, no Playwright expect() calls
```

---

## Slide 9: Auto-Chaining Pipeline Flow

```
TAF Migration Pipeline:
scaffold → create-page-locators → create-selfhealing-page
          → register-page-in-pom → migrate-test-to-selfhealing
          → polish-generated-code

Content Generation Pipeline:
brd-to-uss → uss-to-tcs → tcs-to-plscript → polish-generated-code

ADO-Native Pipeline:
brd-to-uss → jira-uss-to-tcs → tcs-to-jira (+ Test Plan)
             jira-tcs-to-plscript → polish-generated-code
```

Each arrow = automatic chaining (no human input between steps)

---

## Slide 10: Business Value — BRD to Green Tests

- **BRD in, green tests out** — no manual TC writing, no manual spec coding
- **Self-healing locators** — 3-phase fallback: primary selector → semantic AI → full browser re-inspection
- **Bidirectional Jira** — generate FROM Jira work items OR push TO Jira with full traceability
- **Zero manual locator hunting** — extracted from specs, organized in repositories
- **Autonomous test repair** — `/execute-and-fix-tests` inspects failures, fixes locators/methods, re-runs

---

<!-- _class: lead -->

## Part 4: Agentic SKILLS

---

## Slide 11: What Makes a SKILL "Agentic"?

**Agentic** = multi-step, autonomous, self-directed

Characteristics:
- Spawns multiple sub-tasks without human approval
- Adapts to environment state (checks for missing files, existing code, API responses)
- Chains tools together (Bash → Edit → Grep → Write → repeat)
- No user input needed between steps
- Repairs its own mistakes (e.g., if file edit fails, try different approach)

**Example:** `/execute-and-fix-tests` runs tests → inspects live app via Playwright MCP → identifies failures → applies targeted fix → re-runs — all without asking

---

## Slide 12: Agentic SKILLS in This Project (7 total)

1. **taf-full-pipeline** — Detects TAF progress, chains 6 downstream skills sequentially
2. **brd-full-pipeline** — PDF parsing → user story codegen → test case generation → Playwright scripts → commit
3. **jira-full-pipeline** — BRD → Jira work items → Test Plan/Suite creation → local artifacts
4. **execute-and-fix-tests** — Autonomous run→inspect→fix→re-run loop with Playwright MCP browser
5. **jira-tcs-to-plscript** — Fetches live Jira test case data → generates full TAF code → registers pages
6. **analyze-trace** — Parse Playwright trace.zip → classify failure → apply targeted patch
7. **polish-generated-code** — 5 distinct code-quality passes (escape fixes, method reordering, locator extraction, method scaffolding, helper validation)

---

<!-- _class: lead -->

## Part 5: Portability — Using SKILLS Elsewhere

---

## Slide 13: Can We Use SKILLS in Other Tools?

**Short answer:** Not directly. SKILLS are Claude Code–native.

**"If I move them to Cursor, would they work the same?"**

No. Here's why and what you'd need to do:

| Tool | Location | Setup Needed | Auto-chain? | Tool Suite | Effort |
|---|---|---|---|---|---|
| **Cursor** | `.cursor/rules/` | Rewrite as plain instructions | ❌ Manual steps | Limited | Medium |
| **LangChain** | Python `Agent` code | Build custom tools | ⚠️ Conditional | Full | High |
| **CrewAI** | `Crew` with agents | Define agent roles + tasks | ✅ Via crew | Full | High |
| **GitHub Copilot** | `.github/copilot-*.md` | Plain context | ❌ Single-turn | None | Low |
| **OpenAI Assistants** | Function definitions | JSON schemas | ⚠️ Via functions | Full | High |

---

## Slide 13b: Named Real-World Examples

If porting SKILLS to other platforms:

**Example 1: `/execute-and-fix-tests` in LangChain**
```python
agent = AgentExecutor(
  agent=Agent(tools=[PlaywrightBrowserTool(), BashTool(), FileEditTool()]),
  llm=ChatOpenAI(model="gpt-4"),
)
```

**Example 2: `/jira-full-pipeline` in CrewAI**
```python
crew = Crew(
  agents=[
    BRDAnalystAgent(),
    UserStoryWriterAgent(),
    TestCaseGeneratorAgent(),
    PlaywrightCoderAgent()
  ],
  tasks=[parse_brd, write_us, generate_tcs, generate_specs]
)
```

**Key insight:** The *pattern* is portable; the *runtime* (Claude Code) is not.

---

<!-- _class: lead -->

## Part 6: CI/CD Pipelines

---

## Slide 14: Real Pipelines in This Project

Located in `pipelines/` folder:

| File | Purpose | Uses SKILLS? |
|---|---|---|
| `azure-pipelines.yml (legacy)` | PR/push trigger → run tests for changed areas → publish reports | ❌ No (uses Node script) |
| `main.yml` | Earlier variant of above | ❌ No |
| `.github/workflows/qa-automation.yml | ✅ YES (both) |
| `execute-fix.yml` | On-demand `/execute-and-fix-tests` with configurable scope | ✅ YES |

**Invocation pattern:**
```bash
printf '/Jira_Full_Pipeline\n%s' "$(cat $BRD_FILE)" \
  | claude --dangerously-skip-permissions --output-format stream-json -p
```

---

## Slide 15: CI/CD Integration Patterns

**Pattern 1: AI Generation Gate** (`.github/workflows/qa-automation.yml Stage 1)
- New BRD committed → `/jira-full-pipeline` runs → generates US, TCs, Playwright scripts → pushes feature branch
- Optional Stage 2: `/execute-and-fix-tests` validates generated scripts

**Pattern 2: On-Demand Test Fix** (`execute-fix.yml`)
- Developer queues pipeline with scope: `@regression`, `Projects`, `All tests`
- Claude inspects live failures → fixes locators/methods → re-runs until green

**Pattern 3: Classic Playwright** (`azure-pipelines.yml (legacy)`)
- PR trigger → run area-filtered tests → publish JUnit + HTML reports

**Important clarification on `--dangerously-skip-permissions`:**
- Flag sounds dangerous but is **safe in CI** because pipelines run in **ephemeral Ubuntu VMs**
- VMs are destroyed after job — no persistent system to damage
- On your local machine, this flag would be genuinely dangerous (removes guardrails)

---

<!-- _class: lead -->

## Part 7: Optimizations & Roadmap

---

## Slide 16: Current Gaps & Solutions

**Gaps:**
- `pipeline-guard` stub → Implement pre-merge validation (new TCs must have matching automation)
- `token-cost-tracker` stub → Log token usage per skill run → emit to Jira or Slack
- Sequential chaining → Parallel execution for skills with no data dependency
- No deduplication → Auto-run `/merge-tc-sets` after every TC generation

**Performance:**
- Snapshot-based healing: cache last-good DOM → Phase 3 AI uses snapshot diff (faster, cheaper)
- `.github/workflows/qa-automation.yml push step commented out → enable + wire PR creation for hands-free BRD→PR

---

## Slide 17: Roadmap Ideas

- **Jira Dashboard** — live pass/fail mapped to work items (not just JUnit XML)
- **Multi-env skills** — test vs. staging ENV switching per skill
- **API Contract Layer** — OpenAPI spec → API test cases → `AdvancedAPIHelper` specs
- **SKILL Versioning** — tag skills with semver; track which version generated which spec
- **Snapshot Registry** — store last-good DOM snapshots per locator → faster Phase 3 healing

---

<!-- _class: lead -->

## Summary & Q&A

**Key Takeaways:**
1. SKILLS = reusable AI workflows that eliminate manual test task repetition
2. This project has 22 active SKILLS across 7 tiers — from BRD to green tests
3. Agentic SKILLS handle autonomous, multi-step workflows (7 total)
4. Patterns portable; runtime (Claude Code) is not
5. Real CI/CD pipelines are running SKILLS today

**Questions?**

---

## Thank You

**Links:**
- CLAUDE.md — Project instructions & conventions
- `pipelines/` — Real CI/CD examples
- `docs/` — Further documentation

**Contact:** Ask in your team's Claude Code channel
