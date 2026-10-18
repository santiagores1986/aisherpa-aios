---
name: new-project
description: Create a new project in the right place, with a brief and a log, and note it in priorities. USE WHEN new project, I'm starting a job, I have a new project, let's work on something new, let's start a project, make a folder for this, I want to put together a proposal, a big task, a personal project.
---

# /aios:new-project

The person wants to start something. Your job is to put it in its place and leave it ready to
work on, in under two minutes. Three questions, one at a time, and only if they didn't already
answer them when they asked:

1. What is it about? One sentence is enough.
2. Is it for work, personal, or another area? If they don't say, assume work when it sounds
   like work.
3. What decision or deliverable should come out of this, and for whom?

Then, with no more questions and without asking permission for any of these steps:

- Pick the folder name: lowercase, hyphens, no accents, short. Tell them: "I'll call it
  `north-company-sale`, does that work?" If they prefer another name, use theirs.
- Create the folder at `<area>/projects/<name>/` (the area is `work`, `personal` or
  `other-areas/<area>`) with:
  - `brief.md`: goal, for whom, the decision or deliverable it aims at, known sources, deadline if
    they gave one. What you don't know stays as "pending"; don't invent it.
  - `log.md`: a title and a first entry on one line: `- YYYY-MM-DD: Project created. Next step: …`.
    Every log entry is a line like that, starting with "- " and the date; never a heading per date.
  - `inputs/`, `drafts/`, `delivery/`, empty.
- Add a line to `context/priorities.md`, under the "## Active projects" section that is already there
  (create it only if it doesn't exist; never a second one): `- <area>/projects/<name> · <one sentence> · since YYYY-MM-DD`.
  If the section only says "None yet", replace that line with the project's.
- Finish in one line: where it landed and what the first step is. Nothing else.

Projects live in `projects/`. If the person asks for somewhere else, tell them in one sentence
that here projects go in `projects/` and create it there; if they insist, the rule is changed in
`AGENTS.md`.
