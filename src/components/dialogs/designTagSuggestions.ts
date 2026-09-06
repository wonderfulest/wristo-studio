/** Infer only features present in the published design, never unused data options. */
export const designTagKeywords = (config: unknown): string => {
  if (!config || typeof config !== 'object') return ''
  const { elements, properties, dataOptions } = config as {
    elements?: unknown
    properties?: Record<string, { value?: unknown; options?: { value?: unknown; metricSymbol?: string }[] }>
    dataOptions?: Record<string, { valueCode?: number; metricSymbol?: string }>
  }
  if (!Array.isArray(elements)) return ''
  const slugs = new Set<string>()
  const types: Record<string, string> = {
    time: 'digital', hourHand: 'analog', minuteHand: 'analog', secondHand: 'analog',
    date: 'calendar', battery: 'battery', moon: 'moon-phase', weather: 'weather',
    windDirection: 'wind', bluetooth: 'bluetooth', notification: 'notifications',
    alarms: 'alarms', moveBar: 'move-bar', barChart: 'charts', lineChart: 'charts',
    goalBar: 'activity-goals', goalArc: 'activity-goals',
    arcSunEvents: 'sunrise-sunset', curveSunEvents: 'sunrise-sunset', lineSunEvents: 'sunrise-sunset'
  }
  const metrics: [RegExp, string][] = [
    [/^STEPS(?:_|$)/, 'steps'], [/HEART_RATE/, 'heart-rate'], [/^BATTERY(?:_|$)/, 'battery'],
    [/^DATE_/, 'calendar'], [/MOON_PHASE/, 'moon-phase'], [/SUNRISE|SUNSET/, 'sunrise-sunset'],
    [/TEMPERATURE|HUMIDITY|PRECIPITATION|WEATHER/, 'weather'],
    [/TEMPERATURE/, 'temperature'], [/^WIND_/, 'wind'], [/^CALORIES$/, 'calories'],
    [/^DISTANCE$/, 'distance'], [/^FLOORS_/, 'floors'], [/^BODY_BATTERY$/, 'body-battery'],
    [/^STRESS/, 'stress'], [/^PULSE_OX$/, 'blood-oxygen'], [/^ALTITUDE$/, 'altitude'],
    [/^AQI/, 'air-quality'], [/^LUNAR_/, 'lunar-calendar'], [/^NOTIFICATIONS$/, 'notifications'],
    [/^ALARMS$/, 'alarms'], [/^MOVE_BAR_LEVEL$/, 'move-bar']
  ]
  for (const element of elements) {
    if (!element || typeof element !== 'object') continue
    const type = element.eleType ?? element.type
    if (types[type]) slugs.add(types[type])
    const binding = element.goalProperty || element.dataProperty
    const property = binding ? properties?.[binding] : undefined
    const selected = property?.value
    const symbol = binding
      ? property?.options?.find((option) => option.value === selected)?.metricSymbol
        ?? (typeof selected === 'number'
          ? Object.values(dataOptions ?? {}).find((option) => option.valueCode === selected)?.metricSymbol
          : selected)
      : element.metricSymbol
    if (typeof symbol !== 'string') continue
    const metric = symbol.replace(/^:/, '').replace(/^FIELD_TYPE_/, '')
    for (const [pattern, slug] of metrics) if (pattern.test(metric)) slugs.add(slug)
  }
  if (slugs.has('analog') && slugs.has('digital')) slugs.add('hybrid')
  return [...slugs].map((slug) => slug.replace(/-/g, ' ')).join(', ')
}
