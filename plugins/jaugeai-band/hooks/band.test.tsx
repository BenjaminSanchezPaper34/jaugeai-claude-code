import { expect, mock, test } from 'claude-code/testing'

const NOW = Date.parse('2026-10-07T05:32:00Z')
const PAYLOAD = JSON.stringify({
  pro: true,
  payload: {
    value: { plan: 'max' },
    snapshot: {
      fiveHour: { utilization: 86, resetsAt: '2026-10-07T09:50:00Z' },
      sevenDay: { utilization: 13, resetsAt: '2026-10-12T23:00:00Z' },
      models: [{ name: 'Fable', window: { utilization: 0 } }],
    },
    forecasts: { five_hour: { eta: '2026-10-07T08:10:00Z', hitsBeforeReset: true } },
    providers: [{ provider: 'chatgpt', plan: 'plus', windows: [
      { id: 'primary', title: 'Session 5 h', duration: 18000, utilization: 6, resetsAt: '2026-10-07T09:55:00Z' },
      { id: 'secondary', title: 'Semaine', duration: 604800, utilization: 1, resetsAt: '2026-10-14T04:55:00Z' },
    ] }],
  },
})

const PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 } as any

test('le bandeau montre chaque service, son forfait, sa limite la plus serrée et sa réinitialisation, sans prévision', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('env.get', (_$, e) => ({ value: e.name === 'LANG' ? 'fr_FR.UTF-8' : '/Users/test' }) as any)
  on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: NOW - 60_000, isLink: false } }) as any)
  on('fs.read', () => ({ value: PAYLOAD }) as any)
  on('config.list', () => ({ value: [{ key: 'theme', value: 'dark' }] }) as any)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'jaugeai-band', surface, component: 'AbovePrompt', props: PROPS })
    expect(await ui.find({ type: 'Text', text: /^Claude$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Max/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^86 %$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Pleine vers/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /↻ 4 h 18/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Codex$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Plus/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^6 %$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↻ 4 h 23/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Dans le rythme|Calme/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('sans JaugeAI Pro, une ligne le signale à la place du bandeau', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('env.get', (_$, e) => ({ value: e.name === 'LANG' ? 'fr_FR.UTF-8' : '/Users/test' }) as any)
  on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: NOW - 60_000, isLink: false } }) as any)
  on('fs.read', () => ({ value: PAYLOAD.replace('"pro":true', '"pro":false') }) as any)
  on('config.list', () => ({ value: [{ key: 'theme', value: 'dark' }] }) as any)
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })
  const ui = await $.ui.mount({ plugin: 'jaugeai-band', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ type: 'Text', text: /^Claude$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /JaugeAI Pro/ })).toBeDefined()
  await ui.unmount()
})

test("sans l'app Mac, une ligne invite à l'installer", async ($, on) => {
  mock.clock(on, { now: NOW })
  on('env.get', (_$, e) => ({ value: e.name === 'LANG' ? 'fr_FR.UTF-8' : '/Users/test' }) as any)
  on('fs.stat', () => { throw new Error('ENOENT') })
  on('fs.read', () => { throw new Error('ENOENT') })
  on('config.list', () => ({ value: [{ key: 'theme', value: 'dark' }] }) as any)
  const ui = await $.ui.mount({ plugin: 'jaugeai-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ type: 'Text', text: /jaugeai\.com/ })).toBeDefined()
  await ui.unmount()
})
