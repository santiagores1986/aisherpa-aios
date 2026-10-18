---
name: close
description: "Close the work session and leave a trace: logs up to date, priorities updated, rules proposed. USE WHEN close, let's close, that's it for today, we're done, I'm done for today, let's stop here, wrap up, end the session, save where we left off."
---

# /aios:close

The session is ending. Leave the workspace so the next session starts knowing exactly where
everything stands. Write steps 1, 2 and 4 directly; only step 3 needs the person's yes. Don't
narrate each step: do everything and deliver the summary in step 5.

1. **Logs.** For every project where something changed in this session, add an entry to its
   `log.md`: one line starting with `- YYYY-MM-DD:` that says what was done, what was decided and
   what comes next. One entry per project, never a heading per date. If a project has no log, create it.
2. **Where we are.** Update the "Where we are" section of `context/priorities.md`: today's date,
   where the session ended, and the agreed next step in one sentence. Replace the previous entry;
   don't pile up history there, that is what the logs are for.
3. **What you learned about the person.** If in this session they corrected you or stated a
   preference, propose a line for "Learned rules" in `AGENTS.md`, in the file's format, and wait
   for their yes. If you learned something stable about them or their work, propose the change
   to `context/about-me.md` or `work/business.md` and wait for their yes. If there was nothing,
   say so in one line and move on.
4. **Memory.** Add one line to `memory/MEMORY.md` with the date and a ten-word summary of the
   session, pointing to a file `memory/session-YYYY-MM-DD.md` with five lines of detail, in the
   format that folder already uses. If `MEMORY.md` doesn't exist, create it. If today's session
   file already exists (a second session the same day), add a new dated section at its end; never
   replace what is there. When the session was about a client's material, the memory note only
   names the project and points to its `log.md`; the client's details stay inside the project.
5. **Summary.** End with three lines: what got done, what is still open, and what is worth having
   at hand next time.

Every claim in the summary must be checkable by opening a file. If something was not written
down, don't report it as done.
