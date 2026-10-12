export type SideMessage = { who: 'you' | 'claude' | 'note'; text: string }

declare module 'claude-code' {
  interface PluginState {
    'aios-side-chat-es': { messages: SideMessage[]; busy: boolean; draft: string }
  }
}
