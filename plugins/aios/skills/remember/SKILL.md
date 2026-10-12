---
name: remember
description: Change something about who the person is, how they work, their work or their priorities. Finds the right file, proposes the exact change and writes it only with their confirmation. USE WHEN remember, update my context, something changed, that's no longer true, I changed jobs, my team changed, my priorities are now, note that, update my profile, fix what you know about me.
---

# /aios:remember

The person wants to change something in their context. Ask what changed, in one question, and
listen. Then decide where it goes:

- Something about them, how they learn, how they work, what they want: `context/about-me.md`.
- Something about their business or work: `work/business.md`.
- Something about what matters now or what comes next: `context/priorities.md`.
- How they write: `context/voice.md`.
- If what they say is a correction to your behavior ("don't do this", "always do that"), it does
  not go in context: propose a line for "Learned rules" in `AGENTS.md`, in the format
  `N. [CATEGORY] Never/Always X, because Y`.

Show the current text of the paragraph affected and the new text you propose, one under the
other. Wait for their yes. Write only what was confirmed, without touching the rest of the file.
Confirm in one line which file changed.

If the change affects several files, do them one at a time, in this same order.
