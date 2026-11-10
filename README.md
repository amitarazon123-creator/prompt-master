# Prompt Master

A Claude Code plugin that rewrites your rough prompt into a clearer, more effective one before you send it — only as much as it needs.

It judges each prompt and picks a level:

- **Keep** — short replies, casual questions and already-clear prompts go through untouched.
- **Light** — clear intent, messy wording: fixes spelling, grammar and order; adds nothing new.
- **Full** — vague task requests get a clear goal, where to look, constraints and what "done" means. Missing details are stated as unknown, never invented.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-master --marketplace amitarazon123-creator/prompt-master
```

From a shell:

```bash
claude plugin install prompt-master --marketplace amitarazon123-creator/prompt-master
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `amitarazon123-creator/prompt-master`, then **Add plugin**.

Answer `y` to add the marketplace, then pick a scope (user scope makes it available in every session).

## Use

- `/pm <rough prompt>` — puts the improved prompt in the prompt box to review and send.
- `/pm auto on` — every prompt you send is improved automatically; remembered across sessions. `/pm auto off` turns it off.
- In the terminal, a **✨ Prompt Master** bar above the prompt box rewrites your draft in one click, with **Auto** and **Undo rewrite** buttons. (The web app doesn't draw plugin buttons; use `/pm` there.)
- `/prompt-master` is the long name of `/pm`.

In auto mode Claude also receives your original text, so you can ask "what did Prompt Master change?" to see before and after.

Rewrites use the `sonnet` model at low effort. Edit `MODEL` and `SYSTEM` at the top of `hooks/register.tsx` to change the model or the rules.

## License

MIT
