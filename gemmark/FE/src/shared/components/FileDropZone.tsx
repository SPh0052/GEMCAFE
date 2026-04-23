import { UploadCloud } from 'lucide-react'

interface Props {
  accept?: string
  maxSizeHint?: string
  formatHint?: string
  buttonLabel?: string
  title?: string
}

export default function FileDropZone({
  maxSizeHint = '최대 파일 크기 5MB',
  formatHint = 'MP4, MOV 포맷 지원',
  buttonLabel = '파일 선택하기',
  title = '파일을 이곳에 끌어다 놓거나 클릭하여 선택하세요',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <UploadCloud className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-400">
        {formatHint} · {maxSizeHint}
      </p>
      <button
        type="button"
        className="mt-5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
