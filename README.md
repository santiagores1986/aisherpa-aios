# AIOS by AI Sherpa

The shared part of AIOS, the personal AI system AI Sherpa sets up for each client after an interview: the routines, thinking tools, background helpers and buttons. Each client's own files (who they are, their projects, their memory) live only on their own computer and are never in this repository.

The AIOS installer registers this marketplace in Claude Code and keeps it updated automatically. To add it by hand:

```
/plugin marketplace add santiagores1986/aisherpa-aios
/plugin install aios@aisherpa
```

| Plugin | What it is |
|---|---|
| `aios` / `aios-es` | Routines, thinking tools, session state and project logs, in English / Spanish |
| `aios-quickbar` / `aios-quickbar-es` | Buttons above the prompt for the routines, plus an effort row |
| `aios-side-chat` / `aios-side-chat-es` | A side pane to ask about the main chat without adding to it |

Made by [AI Sherpa](https://aisherpa.me).
