/**
 * BE가 준비되기 전 임시 "사용자 DB" 역할을 하는 localStorage 레지스트리.
 *
 * 구글 로그인 후 sub 값을 키로 가입 정보를 저장. 처음 보는 sub 면 신규 회원,
 * 이미 등록된 sub 면 기존 회원으로 판단.
 *
 * BE가 붙으면 이 모듈 통째로 삭제하고, /auth/google 응답에 isNewUser /
 * profile 정보를 같이 받아 분기하면 됨.
 */

const REGISTRY_KEY = 'gemcafe-known-users'

export interface RegisteredProfile {
  phone: string
}

type RegistryMap = Record<string, RegisteredProfile>

function loadRegistry(): RegistryMap {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    return raw ? (JSON.parse(raw) as RegistryMap) : {}
  } catch {
    return {}
  }
}

function saveRegistry(map: RegistryMap) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(map))
}

export function findUserBySub(sub: string): RegisteredProfile | null {
  const map = loadRegistry()
  return map[sub] ?? null
}

export function registerUser(sub: string, profile: RegisteredProfile) {
  const map = loadRegistry()
  map[sub] = profile
  saveRegistry(map)
}
