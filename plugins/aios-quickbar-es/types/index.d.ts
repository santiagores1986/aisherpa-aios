export type QuickButton = { id: string; label: string; text: string }
export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type EffortChoice = 'auto' | EffortLevel

declare module 'claude-code' {
  interface PluginState {
    'aios-quickbar-es': { buttons: QuickButton[]; draftLabel: string; draftText: string; effortChoice: EffortChoice; sessionEffort: string }
  }
}
