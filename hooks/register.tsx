import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PromptMasterOriginal } from '../types'

const isAuto = atom({ plugin: 'prompt-master', key: 'isAuto' } as const, false)
const isBusy = atom({ plugin: 'prompt-master', key: 'isBusy' } as const, false)
const original = atom({ plugin: 'prompt-master', key: 'original' } as const, null as PromptMasterOriginal)

const MODEL = 'sonnet'
const PANE = 'prompt-master'

const KEEP = '<<KEEP>>'

const SYSTEM = `You are Prompt Master. You improve a user's rough prompt for an AI assistant — but only as much as it needs.

First judge the prompt, then pick ONE level:

1. KEEP — the prompt is already clear for what it is: a short reply ("yes", "do it", "use option 2"), a casual question, a follow-up that only makes sense in conversation, or a request that already states what it wants. Output exactly ${KEEP} and nothing else.
2. LIGHT — the intent is clear but the wording is messy. Fix spelling, grammar and ordering; make the goal the first sentence. Add nothing new. Stay about the same length.
3. FULL — the request is vague or underspecified and a real task is being asked for. State the goal clearly, add where to look or what context matters, constraints, and what "done" looks like. Where a detail is missing, say it is unknown and what to do about it; never invent it.

Rules for every level:
- Keep the user's intent, scope, tone and every concrete detail (names, paths, numbers, code, URLs) exactly. Never invent facts, symptoms, files or requirements.
- A question stays a question; do not turn it into a task list.
- Prefer the lower level when unsure. Never make the prompt longer than needed.
- Keep the user's voice (first person, addressed to the assistant).
- Output ONLY the result (the rewritten prompt, or ${KEEP}). No level label, preamble, quotes or commentary.`

async function setAuto($: EngineInterface, on: boolean) {
  await update($, isAuto, () => on)
  await $.store.set('isAuto', on)
}

async function rewrite($: EngineInterface, text: string): Promise<string | null> {
  const r = await $.model.complete({
    model: MODEL,
    system: SYSTEM,
    prompt: `Rewrite this prompt:\n\n<rough_prompt>\n${text}\n</rough_prompt>`,
    maxTokens: 2048,
    effort: 'low',
  })
  if (!r.isAnswered) {
    $.ui.toast(`Prompt Master couldn't rewrite: ${r.reason}`)
    return null
  }
  const out = r.text.trim()
  if (out.length === 0 || out.includes(KEEP)) return null
  return out
}

async function rewriteDraft($: EngineInterface) {
  if (await read($, isBusy)) return
  const box = await $.prompt.read()
  const text = box.text.trim()
  if (!text) {
    $.ui.toast('Type a rough prompt first, then press Prompt Master')
    return
  }
  await update($, isBusy, () => true)
  try {
    const better = await rewrite($, text)
    if (!better) {
      $.ui.toast('Prompt Master: already clear, left as is')
    } else {
      await update($, original, () => box.text)
      await $.prompt.fill({ text: better, mode: 'replace' })
      $.ui.toast('Prompt rewritten — review it and press Enter to send')
    }
  } finally {
    await update($, isBusy, () => false)
  }
}

async function onCommand($: EngineInterface, e: { args?: string }) {
  const arg = (e.args ?? '').trim().toLowerCase()
  if (arg === 'auto on' || arg === 'on') {
    await setAuto($, true)
    return { text: 'Prompt Master auto mode ON: every prompt is rewritten before it is sent.' }
  }
  if (arg === 'auto off' || arg === 'off') {
    await setAuto($, false)
    return { text: 'Prompt Master auto mode OFF.' }
  }
  if (arg) {
    const better = await rewrite($, arg)
    if (!better) return { text: 'Prompt Master could not rewrite that.' }
    await $.prompt.fill({ text: better, mode: 'replace' })
    return { text: 'Rewritten prompt placed in the prompt box — review and press Enter.' }
  }
  return { text: 'Usage: /pm <rough prompt> · /pm auto on|off' }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('isAuto')
    if (typeof saved === 'boolean') await update($, isAuto, () => saved)
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite a rough prompt: /prompt-master <prompt> · auto on|off',
    })
    await $.command.register({
      name: 'pm',
      description: 'Prompt Master shortcut: /pm <rough prompt> · /pm auto on|off',
    })
    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, ($, e) => onCommand($, e))
  on('command.run', { command: 'pm' }, ($, e) => onCommand($, e))

  // Auto mode: rewrite the prompt on its way to the model.
  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || !(await read($, isAuto)) || !e.text.trim()) {
      return next(e)
    }
    await update($, isBusy, () => true)
    try {
      const better = await rewrite($, e.text)
      if (!better) return next(e)
      const note =
        'Prompt Master (auto mode) rewrote the user\'s message before it reached you. ' +
        'The message above is the rewrite. What the user actually typed was:\n\n' +
        `<original_prompt>\n${e.text}\n</original_prompt>\n\n` +
        'If the user asks how Prompt Master changed their input, show this original next to the rewrite.'
      return next({ ...e, text: better, context: [...(e.context ?? []), note] })
    } finally {
      await update($, isBusy, () => false)
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const auto = await read($, isAuto)
    const prev = await read($, original)
    return (
      <Box flexDirection="column">
        <Text dimColor>Type a rough prompt, then press:</Text>
        <Button key="pm-pane" label={busy ? '✨ Rewriting…' : '✨ Prompt Master'} onPress={() => rewriteDraft($)} />
        <Button key="pm-pane-auto" label={auto ? 'Auto-rewrite on send: ON' : 'Auto-rewrite on send: OFF'} onPress={async () => setAuto($, !(await read($, isAuto)))} />
        {prev !== null && (
          <Button key="pm-pane-undo" label="Undo rewrite" onPress={async () => {
            await $.prompt.fill({ text: prev, mode: 'replace' })
            await update($, original, () => null)
          }} />
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const auto = await read($, isAuto)
    const prev = await read($, original)

    return (
      <Box>
        <Button
          key="prompt-master"
          label={busy ? '✨ Rewriting…' : '✨ Prompt Master'}
          onPress={() => rewriteDraft($)}
        />
        <Text> </Text>
        <Button
          key="prompt-master-auto"
          label={auto ? 'Auto: on' : 'Auto: off'}
          onPress={async () => setAuto($, !(await read($, isAuto)))}
        />
        {prev !== null && <Text> </Text>}
        {prev !== null && (
          <Button
            key="prompt-master-undo"
            label="Undo rewrite"
            onPress={async () => {
              await $.prompt.fill({ text: prev, mode: 'replace' })
              await update($, original, () => null)
            }}
          />
        )}
      </Box>
    )
  })
}
