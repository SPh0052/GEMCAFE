/**
 * 입력값 검증 헬퍼.
 *
 * 각 함수는 검증을 통과하면 `null`, 실패하면 사용자에게 보여줄 한글 에러 메시지(string)를 반환.
 *
 * 사용 예:
 *   const err = validatePassword(value)
 *   if (err) { setError(err); return }
 */

const HANGUL_REGEX = /[가-힣ㄱ-ㅎㅏ-ㅣ]/
const WHITESPACE_REGEX = /\s/
// 비밀번호용 특수문자 (이스케이프 주의)
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/

/**
 * 이메일 검증.
 * - 한글 / 공백 불가
 * - 최소 12자 이상
 * - 표준 이메일 형식 (local@domain.tld)
 */
export function validateEmail(value: string): string | null {
  const v = value.trim()
  if (!v) return '이메일을 입력해주세요.'
  if (HANGUL_REGEX.test(v)) return '이메일에 한글은 사용할 수 없습니다.'
  if (WHITESPACE_REGEX.test(v)) return '이메일에 공백은 사용할 수 없습니다.'
  if (v.length < 12) return '이메일은 12자 이상이어야 합니다.'
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v))
    return '올바른 이메일 형식이 아닙니다.'
  return null
}

/**
 * 비밀번호 검증.
 * - 한글 / 공백 불가
 * - 최소 12자 이상
 * - 대문자 / 소문자 / 특수문자 각 1개 이상 포함
 */
export function validatePassword(value: string): string | null {
  if (!value) return '비밀번호를 입력해주세요.'
  if (HANGUL_REGEX.test(value)) return '비밀번호에 한글은 사용할 수 없습니다.'
  if (WHITESPACE_REGEX.test(value))
    return '비밀번호에 공백은 사용할 수 없습니다.'
  if (value.length < 12) return '비밀번호는 12자 이상이어야 합니다.'
  if (!/[a-z]/.test(value))
    return '비밀번호에 영문 소문자가 1자 이상 포함되어야 합니다.'
  if (!/[A-Z]/.test(value))
    return '비밀번호에 영문 대문자가 1자 이상 포함되어야 합니다.'
  if (!SPECIAL_CHAR_REGEX.test(value))
    return '비밀번호에 특수문자가 1자 이상 포함되어야 합니다.'
  return null
}

/**
 * 이름 검증 (회원가입).
 * - 비어 있으면 안됨
 * - 한글 / 영문 / 공백만 허용 (특수문자, 숫자 불가)
 * - 2~30자
 */
export function validateName(value: string): string | null {
  const v = value.trim()
  if (!v) return '이름을 입력해주세요.'
  if (v.length < 2) return '이름은 2자 이상이어야 합니다.'
  if (v.length > 30) return '이름은 30자 이내로 입력해주세요.'
  if (!/^[가-힣a-zA-Z\s]+$/.test(v))
    return '이름에는 한글 또는 영문만 사용 가능합니다.'
  return null
}

/**
 * 전화번호 검증 (한국 휴대폰).
 * - 숫자 / 하이픈만 허용
 * - 010, 011, 016, 017, 018, 019 로 시작
 * - 하이픈 제외 10~11자리
 */
export function validatePhone(value: string): string | null {
  const v = value.trim()
  if (!v) return '전화번호를 입력해주세요.'
  if (!/^[\d-]+$/.test(v))
    return '전화번호는 숫자와 하이픈(-)만 입력 가능합니다.'
  const digits = v.replace(/-/g, '')
  if (!/^01[0-9]\d{7,8}$/.test(digits))
    return '올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)'
  return null
}
