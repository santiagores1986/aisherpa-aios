---
name: after-the-call
description: "After a meeting or call, turn its transcript into what matters: decisions, who does what, open questions and a draft follow-up. The first time, it sets itself up with what they record meetings with (Granola, Otter, Fathom...). USE WHEN after the call, post-call, I just finished a meeting, process my meeting, here's the transcript, what did we decide, follow-up for this meeting."
---

# after-the-call

A call counts once what was decided is written down.

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

## First time
If AIOS has no `after-the-call` Doc, set it up once, one question at a time:
1. "What records your meetings?" (their tools are in `about-me`.)
2. If that app is connected to Claude (check your connectors), read a recent meeting from it now to
   test. If it isn't, explain in one sentence what connecting it does and that they do it in Customize
   → Connectors. Without a connection: they paste the transcript here.
3. Ask what they want back after each call (offer the default below) and what to skip.
4. Create the Google Doc `after-the-call` in AIOS with the source, the exact steps and what they want.
   That Doc is your instructions from then on.

## Every time
Get the transcript the way `after-the-call` says (the latest meeting if they name none; say which).
Give back, unless their Doc says otherwise:
- **In one line:** what the call was for and how it ended.
- **Decisions**, each with who decided.
- **Who does what**, owner and date; their own tasks marked.
- **Open questions.**
- **What stood out:** anything that changes the work; quote exact words when they matter.
- **Draft follow-up** in their voice (`my-voice`). A draft only: they send it.
If a decision changes their priorities, propose the change to `priorities`.

Never invent who said what. Some clients don't want AI on their material: if the call is with a
client, ask first unless they already said it's fine. Never send anything.
