---
name: make-a-skill
description: Turn what the person tells you about a process, spoken and messy, into a written procedure with steps, owners and exceptions. USE WHEN make a skill, let me tell you how we do X, this is what I do every time, let's pull out the process for, let me explain how this works, let's document this process, or when they narrate a workflow by voice.
argument-hint: "Which process are you going to tell me about?"
---

# /aios:make-a-skill

The person is going to tell you how they do something that repeats: putting together a proposal,
closing the follow-ups after a meeting, preparing a monthly report. They tell it by talking, from
start to finish, with detours. Your job is to give back a clean procedure they can read, correct
and, later, automate in part.

## How it works

1. Listen to all of it. Don't interrupt the telling with questions; let it reach the end.
2. Give them a first ordered version, faithful to what they said: where it starts, which steps
   follow, who does each one, which tools it touches, how they know it came out right. Mark with
   "pending" what they did not say; don't fill it in.
3. Ask one at a time, and only what changes the procedure: the exceptions ("and when the client
   doesn't send the documents on time?"), the decisions only they can make today, and how they
   recognize a good result.
4. Write the final procedure at `<area>/knowledge/processes/<name>.md` (almost always `work/`;
   create the `processes/` folder if it doesn't exist) in this shape: what triggers it, what
   comes in, the steps with their owner, what comes out, the exceptions and what to do in each,
   and the point where someone reviews. Short; a process fits on one page.
5. Close with two things in four lines: which part of the process the AI could do tomorrow without
   risk (a draft, a search, a reminder) and which part must stay in the person's hands. If a step
   repeats across several processes, say so: it is a candidate for a command.

## Voice

Write the procedure with the verbs and names the person used. If they say "the weekly wrap-up",
the file says "the weekly wrap-up". No quality-manual language.
