# JaugeAI band for Claude Code

See how much of your AI subscription is left, right above the Claude Code prompt.

```
Claude  Max   86 %  ↻ 4 h 18   │   Codex  Plus   6 %  ↻ 4 h 23        ×
```

The JaugeAI band is a Claude Code plugin (a *mod*) that shows, for each AI service you use, your plan, the tightest of your usage limits and when it resets. It is compatible with Claude Code in the terminal and in the desktop app, and is made by [JaugeAI](https://jaugeai.com), a Mac, iPhone and Apple Watch app that tracks AI subscription usage limits (Claude, ChatGPT/Codex, Gemini).

## Why

Claude Code, Codex and other AI coding tools have session limits (often 5 hours) and weekly limits. Hitting one in the middle of a task is the usual way people find out about them. The band keeps the numbers in view while you work, so you can pace a long task, switch tools or wait for the reset knowingly.

## Install

In Claude Code:

```
/plugin marketplace add BenjaminSanchezPaper34/jaugeai-claude-code
/plugin install jaugeai-band@jaugeai
```

Then start a new Claude Code session.

JaugeAI Pro users can also turn the band on from the Mac app, without any command: **Settings › Coding agents › Band above the prompt › Claude Code**.

## Requirements

- macOS with **[JaugeAI for Mac](https://jaugeai.com) 0.5.21 or later**, running.
- **JaugeAI Pro**. Without Pro, the band shows a single line saying it is part of JaugeAI Pro. Without the app, a single line points to jaugeai.com. Both can be closed with ×.

## Use

| | |
|---|---|
| `/jaugeai` | Show or hide the band |
| `×` | Hide the band (bring it back with `/jaugeai`) |

The band refreshes every minute and after each turn. When the app has not updated the numbers for 20 minutes, the band dims and says how old they are. A limit at 95 % or more turns red. Text is in French when your `LANG` is French, English otherwise.

## What the plugin hooks

- `session.start`: registers the `/jaugeai` command and refreshes the numbers every minute.
- `command.run` (only for `jaugeai`): shows or hides the band. It does not see or change other commands.
- `prompt.submit` and `turn.complete`: refresh the numbers, then pass the event on unchanged.
- `ui.render` on the area above the prompt: draws the band, or leaves the area as it is when hidden.

## Privacy

The band only reads one local file written by the JaugeAI app: `~/Library/Application Support/AIjauge/mcp-payload.json`. It makes no network request and sends nothing anywhere. It does not read your conversations, code or credentials.

## Also: JaugeAI MCP server

The JaugeAI Mac app also includes a local MCP server, so Claude Code, Codex or any MCP client can answer questions like *"how much of my Claude limit is left?"* or *"will I hit my weekly limit before Friday?"* with your real numbers (`usage_now`, plus history and cost estimates with Pro). See [jaugeai.com](https://jaugeai.com).

## FAQ

**How do I check my Claude Code usage limits?**
Install JaugeAI for Mac: it shows your session and weekly limits in the menu bar, the notch, widgets, on iPhone and Apple Watch, and, with this plugin, above the Claude Code prompt.

**Does it work with Codex or Gemini?**
Yes. Each service JaugeAI tracks gets its own entry in the band.

**Does it work on Linux or Windows?**
Not yet: the numbers come from the JaugeAI Mac app.

---

JaugeAI is an independent product, not affiliated with or endorsed by Anthropic or OpenAI. Claude and Claude Code are trademarks of Anthropic, PBC. Codex and ChatGPT are trademarks of OpenAI. Gemini is a trademark of Google LLC.

License: MIT.
