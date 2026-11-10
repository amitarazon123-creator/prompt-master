import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'prompt-master',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, scroll: { offset: 0, bodyRows: 10 } },
} as const

test('the button rewrites the draft and Undo restores it', async ($, on) => {
  let box = 'make login page'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  on('prompt.fill', (_, e) => {
    box = e.text
    return { isFilled: true, text: box, cursor: box.length }
  })
  on('model.complete', () => ({ value: {
    isAnswered: true,
    text: 'Build a login page with email and password fields.',
    usage: { input_tokens: 1, output_tokens: 1 },
  } }))
  on('ui.toast', () => ({ value: undefined }))

  for (const surface of ['terminal', 'desktop'] as const) {
    box = 'make login page'
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'prompt-master' })
    expect(box).toBe('Build a login page with email and password fields.')
    await ui.press({ key: 'prompt-master-undo' })
    expect(box).toBe('make login page')
    await ui.unmount()
  }
})

test('auto mode rewrites a submitted prompt and is remembered', async ($, on) => {
  let sent = ''
  const stored: Record<string, unknown> = {}
  on('store.set', (_, e) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('model.complete', () => ({ value: {
    isAnswered: true,
    text: 'Better prompt',
    usage: { input_tokens: 1, output_tokens: 1 },
  } }))
  on('prompt.submit', (_, e) => {
    sent = e.text
    return { text: e.text }
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'prompt-master-auto' })
  await $.prompt.submit({ text: 'rough' })
  expect(sent).toBe('Better prompt')
  expect(stored.isAuto).toBe(true)
  await ui.unmount()
})
