---
name: its-broken
description: "Find out what isn't working in their AI system in the Claude app and fix it, in plain words: the project, the plugin, the Google connectors, their AIOS folder in Drive. USE WHEN it's broken, something broke, this isn't working, the commands disappeared, Claude forgot me, a connector stopped, error, help it stopped working."
---

# it's broken

They're not an engineer. Find what broke, explain it plainly, and fix what's safe.

1. Ask one thing: "What did you notice, and when did it last work?" Skip it if they already said.
2. Check, and note each result:
   - **Where are we?** Are you inside one of their projects (you have its Instructions)? If not, they
     typed in a chat outside a project: open Projects (the Code side, `</>`) and pick the project.
   - **Plugin:** can you see the AI Sherpa commands (`/aios-online:start`, `/aios-online:remember`...)?
     If not: Customize → Plugins (on the chat side of the app, the speech-bubble icon) → Yours → check that
     **Aios online** is there. If it isn't, add it again: Add → Add marketplace → Add from a repository →
     `santiagores1986/aisherpa-aios` → Sync → Aios online → Add.
   - **Google Drive:** can you search their Drive? **Google Docs:** can you read a Doc? A missing one:
     Customize → Connectors → Google Drive or Google Docs → Connect, accept Google's screen. A new
     connection only reaches new threads: start a new one.
   - **Their AIOS folder:** does My Drive → AIOS exist with `start-here`, `about-me` and `priorities`
     inside? If it's missing or moved, find it (search by title) and tell them where it is; never
     recreate files that might exist elsewhere.
   - **Out of date?** Our commands get better over time, and updates don't always arrive on their own:
     Customize → Plugins → Add → Manage marketplaces → the ⋮ next to aisherpa-aios → Check for updates.
   - **Anthropic:** check status.anthropic.com for an outage.
3. Explain in three short parts: what broke, why (say when you're guessing), what still works.
4. Walk them through the fix step by step, one step at a time. Anything you can't fix: write a short
   message they can send to Santiago at AI Sherpa (santiago@aisherpa.me), ready to copy, with what
   broke, when, and what each check showed.
Never tell them to delete a project, a connector or their files to reset anything.
