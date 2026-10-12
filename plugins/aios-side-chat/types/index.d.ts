export type SideMessage = { who: 'you' | 'claude' | 'note'; text: string }

declare module 'claude-code' {
  interface PluginState {
    'aios-side-chat': { messages: SideMessage[]; busy: boolean; draft: string }
  }
}
