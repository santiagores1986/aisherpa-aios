# aios-keepwarm

Part of AIOS by AI Sherpa. Keeps Claude's prompt cache warm while you take a break, so your next message costs a cheap read instead of a full re-write of the whole conversation, and stops a cold send once to show you its price.

- On by default in every chat. A green `● keep warm` switch sits in the band above the prompt, between the quickbar and the Effort row; click it to turn warming off for that chat and again to turn it back on.
- The 6-hour window restarts with every message, so a chat stays warm for 6 hours after the last one.
- Commands: `/keepwarm` (6h), `/keepwarm 90m`, `/keepwarm off`, `/keepwarm status`, and `/keepwarm-info` for the cache card.
- Warming sends a small request about every 50 minutes, so it uses a few tokens. Chats you close never ping.
- English or Spanish, following `lang` in `~/.aios/installed.json`.

## Credit

This is cache-tax 2.2.1 by Karan Bansal, MIT license (see `LICENSE`): https://github.com/karanb192/cache-tax

AI Sherpa changes, marked `AIOS` in `hooks/register.ts`:

1. Warming is on by default for every chat (`/keepwarm off` stores the choice).
2. The window restarts on every turn instead of running from session start.
3. The on/off switch in the band, placed by the `effort-row` key of `aios-quickbar`.
4. English and Spanish text; the second command is `/keepwarm-info` (cache-tax's `/cache-tax`).
5. The terminal icon has blank alt text (some terminals printed `[>]`).

To update from upstream: pull the new version, re-apply the blocks marked `AIOS`, run `claude plugin test .`.
