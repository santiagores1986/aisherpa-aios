export type FileChangeRecord = { file: string; added: number; removed: number; diff: string; verb: string }
export type Activity = { id: string; tool: string; label: string; command: string; output: string; files: FileChangeRecord[]; failed: boolean; at: number }

declare module 'claude-code' {
  interface PluginState {
    'aios-chat-mode': { activities: Activity[]; selected: string; narrations: Record<string, string>; technical: string[] }
  }
}
