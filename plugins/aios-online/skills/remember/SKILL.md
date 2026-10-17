---
name: remember
description: "Change something about who they are, how they work, their business or their priorities: finds the right Google Doc in their AIOS folder, proposes the exact change and edits the Doc in place after their yes. USE WHEN remember, update my context, something changed, that's no longer true, note that, update my profile, fix what you know about me."
---

# remember

Ask what changed, in one question (skip it if they already said). Then decide where it goes:
- About them, how they learn and work: `about-me`.
- How they want you to work and answer: `how-to-work-with-me` (a correction to your behavior goes
  under "Learned rules" as `N. Never/Always X, because Y`).
- Their practice and offers, and clients or testimonials they show publicly: `my-business`.
- Something private about one of their clients: that client's own folder (AIOS → projects → <name>),
  never a shared Doc. Say so in one line.
- What matters now: `priorities`.
- How they write: `my-voice`.
- Who you are and your name: `assistant`.

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

Show the current paragraph and the proposed one, one under the other, and wait for their yes. Change
only what they confirmed. If several Docs are affected, do them one at a time in this order. Finish in
one line: which Doc changed, and that every project reads it from the next thread on.
