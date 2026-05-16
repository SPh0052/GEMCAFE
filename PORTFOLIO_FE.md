# 젬마크 / 젬카페 — FE 포트폴리오 보고서

> SSAFY 자율 프로젝트 (S14P31S307) FE 작업 정리

---

## 1. 프로젝트 개요

하나의 모노레포에 **B2C 모바일 PWA (젬카페)** 와 **B2B 관리자 대시보드 (젬마크)** 두 개의 React 앱을 함께 개발한 프로젝트.

| 앱 | 형태 | 사용자 | 핵심 가치 |
| --- | --- | --- | --- |
| **젬카페 (gemcafe)** | 모바일 우선 PWA | 카페 사장님 | 메뉴 사진 한 장으로 SNS 용 AI 영상 자동 생성 |
| **젬마크 (gemmark)** | 데스크톱 어드민 | 운영자 / 보안 담당 | 영상 워터마크 삽입·검출·강건성(robustness) 평가 |

두 앱은 같은 BE 도메인을 공유하지만 라우팅 prefix (`/dev/gemcafe/`, `/dev/gemmark/`) 와 빌드 산출물이 분리되어 있어 독립 배포가 가능하다.

---

## 2. 기술 스택

### 공통
- **React 19.2** + **TypeScript 6.0** (strict 모드, `verbatimModuleSyntax`)
- **Vite 8** (HMR · 환경별 base path · 프록시)
- **Tailwind CSS 4** (`@theme` CSS 변수 기반 디자인 토큰, JS config 없음)
- **Zustand** (가벼운 전역 스토어, persist to localStorage)
- **Axios** (인터셉터 기반 인증 자동화)
- **React Router v7**
- **Lucide-react** (아이콘)

### 젬카페 전용
- **vite-plugin-pwa** (injectManifest 모드 — 커스텀 Service Worker)
- **Fabric.js 7** (캔버스 텍스트·스티커 합성)
- **Web Audio API + MediaRecorder API** (BGM·원본음·캔버스 합성 → 영상 인코딩)
- **Audius API** (앱 키 없이 사용 가능한 음원 스트리밍 — Jamendo 에서 마이그레이션)
- **EventSource** (SSE 기반 AI 작업 진행률 스트리밍)
- **Google Identity Services SDK** (Google 로그인)

### 젬마크 전용
- **html2canvas-pro + jspdf 4** (대시보드 → PDF 리포트 출력)
- 수제 SVG 차트 (PSNR 히스토그램·강건성 레이더 차트·링 차트)

---

## 3. 담당 기능 (FE 전반)

### 젬카페
- 인증 플로우 (이메일 로그인 / 회원가입 / **Google OAuth** / 휴대폰 미입력 OAuth 사용자 후속 처리)
- **이어서 만들기**: 진행 중 세션 목록 + 세션 상세 복원
- **AI 영상 생성 마법사** (이미지 분석 → focus·simulation·background 선택 → 자동 프롬프트 생성 → 키프레임 3회 시도 → 영상 생성)
- **풀스크린 영상 편집기** (텍스트·스티커·BGM·워터마크 합성 + MediaRecorder 인코딩)
- 내 영상 페이지 (커서 기반 무한 스크롤)
- **워터마크 다운로드 / SNS 공유** (`navigator.share` + 4개 플랫폼별 업로드 모달)
- **PWA**: 설치 프롬프트 · 업데이트 알림 · 작업 완료 푸시 알림 · 알림 클릭 → 해당 페이지 이동

### 젬마크
- 대시보드 (KPI 카드 · PSNR 히스토그램 · 공격 유형 통계 · 최근 활동)
- 워터마크 삽입 / 검출 / 상세 조회 페이지
- 강건성 테스트 (배치 실행 · 비디오별 결과 드릴다운 · 레이더 차트)
- 리포트 생성 (실시간 PDF 미리보기 · XLSX 출력)

---

## 4. 핵심 구현

### 4.1 axios 인터셉터로 토큰 갱신 자동화

**문제**: accessToken 은 짧고 (15분), 만료되면 401 이 떨어진다. 매 API 마다 갱신 로직 수동 호출은 불가.

**해결**: `src/shared/lib/axios.ts`
- **요청 인터셉터**: localStorage 의 accessToken 자동 attach. BE 가 `/api/v1/...` 절대 경로를 응답에 담아 내려주는 경우 prefix 중복 (`/api/v1/api/v1/...`) 방지를 위해 자동 strip.
- **응답 인터셉터**: 401 감지 시 단일 refresh 호출. 동시 발생한 다른 401 들은 **`pendingQueue`** 에 적재했다가 갱신 완료되면 새 토큰으로 일괄 재발사 → 동시 요청 시 refresh 가 N 번 호출되는 race condition 방지.
- **무한 루프 방지**: `_retry` 플래그로 재시도 1 회 제한, refresh 실패 시 localStorage 비우고 `/login` 으로 강제 이동.
- refreshToken 은 **HttpOnly 쿠키** 로 받아서 JS 에서 접근 불가 → XSS 안전. `withCredentials: true` 만 켜두면 브라우저가 자동 전송.

```ts
// 요점만 발췌
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    pendingQueue.push((newToken) => {
      if (!newToken) return reject(error)
      originalRequest.headers.authorization = `Bearer ${newToken}`
      resolve(api(originalRequest))
    })
  })
}
```

### 4.2 SSE 기반 비동기 작업 스트리밍 + PWA 푸시 알림

**문제**: AI 영상 생성·워터마크 삽입은 30 초~수 분이 걸린다. 폴링은 비효율, 사용자가 다른 탭으로 나가도 완료를 알려야 한다.

**해결**:
- `src/shared/lib/jobStream.ts` — `EventSource` 로 `/jobs/{jobId}/stream` 구독, `onProgress` · `onComplete` · `onError` 콜백 노출.
- 완료 시 `notifyOnComplete: true` 면 `showAppNotification()` 자동 호출.
- `src/shared/lib/notify.ts` — Service Worker 가 있으면 `registration.showNotification()` (백그라운드 가능), 없으면 일반 `Notification` 폴백.
- `src/sw.ts` (injectManifest 모드 커스텀 SW) — **notificationclick** 이벤트에서 3 단 폴백:
  1. 같은 URL 의 탭이 이미 열려 있으면 focus
  2. 같은 origin 의 탭이 있으면 해당 탭으로 navigate
  3. 둘 다 없으면 새 창 open
- `SocialUploadModal.tsx` 는 SNS 별 업로드 jobId 를 동시에 구독해 백그라운드에서 완료 통보.

### 4.3 PWA — 설치 프롬프트 + 업데이트 안내

- `vite.config.ts` 의 VitePWA 를 **injectManifest 모드** 로 설정해 SW 직접 작성. `precacheAndRoute()` + 비즈니스 핸들러 공존.
- `PWAUpdatePrompt.tsx` — `useRegisterSW` 훅으로 새 SW 감지 시 토스트 노출, "새로고침" 으로 `updateServiceWorker(true)` 호출.
- `InstallAppBanner.tsx` — `beforeinstallprompt` 이벤트 캡처 (Android Chrome) + iOS Safari 분기 처리 ("공유 → 홈 화면에 추가" 가이드). `display-mode: standalone` 체크로 이미 설치된 경우엔 숨김, `sessionStorage` 로 닫음 상태 기억.
- `globIgnores: ['**/mock/**']` 와 `maximumFileSizeToCacheInBytes: 10MB` 로 precache 폭주 방지.

### 4.4 인증 보호된 미디어 처리 — Blob URL 패턴

**문제**: BE 가 응답에 `/api/v1/files/sessions/32/image` 같은 절대 경로를 내려줌. `<img src>` 에 그대로 박으면 ① Vite dev proxy 안 타고 ② Authorization 헤더 안 가서 401/404.

**해결**: `AuthedImage` · `AuthedVideo` 컴포넌트 + `useAuthedBlobUrl` 훅
- axios 로 `responseType: 'blob'` 받기 → `URL.createObjectURL(blob)` 으로 변환 → `<img src="blob:...">` 으로 렌더.
- axios 인터셉터가 이미 prefix strip + 토큰 자동 첨부 처리 중이라 동일 흐름 재활용 가능.
- 언마운트·src 변경 시 `URL.revokeObjectURL()` 로 메모리 누수 방지.

### 4.5 캔버스 기반 영상 편집기 (`VideoEditor.tsx`, 2.8k 라인)

마법사로 생성된 AI 영상에 워터마크·텍스트·스티커·BGM 을 입혀 SNS 업로드용으로 만드는 풀스크린 에디터.

- **합성 파이프라인**:
  ① 원본 `<video>` 를 매 프레임 `OffscreenCanvas` 에 그림
  ② Fabric.js 캔버스 (텍스트·스티커 레이어) 를 위에 합성
  ③ Web Audio API 로 원본음 + BGM (Audius 스트림) 을 GainNode 로 믹싱
  ④ `canvas.captureStream()` + `audioContext.createMediaStreamDestination()` 합쳐 MediaRecorder 에 투입
- **반응형 정규화**: 디자인 height 960px 기준 좌표계 → 실 디바이스 height 로 스케일.
- **텍스트**: 15 색 팔레트 · 5 크기 · 한글 폰트 6 종 · bold/italic/outline/rotation.
- **스티커**: Twemoji CDN 의 96 개 이모지 (음료·디저트·과일·하트·자연·데코·표정·동물 8 카테고리).
- **BGM**: Audius (앱 키 불필요, 카테고리 + 검색) 음원 재생 + 인코딩에 함께 흘림.

### 4.6 Dev proxy 의 쿠키 재작성

BE 가 내려주는 refreshToken 쿠키의 `Domain=k14s307.p.ssafy.io; Path=/api/v1/auth; Secure; SameSite=Strict` 를 localhost 가 받아들이지 못해 dev 에선 갱신이 실패하던 문제.

```ts
// vite.config.ts (요약)
proxy: {
  '/dev/be': {
    target: 'https://k14s307.p.ssafy.io',
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    cookiePathRewrite: '/',
    configure: (proxy) => {
      proxy.on('proxyRes', (res) => {
        const setCookie = res.headers['set-cookie']
        if (!setCookie) return
        res.headers['set-cookie'] = setCookie.map((c) =>
          c.replace(/;\s*Secure/gi, '')
           .replace(/SameSite=Strict/gi, 'SameSite=Lax'),
        )
      })
    },
  },
},
```

---

## 5. 트러블슈팅

| 이슈 | 원인 | 해결 |
| --- | --- | --- |
| OAuth 신규 가입자 휴대폰 미입력 | Google OAuth 응답엔 phone 없음 | `isNewUser: true` 응답 시 `/signup/phone` 강제 라우팅 + Zustand `setPhone()` |
| `/users/me` 가 403 → refresh 안 됨 | BE 가 만료 토큰에 403 응답 | BE 에 `JwtAuthenticationEntryPoint` 적용 요청해 401 로 통일 (FE 인터셉터는 401 만 트리거) |
| dev 환경에서 refresh 쿠키 안 옴 | localhost 가 `Secure`/`Strict`/`Domain` 거부 | Vite proxy `proxyRes` 훅에서 쿠키 속성 재작성 |
| prod 에서 refresh 쿠키 안 옴 | BE cookie Path=`/api/v1/auth` 가 nginx 노출 경로 `/dev/be/gemcafe/api/v1/auth/refresh` 와 불일치 | BE 팀에 `REFRESH_COOKIE_PATH=/` 환경변수 요청 |
| PWA build 실패 (precache size) | mock 폴더의 5MB 이미지 | `globIgnores: ['**/mock/**']` |
| iOS PWA 푸시 안 옴 | Safari 탭은 미지원, iOS 16.4+ + 홈 화면 설치 필요 | InstallAppBanner 에 iOS 분기 가이드 추가 |
| 세션 복원 시 입력 이미지 404 | `<img src>` 에 절대 경로 직접 박음 | `fetchAuthedImageAsBlobUrl()` 헬퍼 + axios 경유 |
| 다운로드 영상이 모바일에서 검은 화면 | BE 가 `mp4v` 코덱 + ffmpeg `-c:v copy` 사용 (모바일 디코더 미지원) | BE 팀에 `libx264 + yuv420p + baseline` 재인코딩 요청 |

---

## 6. 폴더 구조 (gemcafe)

```
src/
├── features/                # 도메인 단위 슬라이스
│   ├── auth/                # 로그인 · 회원가입 · Google OAuth · 휴대폰 후속 처리
│   ├── intro/               # 비로그인 진입 페이지
│   ├── home/                # 메인 대시보드
│   ├── create-video/        # AI 영상 생성 마법사 (CreateLandingPage, CreateVideoPage, CreatingPage)
│   │   ├── api.ts           # /cakes/analyze · /sessions · /keyframes · /videos
│   │   └── catalog.ts       # 시뮬레이션·배경·요소 SSOT
│   ├── my-videos/           # 내 영상 목록·상세·공유 모달
│   ├── my-page/             # 프로필
│   ├── bgm/                 # Audius 클라이언트 + 카테고리
│   └── debug/               # 영상 서빙 점검
├── components/
│   └── VideoEditor.tsx      # 풀스크린 편집기 (2.8k 라인)
├── layout/                  # AppLayout · AppHeader · BottomNav · SideNav
├── shared/
│   ├── components/          # AuthedImage · AuthedVideo · RequireAuth · Button · TextField · PWAUpdatePrompt · InstallAppBanner
│   ├── lib/                 # axios · notify · jobStream · validation · errors
│   └── hooks/               # useAuthedBlobUrl
├── stores/
│   └── useAuthStore.ts      # 사용자·토큰·젬 잔액 (persist)
├── sw.ts                    # 커스텀 Service Worker
└── App.tsx                  # 라우터
```

---

## 7. 협업 / 컨벤션

- **Git Flow**: `develop/gemcafe` · `develop/gemmark` 두 줄기, 작업 브랜치 `FE/feat/{feature}` → MR 머지.
- **커밋 컨벤션**: `feat:`, `fix:`, `refactor:`, `chore:` prefix.
- **린트**: ESLint flat config + Prettier. `noUnusedLocals` · `noUnusedParameters` 등 strict.
- **API 문서화**: 각 `api.ts` 안의 모든 endpoint 가 JSDoc 으로 BE 엔드포인트·동작 명시 (다른 팀원이 BE 명세 안 보고도 쓸 수 있게).

---

## 8. 배운 점

1. **인터셉터로 횡단 관심사를 묶기**: 토큰 자동 갱신, prefix 정규화 같이 모든 API 가 공유하는 로직을 axios 인터셉터 한 곳에 모아 두니 도메인 코드가 깔끔해졌다. 큐 기반 동시성 처리도 함께 익혔다.
2. **SSE vs 폴링**: 30초~수분짜리 AI 작업에 폴링을 쓰면 서버·클라이언트 모두 손해. EventSource 한 줄로 양방향 스트림 흉내 가능.
3. **PWA 의 OS 별 한계**: Android Chrome 은 `beforeinstallprompt` 가 있고 푸시도 되지만, iOS 는 16.4+ 에서 홈 화면 설치된 PWA 에서만 알림 허용. 이 차이를 코드가 아닌 UI 가이드로 풀어야 했다.
4. **Blob URL 패턴의 비용**: 인증 보호 미디어를 blob URL 로 푸는 건 깔끔하지만 메모리 누수 위험이 있어 `URL.revokeObjectURL()` 을 컴포넌트 lifecycle 에 결속하는 습관이 중요.
5. **dev 와 prod 의 쿠키 갭**: 로컬에서 잘 되던 인증이 운영 도메인에서 깨지는 가장 흔한 원인이 쿠키 속성 (`Domain` / `Path` / `Secure` / `SameSite`). 처음부터 prod 와 똑같이 띄울 수 있게 proxy 를 세팅해 두면 디버깅 시간이 크게 줄어든다.
6. **모노레포의 라우팅 격리**: 한 BE 뒤에 두 FE 앱을 띄우려면 SW scope · manifest start_url · Vite `base` 를 일관되게 prefix 해야 한다. 안 그러면 한 앱이 다른 앱의 캐시·라우트를 가로챈다.

---

_작성자: 엄송현 · 작성일: 2026-05-15_
