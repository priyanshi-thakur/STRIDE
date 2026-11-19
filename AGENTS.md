# STRIDE — AGENTS.md

## Product Vision
STRIDE is a guided engineering and software innovation platform that helps users move from identifying a real problem to researching it, defining it clearly, generating ideas, building a prototype, and evaluating the result. It teaches users how to think, build, test, and improve — not merely generate answers or display static pages.

**Path A — My Project:** Users work on their own projects through structured stages (research → problem redefinition → ideation → prototype → evaluation). Save/resume supported. Each stage has requirements, a rubric, and a pass gate. Users see what is missing and how to improve before proceeding.

**Path B — Explore & Practice:** Users select prepared scenarios and complete guided exercises. Simulations produce deterministic, rule-based results wherever applicable. Users receive feedback, can retry, and can review previous attempts. First scenario teaches software product validation.

**RY — AI Coach:** Stage-specific guidance grounded in the current project, stage, submitted work, rubric, and relevant previous decisions. Conversation context refreshed between stages; persistent project records remain available. English and Hindi supported for interface and coaching responses. Voice input/output desirable if feasible. AI provider replaceable — not hard-coded to one vendor.

**Evidence-based verification:** Users may submit a GitHub repository and/or a deployed website URL. Platform supports URL reachability checks, repo structure/source inspection, controlled tests where possible, actual functionality checks, comparing claims with evidence, and transparent results with evidence, limitations, and failed checks. A reachable URL is not proof features work. Static inspection is not equivalent to executing tests. AI review supplements — never replaces — deterministic checks. Never mark a project as verified solely because its URL opens.

**Accounts and persistence:** Real sign-up, login, logout, protected pages, persistent storage. Dashboard with projects, current stage, saved work, attempts, evaluation history, progress. Data remains after refresh, logout, and subsequent login. Authorization enforced server-side via database access policies. Never expose privileged secrets in frontend code or commit env files with secrets.

## Visual Design Specification

### Brand identity
STRIDE is a project-building, learning, and innovation platform. Its visual identity should feel elegant, welcoming, creative, structured, and modern—not like a generic SaaS dashboard.

### Official colour palette

**Core brand colours**
- Warm ivory background: `#F7F4EC`
- Deep olive: `#414831`
- Muted sage: `#A9B49A`
- Soft stone: `#D8D0BE`
- Dark text: `#343728`

**Section-specific pastel colours**
- My Project / Path A: soft mint `#D3E7E2`
- Explore & Practice / Path B: blush pink `#F8D8E8`
- Progress, scores, and milestones: butter yellow `#F9E3A5`
- RY AI Coach: soft lavender `#DCCFED`

Use pastel colours as section backgrounds, feature cards, progress panels, and subtle highlights. Keep deep olive for primary actions, important navigation elements, and brand accents. Do not use every colour everywhere — each colour must have a consistent meaning across the platform. Use readable text colours, sufficient contrast, and icons or labels alongside colour-coded status indicators.

### Typography
- Major headings: DM Serif Display (serif), with system serif fallback.
- Body text, forms, navigation, dashboards, and controls: DM Sans (sans-serif), with system sans-serif fallback.
- Clear hierarchy between headings, descriptions, labels, and supporting information.
- Fonts load with reliable fallbacks; the app must remain usable if an external font resource is unavailable.

### Homepage experience
- Full-screen, immersive hero experience.
- Compelling headline, concise explanation of STRIDE, primary “Start a Project” CTA, secondary “Explore Scenarios” CTA.
- Hero visuals: lightweight CSS textures and shapes only. No large image assets, no external image dependencies, no distracting animation.
- Distinctive and memorable without sacrificing loading performance or accessibility.

### Application interface
Apply the same design system consistently across:
- Sign-up, login, and onboarding.
- User dashboard and saved progress.
- Path A: My Project.
- Path B: Explore & Practice.
- RY’s coaching interface.
- Stage rubrics, verification results, feedback, and history.

Use pastel cards to visually separate different types of information. Keep functional workspaces uncluttered and easy to navigate. Define consistent spacing, border radii, shadows, buttons, inputs, focus states, and loading, empty, success, and error states.

**Components:** Prefer the existing Next.js and Tailwind stack. Use shadcn/ui only if already installed or if a later implementation step justifies adding it. Match all component styling to the STRIDE palette.

**Icons:** Use lucide-react consistently. Pair status colours with meaningful icons and text labels — never rely on colour alone.

### Responsive design and accessibility
- Support desktop, tablet, and mobile layouts.
- Preserve the visual hierarchy on smaller screens.
- Maintain keyboard accessibility, visible focus states, and sufficient contrast.
- Respect reduced-motion preferences.

### Tailwind CSS implementation
- Tailwind CSS v4. Define the palette through CSS-first `@theme` variables in the existing global stylesheet (`app/globals.css`).
- Do not introduce a legacy Tailwind configuration (`tailwind.config.ts`) unless the installed setup requires it.

### Font and asset fallbacks
- All fonts and external assets must have reliable fallbacks.
- The app must remain fully usable when an external font or image resource is unavailable or fails to load.

### Implementation constraints
- STRIDE is a learning and innovation platform, not an e-commerce website.
- Use the supplied visual reference for inspiration, not as a layout to copy literally.
- Preserve the existing Next.js, React, TypeScript, and Tailwind CSS scaffold.
- Do not install new packages or implement application components in this task.
- Do not remove or weaken requirements for real authentication, persistent data, deterministic verification, evidence-based AI feedback, or functional testing.
- Do not claim anything has been implemented or tested when it has not.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth + PostgreSQL (+ Storage)
- Git and GitHub
- Vitest for unit and integration tests
- Playwright for browser-level testing
- Vercel for deployment

## Core Database Entities (RLS enabled on all tables)
- `profiles`: id (→ auth.users), name, email, language_pref, created_at
- `projects`: id, user_id, name, domain, scenario_id (null = Path A), current_stage, status, created_at, updated_at
- `stages`: id, project_id or template_id, order, title, requirements, rubric, pass_criteria
- `stage_submissions`: id, project_id, stage_id, user_id, content, evidence_urls, status (draft/submitted), submitted_at
- `evaluations`: id, submission_id, scores, passed, ai_feedback, evidence_summary, created_at
- `scenarios`: id, title, domain, description, steps, deterministic_rules, is_prepared
- `scenario_attempts`: id, user_id, scenario_id, responses, score, feedback, created_at
- `evidence_links`: id, project_id, type (github|website), url, status, last_checked
- `verification_results`: id, evidence_link_id, check_type, passed, evidence, limitations, created_at

RY context assembly: project + current stage + latest submission + rubric + prior evaluations → system prompt (refresh per stage; project records persist).

## External Services, Credentials, Configuration
| Service | Use | Credentials/Config |
|---|---|---|
| Supabase | Auth, Postgres, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only) |
| AI provider | RY coaching | `AI_PROVIDER` (ollama|openai|anthropic), `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` |
| GitHub API | Repo structure inspection | `GITHUB_TOKEN` (optional, raises rate limits) |
| Vercel | Deployment | Project env vars; no secrets committed |
| SMTP/Resend (optional) | Auth emails | Only if not using Supabase defaults |

Rule: `.env.local` gitignored. `.env.example` committed with placeholder names only.

## Development Rules
- No file edits outside the current implementation part unless approved.
- AI calls, GitHub API, and URL checks run server-side only (Next.js server actions / API routes) — never in browser.
- Secrets: server-side env only. Never commit `.env`; `.env.example` with placeholder names only.
- Authorization enforced server-side via Supabase RLS; never expose privileged keys in frontend code.
- No fake buttons, placeholder success states, hard-coded demo accounts, fabricated analytics, or simulated persistence presented as real functionality.
- Clear loading, empty, success, and error states. Validate inputs. Handle failures gracefully.
- AI grounds feedback in actual user evidence; never fabricates completed tasks, test results, citations, or success claims. AI supplements — never replaces — deterministic checks. Never mark verified solely because a URL opens.
- Tests: Vitest for pure logic (scenario rules, rubric scoring); Playwright for auth flows, dashboards, path navigation. Mock AI provider in tests.
- Implement in small verifiable parts: scaffold → auth → dashboard → Path A → Path B → coaching → verification → testing → deployment. Do not build everything in one step.
- Do not claim any feature exists or has been tested until implemented and verified.

## Ambiguities to Resolve (before/during implementation)
- AI default provider: `opencode.json` points to local Ollama (qwen2.5-coder:7b). Is Ollama dev/default with OpenAI/Anthropic as swap options via env?
- Voice I/O scope: browser Web Speech API vs cloud STT/TTS; MVP or post-MVP?
- Hindi scope: full UI translation or coaching responses only?
- Pass gate: hard server-enforced block or advisory warning?
- Test execution sandbox: containment plan for running user-controlled tests (SSRF/code-execution risk).
- Email: Supabase Auth defaults or custom SMTP?
- Evidence file attachments/screenshots: Supabase Storage required?

## Context Preservation
Workspace is greenfield (contains only `opencode.json`). Do not claim features exist or have been tested. Wait for approval before beginning Part 1: application scaffold.