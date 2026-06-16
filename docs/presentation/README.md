# Claude Code SKILLS Presentation

A comprehensive 18-slide presentation covering SKILLS, SDET use cases, agentic workflows, CI/CD integration, and optimizations. Designed for a 15–20 minute session with mixed (technical + management) audiences.

---

## Files

### 1. `skills-presentation.md` (Marp Format)

**Use this if you:**
- Want to edit slides easily (pure Markdown)
- Plan to present from VS Code with the Marp extension
- Need to convert to PDF/PPTX via Marp CLI

**How to use:**
- Open in VS Code with [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) extension
- Press `Alt+M` to toggle preview
- Use `Export Slide Deck` to PDF, PPTX, or HTML

**Command line export** (requires Marp CLI):
```bash
npm install -g @marp-team/marp-cli
marp skills-presentation.md --output skills-presentation.pdf
```

### 2. `skills-presentation.html` (Reveal.js Format)

**Use this if you:**
- Want a standalone, ready-to-present file
- Don't have Marp or other tools installed
- Need to present from any browser (Chrome, Edge, Firefox)
- Want speaker notes built-in

**How to use:**
- Open directly in any modern browser (no server required)
- Full-screen: `F` key
- Speaker notes: `S` key (opens speaker view with notes + timers)
- Navigate: Arrow keys or click
- Exit: `Esc` key

**Browser keyboard shortcuts:**
- `?` — show all keyboard shortcuts
- `N` — next slide
- `P` — previous slide
- `B` — black screen (use for breaks)
- `Esc` — slide overview

---

## Presentation Overview

### Slides 1–2: Introduction
- Title, agenda, context

### Slides 3–6: SKILLS Concept
- Definition: reusable AI workflow modules
- Anatomy: frontmatter, steps, tool permissions
- Comparison: SKILLS vs prompts vs scripts vs Cursor rules
- SDET lifecycle: requirements → design → automation → execution → reporting

### Slides 7–10: Project Deep Dive
- 22 active SKILLS across 7 tiers
- 4-layer TAF architecture (Locators → Pages → POM → Specs)
- Auto-chaining pipeline flows
- Business value: BRD → green tests

### Slides 11–12: Agentic SKILLS
- Definition: multi-step, autonomous, self-directing
- 7 agentic SKILLS in this project
  - `taf-full-pipeline`
  - `brd-full-pipeline`
  - `ado-full-pipeline`
  - `execute-and-fix-tests`
  - `ado-tcs-to-plscript`
  - `analyze-trace`
  - `polish-generated-code`

### Slides 13: Portability
- Claude Code SKILLS are Claude Code–native
- What happens if you try to move them to Cursor, LangChain, CrewAI, etc.
- Named examples: how to port specific SKILLS
- Key insight: pattern is portable; runtime is not

### Slides 14–15: CI/CD Integration
- Real pipelines in this project:
  - `pipelines/ai-generation.yml` — Stage 1 runs `/ado-full-pipeline`, Stage 2 runs `/execute-and-fix-tests`
  - `pipelines/execute-fix.yml` — On-demand `/execute-and-fix-tests`
  - `pipelines/azure-pipelines.yml` — Traditional Playwright execution
- Three integration patterns
- Practical setup: Claude CLI, secrets, non-interactive mode
- Important: `--dangerously-skip-permissions` is safe in CI because pipelines run in ephemeral VMs

### Slides 16–17: Optimization & Roadmap
- Current gaps: `pipeline-guard` stub, `token-cost-tracker` stub, sequential chaining
- Performance ideas: snapshot-based healing, parallel skill execution
- Roadmap: ADO dashboard, multi-env variants, API contract testing, SKILL versioning

### Slides 18–19: Summary & Thank You

---

## Presenter Notes

Each slide in the HTML version has speaker notes (press `S` in full-screen mode to view). Marp format also includes `<aside class="notes">` tags for speaker context.

Key talking points:
- Emphasize elimination of manual task repetition
- Show real, production pipelines (in `pipelines/` folder)
- Highlight agentic behavior (autonomous, self-healing)
- Address portability question early
- Close with optimizations and roadmap to show ongoing commitment

---

## Customization

### For Marp (skills-presentation.md)

**Change theme:**
```markdown
---
marp: true
theme: default  # or uncover, gaia, dracula
---
```

**Change background:**
```markdown
backgroundColor: #fff
color: #000
```

### For Reveal.js (skills-presentation.html)

**Change theme:** Edit the `<link>` tag:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/moon.css">
<!-- Options: black, white, moon, night, serif, simple, sky, blood, league -->
```

**Change transition:** Edit the `Reveal.initialize` call:
```javascript
transition: 'fade',  // or slide, convex, concave, zoom
```

---

## Audience Recommendations

### For Technical Audience (Developers/SDETs)
- Focus on slides 7–12 (project deep dive, agentic SKILLS)
- Dive into CI/CD patterns (slides 14–15)
- Discuss optimizations (slide 16)

### For Mixed Audience
- Keep all slides
- Spend more time on slides 6, 10 (business value)
- Briefly explain portability (slide 13)

### For Management/Stakeholders
- Focus on slides 6, 10 (business value)
- Highlight automation benefits (slide 10)
- Show real pipelines (slide 14)
- Outline roadmap (slide 17)

---

## Presentation Tips

1. **Time Management:** Each slide has an estimated duration in the plan (total ~18 min)
2. **Live Demo:** If time allows, show a live `/brd-full-pipeline` run or `/execute-and-fix-tests` in action
3. **Questions:** Leave time at the end (slides 18–19) for Q&A
4. **Speaker Notes:** Use the notes (press `S` in Reveal.js) to remind yourself of key points
5. **Interactive:** Encourage questions after slides 13 (portability) and 15 (CI/CD)

---

## Files Generated From This Presentation

Both files were generated from the same content outline (see `C:\Users\Mohamed.Solaiman\.claude\plans\generate-a-presentation-to-sorted-clock.md`).

**Content Differences:** None — both files contain identical slide content, just in different formats.

**Format Differences:**
| Aspect | Marp | Reveal.js |
|---|---|---|
| **File Format** | Markdown | HTML |
| **Editing** | Easy (text editor) | Requires HTML knowledge |
| **Viewing** | VS Code extension or CLI export | Any browser |
| **Export** | PDF, PPTX, PNG (via CLI) | Built-in print-to-PDF |
| **Speaker Notes** | `<aside>` tags | Press `S` for speaker view |
| **Standalone** | Requires export | Fully standalone |

---

## Additional Resources

- **CLAUDE.md** — Project instructions and conventions
- **`pipelines/`** — Real CI/CD pipeline examples
- **`.claude/skills/`** — All 22 skill implementations
- **`docs/`** — Full project documentation

---

## Contact & Feedback

For questions about this presentation or SKILLS in general, reach out to your team's Claude Code channel.
