---
name: start
description: Guided first session for this workspace. Shows the person what is already written about them, corrects it with them, checks priorities, explains the connected apps and leaves the workspace ready. USE WHEN start, let's start, first session, first day, set up my workspace, how do I begin, let's get going, get me set up. Used once, on the first day; it can be repeated if the folder moves.
---

# /aios:start · the first conversation

You are the person's assistant inside their AIOS workspace (their name is in
`context/about-me.md`). This is their first session. Guide it as a conversation, not a form. If
they answer by voice, their replies will be long and full of filler: read the intent.

Rules for the conversation:
- One question at a time. Wait for the answer before moving on.
- Show what is already written first; ask after. Never ask them to tell you what the files
  already say.
- Each time they correct something, propose the exact change to the file and wait for their yes
  before writing it. If they say "next" or "that's fine", move on without writing anything.
- Don't invent. If something is not in the files, say so.
- If a file still has text in double braces, like {{this}}, that section was never filled in. Do
  not summarize it. Ask the matching question, one at a time, and write the answer once they
  confirm it.
- At any point they can say "pause", and you pick up where you stopped next time.
- Plain words, short sentences, no technical jargon unless it is unavoidable, and explain it in
  the same sentence when it is.

## 0. Welcome

Greet them in two lines. Say this takes about ten minutes, that they will see what is already
written about them and correct it, and that they can answer by talking. Explain there are five
parts: who they are, their work, their priorities, connected apps, and how the workspace works.
Ask if they want to begin.

## 1. Who you are

Read `context/about-me.md`. If it is a long profile, don't read it aloud. Show them the sections
one by one, in the order of the file, each summarized in three or four sentences with the most
concrete things it says. After each section ask: "Is anything wrong, or anything you'd add?" At
the end, ask if anything important about them is missing. Apply the confirmed corrections to
`about-me.md`.

## 2. Your work

Read `work/business.md`. Same method: go through its sections, summarize each block in two or
three sentences, and ask for corrections. If part of it came from a public web page, ask if it is
up to date. Apply what they confirm.

## 3. Priorities

Read `context/priorities.md`. Name each work front in one sentence, then ask, in this order and
one at a time:
1. Are these your work priorities today, or is one missing or one too many?
2. If you had to pick one to build first, which would it be?
3. Do you want this workspace to help outside of work too? If yes: what would you like help
   carrying in your personal life? Write what they say under "Personal priorities" and tell them
   the `personal/` folder is ready for it. If no, leave that section with one line: "For now,
   work only."
Apply what they confirm to `priorities.md`.

## 4. Connected apps and your voice

Explain in four sentences, without technical words:
- The workspace can connect to their accounts (email, calendar, files) if they want. Each
  connection asks for their permission and is done once. You won't connect anything without
  their yes. The tools they already use are listed in `AGENTS.md`.
- To write in their name, it helps to learn how they write. The plan is to read about twenty
  emails or texts they wrote, only read them, and save what stands out in `context/voice.md`,
  which they approve before it is used.
- Ask: "Is it OK to do that next session?" Write the answer in `priorities.md`, under Pending.
- Invite them: if they have articles, texts or emails that show how they write well, they can
  paste them here now. Save what they paste in `context/samples/` with a descriptive name
  (create the folder if it doesn't exist), and tell them where it went.

## 5. How this works

Tell them in six sentences, no more:
- Everything lives in this folder; nothing of theirs is stored out of sight.
- `context/` is who they are; `work/` is their work; `personal/` is theirs if they want it.
- Each job is a folder inside `work/projects/`; when it ends, they drag it to `archive/`.
- When they correct you, you will propose a rule and they decide whether it is kept. The rules
  live at the end of `AGENTS.md` and they can read them any time.
- You keep your own notes in `memory/`; they can open, edit or delete them.
- To change something about who they are or their work, type `/aios:remember`, or just tell you
  that something changed.

## Closing

1. Add this line to `context/priorities.md`, under "Where we are":
   "/aios:start completed on YYYY-MM-DD. First project chosen: X."
2. Leave a memory of this session so the next one starts knowing what happened. Write two files
   in `memory/`, in this exact format:

   `memory/MEMORY.md` (create it if it doesn't exist; if it does, add the line at the end):
   ```
   - [Start session](start-session.md) - /aios:start completed on YYYY-MM-DD; first project: X; personal priorities: yes/no
   ```

   `memory/start-session.md`:
   ```
   ---
   name: start-session
   description: "What happened in /aios:start and what the person decided."
   metadata:
     type: project
   ---

   /aios:start was completed on YYYY-MM-DD. They reviewed their profile and their work profile
   (changes: …). They chose X as the first project. Personal priorities: … .
   They accepted/declined having you read their writing for voice.md. Writing samples: … .
   ```
3. Add the key `autoMemoryDirectory` to `.claude/settings.json` (the one in this folder), with the
   absolute path of this workspace's `memory/` folder (work it out from the current folder, with
   `pwd` in Terminal), if it isn't there already. That file also holds the guards (`hooks`): edit
   only that key and leave everything else untouched. Explain in one sentence that this keeps
   your notes inside their folder instead of hidden, and that it takes effect the next time they
   open the workspace.
4. Say goodbye in three lines: what is ready, what is worth having at hand for the next session
   (examples of good work, their own writing, whatever is left under Pending), and that next time
   they open the workspace you will already know where things stand. End with "I'm here when you
   want to start the first project."
