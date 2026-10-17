---
name: new-project
description: "Set up a new project in the Claude app for one area of their work: its Instructions (written with meta prompting), a brief Doc in their AIOS folder, and the steps to create it. USE WHEN new project, I'm starting something, let's set up a project, I need a project for, make a project, a big task."
---

# new-project

They want a home for one area of work. In the Claude app that's its own project, and every project
reads the same AIOS folder, so the new one already knows them. Ask, one at a time and only what they
haven't said:
1. What is it about, in a sentence?
2. Who is it for, and what should come out of it (a decision, a deliverable, a habit)?
3. Which tools does it touch (Notion, Drive, Gmail, a CRM...)?

## Their files
Their context lives as **Google Docs in their own Google Drive**, in a folder called **AIOS**
(My Drive → AIOS): `start-here`, `assistant`, `about-me`, `how-to-work-with-me`, `my-business`,
`my-voice`, `priorities`, and the subfolders `playbooks`, `projects` and `notes`. Every project they
make reads this same folder, so a change made in one project shows up in all of them.
- **Read** with the Google Drive connector (search by title inside the AIOS folder they own) and the
  Google Docs connector (read the document). Read `start-here` first; it says which file wins when two
  disagree.
- **Change** a Doc only after their yes: show the current text and the proposed text, one under the
  other. Then edit that Doc in place with the Google Docs connector, changing only what they
  confirmed, and set its `Last updated:` line (top of the Doc) to today's date. Read it back and
  confirm in one line. Never make a copy, a download or a second version of a file that exists.
- **New pages** (a playbook, a project brief, notes) are new Google Docs created in the right
  subfolder of AIOS with the Google Drive connector. Give them the link.
- If Google Drive or Google Docs isn't reachable, say so in one line and send them to Customize →
  Connectors (the steps are in `its-broken`). Don't fall back to downloads.
- **Client material stays private.** Public facts about their practice (offers, testimonials they
  publish) may go in `my-business`. Anything private about one of their clients (names in a coaching
  context, what a client said, their documents, notes about them) goes only in that client's or
  project's own folder, AIOS → projects → <name>, never in the shared Docs or in `notes`.
- The project's Library may hold old copies of these files. The Drive folder is the one that counts.
- **Dates** are their local date, never the computer's clock (it runs on UTC and can be a day ahead).
  Use the time zone in `about-me` (a city or region counts: the Bay Area is Pacific time); if there is
  none, ask once and save it in `about-me` after their yes.
- Connecting an app (Gmail, Notion, a CRM...) is in **Customize → Connectors** (never "Settings"); a
  new connection reaches new threads, not the ones already open.

Then, without more questions:
- **Instructions.** Write the project's Instructions as one block they can copy. Start with the same
  base their home project uses (read the home project's own Instructions if you can see them; the
  base says whose assistant you are, that their context is in Google Drive → AIOS, to read
  `start-here` first, and that changes go to the Docs after their yes). Then add, by meta prompting: a
  role ("a business-development assistant who keeps them in touch with people"), the goal, what to do
  first in each thread, which Docs matter most here (`my-voice` if it writes, `my-business` if it
  sells), and what never to do without their approval. Under 400 words. The most important rule goes
  first and is repeated at the end.
  The block names this project's own folder (AIOS → projects → <project name>) and says to read its
  `brief` at the start of each thread.
- **Brief.** In AIOS → projects → <project name>: reuse the folder and its `brief` if they already exist
  (show what's there); otherwise make the folder and a Google Doc `brief`: goal, for whom, deliverable,
  sources, deadline. What you don't know stays "pending". Give them the link.
- **Steps**, numbered, exactly: 1. Click Copy on the Instructions block. 2. In the Claude app, click
  `</>` (top left) → Projects → New project. 3. Type the name; a Goal is optional (one sentence a person
  would understand); leave Context empty; click Create project. 4. Click the gear at the top of the
  project → Memory → click inside Project instructions → paste → Save changes. 5. Close the settings
  and ask the first question.
- **Priorities.** Propose the new project's line in `priorities` and write it after their yes.
Finish in one line: what's ready and the first thing to ask inside the new project.
