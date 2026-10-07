export type Service = {
  name: string
  plan: string | null
  /** The tightest limit. */
  percent: number
  reset: string | null
}
export type Usage = {
  services: Service[]
  /** Minutes since the Mac last published, when it is old. */
  stale: number | null
  /** One line instead of the band: app missing, or no Pro. */
  hint: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'jaugeai-band': { usage: Usage | null; isHidden: boolean }
  }
}
