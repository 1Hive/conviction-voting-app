import React from 'react'
import { LineChart } from '@aragon/ui'
import { calcConviction, getTreshold } from '../lib/conviction'

function normalize(lines) {
  const max = Math.max(...lines.flat())
  return lines.map(line => line.map(n => n / max))
}

function Chart({ stakes, requested = 0, funds = 0, supply = 0 }) {
  const entities = [...new Set(stakes.map(({ entity }) => entity))]
  const lines = entities.map(_entity =>
    calcConviction(stakes.filter(({ entity }) => entity === _entity))
  )

  if (lines[0]) {
    // Sum line
    lines.push(lines.reduce((sum, line) => sum.map((s, i) => s + line[i])))
    // Threshold line
    const threshold = getTreshold(requested, funds, supply)
    if (!Number.isNaN(threshold) && threshold !== Number.POSITIVE_INFINITY) {
      lines.push(lines[0].map(i => threshold))
    }
  }

  return (
    <LineChart
      lines={normalize(lines)}
      total={lines[0] && lines[0].length}
      captionsHeight={20}
    />
  )
}

export default Chart
