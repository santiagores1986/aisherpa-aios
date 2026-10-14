---
name: its-broken
description: Find out what broke in this AI system and fix it, in plain words. Checks Claude Code's version and recent updates, the buttons and side panels (mods), the status line, the settings and the connected apps. USE WHEN it's broken, something broke, this isn't working, the buttons disappeared, the status line is gone, something changed, error, help it stopped working.
---

# It's broken

The person using this system is not an engineer. They noticed something wrong. Your job: find what broke, explain it in plain words, and fix it when the fix is safe. Do the checks yourself; never ask them to run commands.

## 1. Ask one thing first

"What did you notice, and when did it last work?" One question. If they already said, skip it.

## 2. Run the checks

Run each check, note what it returns, and move on. Don't stop at the first problem: several things can break together after one update.

| Check | How | What "broken" looks like |
|---|---|---|
| Claude Code version | `claude --version`; compare with the version noted in `~/.aios/installed.json` if it exists | A newer version than installed: an update happened and may have changed how mods work |
| Mods load | AIOS is several plugins, switched on by the installer in `/Library/Application Support/ClaudeCode/managed-settings.json` (`enabledPlugins`), so `claude plugin list` may show none of them: that is normal. Compare that list with the folders in `~/.claude/plugins/cache/aisherpa/`, then run `claude plugin validate` on each folder's newest version. The plugins: `aios` (routines, session state, project logs, writing style), `aios-quickbar` (buttons and the Effort row), `aios-keepwarm` (the keep-warm row), `aios-side-chat` (side chat), `aios-md-view` (documents strip and panel), `aios-chat-mode` (plain one-line tool steps), `aios-secret-filter` (hides passwords and keys), `aios-spanish-accents` (Spanish accents check), `aios-design` (design skills). Also `document-skills` from Anthropic's own marketplace (`anthropic-agent-skills`, folder `~/.claude/plugins/cache/anthropic-agent-skills/`): Word, PowerPoint, Excel and PDF | A plugin in the settings with no folder in the cache; validation fails, or names an event or call the engine refuses |
| Plugin up to date | `claude plugin marketplace update aisherpa` and read the result | An error while updating (offline, marketplace not found), or a newer version available that is not installed |
| Mods drawn | Ask whether the quickbar (buttons above the prompt) shows | Every mod gone at once, with validation passing: mods are switched off or changed on Anthropic's side |
| Status line | `echo '{}' \| python3 ~/.aios/statusline.py` | Error output, or `python3` not found |
| Settings | Read `.claude/settings.json` in the folder and `~/.claude/settings.json`; check they are valid JSON | A file that does not parse, or a status line path that does not exist |
| Files anywhere | `ls ~/Desktop ~/Documents ~/Downloads >/dev/null` | "Operation not permitted": Warp lacks Full Disk Access. Walk them through Apple menu → System Settings → Privacy & Security → Full Disk Access → turn on Warp (or `open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"`), then quit and reopen Warp |
| Connected apps | `claude mcp list` | A connector marked failed or needing login |
| Internet and Anthropic | `curl -sIL https://status.anthropic.com` (last status line should be 200) | No answer: offline, or Anthropic is having an outage |

## 3. Explain

Three short parts, in plain words:
1. **What broke**, in their terms ("the buttons above where you type stopped showing").
2. **Why**, if you know ("Claude Code updated last night and changed how buttons load"). Say when you are guessing.
3. **What still works.** The folder, the rules and the skills work without any buttons or panels. Say so, so they can keep working.

## 4. Fix or hand off

- **Fix it yourself** when the fix is small and only touches this system's own files: a settings file with a typo, a status line path that moved, a connector that needs logging in again (walk them through the login).
- **Don't edit a mod's code.** If a mod fails after an update, it needs a new version from AI Sherpa.
- **Hand off** anything you didn't fix: write a short message they can send to Santiago (santiago@aisherpa.me), ready to copy, with what broke, when, the Claude Code version, and the exact error lines from your checks. Nothing else around it.

## Rules

- Never delete files to "reset" anything.
- Never turn off permission settings to make something work.
- If everything checks out, say so plainly and ask them to show you the problem happening.
