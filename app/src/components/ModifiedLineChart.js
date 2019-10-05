import React from 'react'
import { Spring } from 'react-spring'
import { LineChart, unselectable } from '@aragon/ui'

const LABELS_HEIGHT = 30

class ModifiedLineChart extends LineChart {
  render() {
    const {
      width,
      height,
      borderColor,
      dotRadius,
      springConfig,
      label,
      reset,
      animDelay,
      color,
      labelColor,
      threshold,
      ...props
    } = this.props

    const lines = this.getLines()

    // the provided values, up to this point
    const valuesCount = this.getValuesCount()

    // the total amount of values
    const totalCount = this.getTotalCount()

    const labels =
      label && totalCount > 0 ? [...Array(totalCount).keys()].map(label) : null

    const chartHeight = height - (labels ? LABELS_HEIGHT : 0)

    const rectangle = (
      <g>
        <rect
          width={width}
          height={chartHeight}
          rx="3"
          ry="3"
          fill="#ffffff"
          strokeWidth="1"
          stroke={borderColor}
        />
      </g>
    )

    return (
      <Spring
        from={{ progress: 0 }}
        to={{ progress: 1 }}
        config={springConfig}
        delay={animDelay}
        reset={reset}
      >
        {({ progress }) => (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            css="display: block"
            {...props}
          >
            <mask id="chart-mask">{rectangle}</mask>
            {rectangle}

            <g mask="url(#chart-mask)">
              {totalCount > 0 && (
                <path
                  d={`
                    ${[...new Array(totalCount - 1)].reduce(
                      (path, _, index) =>
                        `${path} M ${this.getX(index)},${chartHeight} l 0,-8`,
                      ''
                    )}
                  `}
                  stroke={borderColor}
                  strokeWidth="1"
                />
              )}
              {lines.map((line, lineIndex) => (
                <g key={`line-plot-${line.id || lineIndex}`}>
                  <path
                    d={`
                            M
                            ${this.getX(0)},
                            ${this.getY(line.values[0], progress, chartHeight)}

                            ${[...line.values]
                              .slice(1)
                              .map(
                                (val, index) =>
                                  `L
                                   ${this.getX((index + 1) * progress)},
                                   ${this.getY(val, progress, chartHeight)}
                                  `
                              )
                              .join('')}
                          `}
                    fill="transparent"
                    stroke={line.color || color(lineIndex, { lines })}
                    strokeWidth="2"
                    strokeDasharray="10 5"
                  />
                  <path
                    d={`
                            M
                            ${this.getX(0)},
                            ${this.getY(line.values[0], progress, chartHeight)}

                            ${[...line.values]
                              .slice(1, line.values.length / 2)
                              .map(
                                (val, index) =>
                                  `L
                                   ${this.getX((index + 1) * progress)},
                                   ${this.getY(val, progress, chartHeight)}
                                  `
                              )
                              .join('')}
                          `}
                    fill="transparent"
                    stroke={line.color || color(lineIndex, { lines })}
                    strokeWidth="2"
                  />
                </g>
              ))}
              <line
                x1={0}
                y1={this.getY(threshold, progress, chartHeight)}
                x2={width}
                y2={this.getY(threshold, progress, chartHeight)}
                stroke="#979797"
                strokeWidth="1"
                strokeDasharray="5 5"
              />
              <line
                x1={this.getX(24) * progress}
                y1="0"
                x2={this.getX(24) * progress}
                y2={chartHeight}
                stroke="#979797"
                strokeWidth="1"
              />
              <line
                x1={this.getX(valuesCount - 1) * progress}
                y1="0"
                x2={this.getX(valuesCount - 1) * progress}
                y2={chartHeight}
                stroke="#DAEAEF"
                strokeWidth="3"
              />
            </g>
            {labels && (
              <g transform={`translate(0,${chartHeight})`}>
                {labels.map(
                  (label, index) =>
                    (index % 5) + 1 === 5 &&
                    index < labels.length - 1 && (
                      <text
                        key={index}
                        x={this.getX(index)}
                        y={LABELS_HEIGHT / 2}
                        textAnchor={this.getLabelPosition(index, labels.length)}
                        fill={labelColor}
                        css={`
                          alignment-baseline: middle;
                          font-size: 12px;
                          font-weight: 300;
                          ${unselectable};
                        `}
                      >
                        {label}
                      </text>
                    )
                )}
              </g>
            )}
          </svg>
        )}
      </Spring>
    )
  }
}

export default ModifiedLineChart
