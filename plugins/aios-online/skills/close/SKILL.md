---
name: close
description: "Close the work session and leave a trace for the next time: where we are, what was decided, what they taught you, written into their Google Docs. USE WHEN close, let's close, that's it for today, we're done, wrap up, end the session, save where we left off."
---

# close

The session is ending. Leave things so the next thread starts knowing exactly where they are.

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

1. **Where we are.** Propose the new "Where we are" section for `priorities` (right under its "Last
   updated" line, replacing the old one): today's date, where the
   session ended, the agreed next step in one sentence. If a project's status changed, update its line
   under the work fronts too.
2. **What you learned.** If they corrected you or stated a preference, propose a line for "Learned
   rules" in `how-to-work-with-me` (`N. Never/Always X, because Y`). If you learned something stable
   about them or their work, propose the change to `about-me` or `my-business`. If there was nothing,
   say so in one line.
3. **Write.** After their yes, update each Doc in place as the file rules say, one at a time, and read
   each back.
4. **Summary.** Three lines: what got done, what is still open, what to have at hand next time.

Every claim must be checkable in a Doc you updated. If something wasn't written down, don't report it
as done. A client's material stays in its own project folder (AIOS → projects); never copy a client's
details into the shared files.
