import { useRef } from 'react'
import { UploadCloud } from 'lucide-react'

interface Props {
  accept?: string
  maxSizeHint?: string
  formatHint?: string
  buttonLabel?: string
  title?: string
  onSelectFile?: (file: File) => void
  disabled?: boolean
}

export default function FileDropZone({
  accept = 'video/*',
  maxSizeHint = '최대 파일 크기 5MB',
  formatHint = 'MP4, MOV 포맷 지원',
  buttonLabel = '파일 선택하기',
  title = '파일을 이곳에 끌어다 놓거나 클릭하여 선택하세요',
  onSelectFile,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onSelectFile) onSelectFile(file)
    // 같은 파일 다시 선택해도 onChange 트리거되도록 초기화
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-14 text-center">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <UploadCloud className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-400">
        {formatHint} · {maxSizeHint}
      </p>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="mt-5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
