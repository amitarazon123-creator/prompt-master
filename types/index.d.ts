export type PromptMasterOriginal = string | null

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': {
      isAuto: boolean
      isBusy: boolean
      original: PromptMasterOriginal
    }
  }
}
