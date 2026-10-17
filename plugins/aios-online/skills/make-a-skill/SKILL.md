---
name: make-a-skill
description: "Turn what they tell you about a process, spoken and messy, into a written procedure with steps, owners and exceptions, saved as a Google Doc in their playbooks. USE WHEN make a skill, let me tell you how I do X, this is what I do every time, let's pull out the process, let's document this process, or when they narrate a workflow."
---

# make-a-skill

They'll tell you how they do something that repeats (a launch, follow-ups after a conference, a
newsletter issue), by talking, with detours.

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

1. Listen to all of it without interrupting.
2. Give back a first ordered version, faithful to what they said: trigger, steps, who does each, tools,
   how they know it went right. Mark "pending" what they didn't say.
3. Ask one at a time, only what changes the procedure: exceptions, decisions only they make, what a
   good result looks like.
4. After their yes, write it as a new Google Doc in AIOS → playbooks named after the process (trigger,
   inputs, steps with owner, output, exceptions, the review point; one page). A playbook already in
   that folder shows the shape. Give them the link.
5. Close in four lines: which part Claude could do tomorrow without risk, which stays in their hands,
   and whether it could become its own skill (Customize → Skills → create a skill from the playbook).

Use their own words and names for things.
