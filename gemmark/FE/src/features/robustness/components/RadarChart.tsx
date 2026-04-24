interface Props {
  values: number[]
  labels: string[]
  size?: number
}

export default function RadarChart({ values, labels, size = 240 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 30
  const n = values.length

  const toPoint = (value: number, i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + r * value * Math.cos(angle), cy + r * value * Math.sin(angle)]
  }

  const outerPoints = Array.from({ length: n }, (_, i) => toPoint(1, i))
  const dataPoints = values.map((v, i) => toPoint(v, i))

  const outerStr = outerPoints.map((p) => p.join(',')).join(' ')
  const dataStr = dataPoints.map((p) => p.join(',')).join(' ')

  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
      {rings.map((ring) => {
        const pts = Array.from({ length: n }, (_, i) => toPoint(ring, i))
        return (
          <polygon
            key={ring}
            points={pts.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        )
      })}
      {outerPoints.map(([x, y], i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}
      <polygon
        points={dataStr}
        fill="#FF5A3C"
        fillOpacity={0.3}
        stroke="#FF5A3C"
        strokeWidth={2}
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#FF5A3C" />
      ))}
      {labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const tx = cx + (r + 16) * Math.cos(angle)
        const ty = cy + (r + 16) * Math.sin(angle)
        return (
          <text
            key={i}
            x={tx}
            y={ty}
            fontSize={10}
            fill="#9ca3af"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {label}
          </text>
        )
      })}
      {outerStr ? null : null}
    </svg>
  )
}
