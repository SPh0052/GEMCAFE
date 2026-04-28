import Card from '@/shared/components/Card'

export interface ExtractedField {
  name: string
  value: string
  ok: boolean
}

const defaultFields: ExtractedField[] = [
  {
    name: 'UUID',
    value: '550e8400-e29b-41d4-a716-446655440000',
    ok: true,
  },
  { name: 'Business ID', value: 'AMBER_GLOBAL_01', ok: true },
  { name: 'Generation Model', value: 'Flux-D-Watermark-V2', ok: true },
  { name: 'Timestamp', value: '2024-05-20 14:32:05 UTC', ok: true },
  { name: 'User ID', value: 'usr_9488210', ok: true },
  { name: 'Version', value: 'v1.4.2-stable', ok: true },
]

interface Props {
  fields?: ExtractedField[]
}

export default function ExtractedWatermarkCard({
  fields = defaultFields,
}: Props) {
  return (
    <Card className="p-0">
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-base font-bold text-gray-900">검출된 워터마크</h3>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-medium tracking-wide text-gray-500">
            <th className="px-6 py-3 font-medium">FIELD NAME</th>
            <th className="px-6 py-3 font-medium">EXTRACTED VALUE</th>
            <th className="px-6 py-3 font-medium">STATUS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {fields.map((row) => (
            <tr key={row.name}>
              <td className="px-6 py-4 text-gray-700">{row.name}</td>
              <td className="px-6 py-4">
                <span className="font-mono text-xs text-brand-500">
                  {row.value}
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    row.ok ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
