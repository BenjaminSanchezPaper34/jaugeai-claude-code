import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Service, Usage } from '../types'

const usage = atom({ plugin: 'jaugeai-band', key: 'usage' } as const, null)
const isHidden = atom({ plugin: 'jaugeai-band', key: 'isHidden' } as const, false)

// Written by the JaugeAI app when it installs the band (ClaudeBand.swift);
// left as is in the public plugin, which finds the folder from HOME.
const DIR = '__AIJAUGE_DIR__'
const SITE = 'jaugeai.com'

async function folder($: EngineInterface): Promise<string> {
  if (DIR.startsWith('/')) return DIR
  return `${(await $.env.get('HOME')) ?? ''}/Library/Application Support/AIjauge`
}

async function french($: EngineInterface): Promise<boolean> {
  return ((await $.env.get('LANG')) ?? '').startsWith('fr')
}
const STALE_MS = 20 * 60 * 1000

type Window = { utilization: number; resetsAt?: string }
type ProviderWindow = Window & { id: string; title: string; duration?: number }
type Forecast = { eta: string; hitsBeforeReset: boolean }
type Payload = {
  writtenAt?: string
  value?: { plan?: string }
  snapshot?: { fiveHour?: Window; sevenDay?: Window; models?: { name: string; window: Window }[] }
  forecasts?: Record<string, Forecast>
  providers?: { provider: string; plan?: string; windows: ProviderWindow[] }[]
  providerForecasts?: Record<string, Forecast>
}

const NAMES: Record<string, string> = { chatgpt: 'Codex', gemini: 'Gemini' }

function capitalized(s?: string): string | null {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : null
}

export function resetIn(iso: string | undefined, now: number, fr = true): string | null {
  if (!iso) return null
  const ms = Date.parse(iso) - now
  if (!(ms > 0)) return null
  const minutes = Math.round(ms / 60000)
  const days = Math.floor(minutes / 1440)
  if (days > 0) return `${days} ${fr ? 'j' : 'd'} ${Math.floor((minutes % 1440) / 60)} h`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export function services(p: Payload, now: number, fr = true): Service[] {
  const out: Service[] = []
  const s = p.snapshot
  if (s?.fiveHour || s?.sevenDay) {
    const rings: number[] = []
    if (s.fiveHour) rings.push(s.fiveHour.utilization)
    if (s.sevenDay) rings.push(s.sevenDay.utilization)
    // The capped model's week only once it is used, as everywhere.
    const model = (s.models ?? []).slice().sort((a, b) => b.window.utilization - a.window.utilization)[0]
    if (model && model.window.utilization > 0) rings.push(model.window.utilization)
    out.push({
      name: 'Claude', plan: capitalized(p.value?.plan),
      percent: Math.max(...rings),
      reset: resetIn(s.fiveHour?.resetsAt ?? s.sevenDay?.resetsAt, now, fr),
    })
  }
  for (const pr of p.providers ?? []) {
    const windows = pr.windows.slice().sort((a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity)).slice(0, 3)
    if (windows.length === 0) continue
    const rings = windows.map(w => w.utilization)
    out.push({
      name: NAMES[pr.provider] ?? capitalized(pr.provider) ?? pr.provider, plan: capitalized(pr.plan),
      percent: Math.max(...rings),
      reset: resetIn(windows[0].resetsAt, now, fr),
    })
  }
  return out
}

async function load($: EngineInterface): Promise<Usage | null> {
  const now = await $.clock.now()
  const fr = await french($)
  const hint = (text: string): Usage => ({ services: [], stale: null, hint: text })
  let raw: string, mtime: number
  try {
    const path = `${await folder($)}/mcp-payload.json`
    mtime = (await $.fs.stat(path)).mtimeMs
    raw = await $.fs.read(path)
  } catch {
    // No app on this Mac: one quiet line, closable like the band.
    return hint(fr ? `JaugeAI : installez l'app Mac pour voir vos limites · ${SITE}` : `JaugeAI: install the Mac app to see your limits · ${SITE}`)
  }
  try {
    const doc = JSON.parse(raw)
    // JaugeAI Pro only: the app publishes `pro` with the payload.
    if (doc.pro !== true) return hint(fr ? 'JaugeAI : le bandeau fait partie de JaugeAI Pro' : 'JaugeAI: the band is part of JaugeAI Pro')
    const list = services(doc.payload ?? {}, now, fr)
    if (list.length === 0) return null
    const age = now - mtime
    return { services: list, stale: age > STALE_MS ? Math.round(age / 60000) : null, hint: null }
  } catch {
    return null
  }
}

async function refresh($: EngineInterface) {
  const next = await load($)
  await update($, usage, () => next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'jaugeai', description: 'Show or hide the JaugeAI band' })
    await refresh($)
    $.clock.every(60_000, () => refresh($))
    return next(e)
  })

  // /jaugeai: brings the band back after its close button, or hides it.
  on('command.run', { command: 'jaugeai' }, async $ => {
    const hidden = await read($, isHidden)
    await update($, isHidden, () => !hidden)
    await refresh($)
    const fr = await french($)
    return { text: hidden ? (fr ? 'Bandeau JaugeAI affiché.' : 'JaugeAI band shown.') : (fr ? 'Bandeau JaugeAI masqué.' : 'JaugeAI band hidden.') }
  })

  on('prompt.submit', ($, e, next) => {
    refresh($).catch(() => {})
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const u = (await read($, usage)) ?? (await load($))
    if (e.props.hasSurvey || u === null || (await read($, isHidden))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const dim = !!u.stale
    // The plan as a label, as the app's badge: a grey chip on either theme.
    if (u.hint) {
      return (
        <Box>
          <Text dimColor>{u.hint}</Text>
          <Text>  </Text>
          <Button key="hide" label="×" dimColor onPress={() => update($, isHidden, () => true)} />
        </Box>
      )
    }
    const fr = await french($)
    const theme = String((await $.config.list()).find(row => row.key === 'theme')?.value ?? 'dark')
    const chip = theme.includes('light') ? '#E5E5EA' : '#3A3A3C'

    const service = (s: Service, i: number) => (
      <Box key={`s${i}`}>
        <Text dimColor={dim}>
          <Text bold>{s.name}</Text>
          {s.plan ? <Text> </Text> : null}
          {s.plan ? <Text backgroundColor={chip} bold> {s.plan} </Text> : null}
          <Text>  </Text>
          <Text bold color={s.percent >= 95 ? 'error' : undefined}>{s.percent} %</Text>
          {s.reset ? <Text dimColor>  ↻ {s.reset}</Text> : null}
          <Text dimColor>{i < u.services.length - 1 ? '   │   ' : ''}</Text>
        </Text>
      </Box>
    )

    return (
      <Box>
        {u.services.map(service)}
        {u.stale ? <Text dimColor>  · {fr ? 'relevé il y a' : 'read'} {u.stale} min{fr ? '' : ' ago'}</Text> : null}
        <Text>  </Text>
        <Button key="hide" label="×" dimColor onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
