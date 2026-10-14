---
name: after-the-call
description: After a meeting or call, turn its transcript into what matters - decisions, who does what, open questions and a draft follow-up - and file it in the right project. The first time, it sets itself up with whatever the person records meetings with. USE WHEN after the call, post-call, just had a call, I just finished a meeting, process my meeting, here's the transcript, debrief this call, what did we decide, follow-up email for this meeting.
argument-hint: "Which call? (or paste the transcript)"
---

# /aios:after-the-call

A call only counts once what was decided is written down where the work lives. This skill does
that in one step, and the first time it learns how this person's meetings get recorded.

## First time: set it up (only if `context/after-the-call.md` doesn't exist)

Say in one line that you'll set this up once, then ask one question at a time:

1. "What do you use to record or take notes in your meetings?" Typical answers: Notion AI meeting
   notes, Fathom, Granola, Zoom or Google Meet's own transcript, Otter, the phone, or nothing.
2. Find the simplest way to get the transcript here, and try it with them now, on a real recent
   meeting:
   - If that service is already connected to Claude (check the connectors you have available), read the meeting
     from there. If it can be connected but isn't, explain in one sentence what connecting it
     means (Claude can read their meeting notes; it asks permission once) and ask if they want
     to; they do the connecting in Claude's settings, you never handle their passwords.
   - If there is no connection, agree on the manual route: they copy the transcript from the
     app and paste it here, or save the file into the project's `inputs/` folder. Show them the
     exact steps for their app, short.
   - With nothing recorded, the route is: right after the call, they talk for two minutes about
     what happened (dictation works) and you work from that.
3. Ask what they want back after each call, offering the default below, and which parts they
   don't need.
4. Write `context/after-the-call.md` with what you agreed, after their yes: the source, the exact
   steps to get a transcript, what they want back, and anything to skip. This page is your own
   instructions from now on; tell them they can change it by just telling you.

Then process the meeting you used for the test, as below.

## Every time

Read `context/after-the-call.md` and follow it. Get the transcript the way it says. If the
person named no meeting, take the most recent one and say which one you took.

Find which project it belongs to (from `context/priorities.md` and the project folders). If it's
unclear, ask; if it belongs to no project, use `work/outputs/`.

Write one file in that project's `inputs/` folder, `YYYY-MM-DD-call-<who-or-topic>.md`, with this
shape unless their page says otherwise:

- **In one line:** what the call was for and how it ended.
- **Decisions:** what was decided, each in one line, with who decided it.
- **Who does what:** each task with an owner and a date if one was said. Mark the person's own
  tasks clearly.
- **Open questions:** what was left unresolved.
- **What stood out:** anything said that changes the project, a risk, or a good idea worth keeping.
  Quote the exact words when they matter.
- **Draft follow-up:** a short email or message to the other people, in the person's voice
  (`context/voice.md` if it is approved; otherwise plain and warm). It is a draft: never send it.

Add one dated line to the project's `log.md`. If a decision changes their priorities or the
project's next step, propose the change and wait for their yes.

Close in three lines: where the notes are, the person's own next actions, and that the follow-up
draft is ready for them to send.

## Rules

- Never invent who said what. If the transcript doesn't make it clear, say so.
- Client or third-party material stays inside its project. Follow the confidentiality rules in
  `AGENTS.md` before reading any client system.
- Never send anything. Drafts only.
