export type Doc = { path: string; at: number }
export type Viewing = { path: string; text: string; error: string }

declare module 'claude-code' {
  interface PluginState {
    'aios-md-view': { docs: Doc[]; viewing: Viewing; picks: string[] }
  }
}
