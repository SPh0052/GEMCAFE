# Gemcafe AI Service

카페 사장님이 케이크 사진 1장을 올리면 **AI가 자동으로 5~6초짜리 광고 영상**을 만들어주는 서비스의 AI 파트입니다.

```
[케이크 사진]
   ↓  Moondream3 분석
   ↓  Gemini 한국어 미리보기 (사장님 편집 가능)
   ↓  Gemini 한→영 번역 + 잠금 라이브러리 결합
   ↓  nano-banana-pro/edit  (I2I 키프레임)
   ↓  Veo 3.1 first-last-frame (I2V)
[output.mp4]
```
</br>

## 📑 목차

- [빠른 시작](#-빠른-시작)
- [폴더 구조](#-폴더-구조)
- [AI 파이프라인](#-ai-파이프라인)
- [사용 방법](#-사용-방법)
- [API 엔드포인트 (BE 통합용)](#-api-엔드포인트-be-통합용)
- [FE / BE / AI 상호작용](#-fe--be--ai-상호작용)
- [사용 모델 & 비용](#-사용-모델--비용)

---

## 🚀 빠른 시작

### 1. 사전 요구사항
- Python 3.10 이상 (3.12 권장; 3.14는 일부 라이브러리 미호환 가능)
- [fal.ai](https://fal.ai) 계정 + API Key (`FAL_KEY`)
- SSAFY GMS 발급키 (`GMS_KEY`) — Gemini 2.5 Flash-Lite 호출용 게이트웨이
- (Windows) Git Bash 또는 PowerShell

`.env` 파일에 두 키 모두 등록:
```
FAL_KEY=fal_xxxxxxxxxxxxx
GMS_KEY=...
```

### 2. 설치

```bash
cd gemcafe/AI

# 가상환경 (권장)
python -m venv venv
source venv/Scripts/activate    # Git Bash (Windows)
# 또는: venv\Scripts\activate   # PowerShell
# 또는: source venv/bin/activate # macOS/Linux

# 의존성
pip install -r requirements.txt
```

### 3. 빠른 동작 확인 (Setup 검증)

본 단계는 **API 키 등록이 잘 됐는지** 빠르게 확인하는 용도입니다 (~1분, ~$0.005).
실제 영상 생성은 아래 [사용 방법](#-사용-방법) 섹션 참고.

```bash
# 테스트 이미지 준비: gemcafe/AI/test_cake.jpg 위치에 케이크 사진 1장 두기

# ① fal.ai 키 검증 — Moondream3로 케이크 분석 (~15초, ~$0.005)
python analyze.py
# → outputs/analyze_<ts>/analysis.json 생성되면 FAL_KEY 정상

# ② GMS 키 검증 — LLM 한국어 미리보기 + 한→영 번역 (~5초, 크레딧 소량)
python llm_client.py
# → 한국어 묘사 + 영어 번역이 콘솔에 출력되면 GMS_KEY 정상
```

둘 다 성공하면 **API 키 setup 완료**. 이제 실제 영상 만들러 가시면 됩니다.

---

## 📁 폴더 구조

```
gemcafe/AI/
├── analyze.py              # STEP 2: 케이크 이미지 분석 (Moondream3)
├── llm_client.py           # ⭐ Gemini 2.5 Flash-Lite 래퍼 (GMS 게이트웨이 경유)
├── prompt_locks.py         # ⭐ 잠금 라이브러리 (카메라/기술/질감/부정/배경)
├── prompt_builder.py       # 프롬프트 템플릿 + 빌더 (LLM Phase 1/2 통합)
├── generate_keyframe.py    # STEP 7: 키프레임 생성 (재호출 가능, 검수용)
├── generate_video.py       # STEP 8: 영상 생성 (Veo 3.1)
├── pipeline.py             # 풀 파이프라인 (디버깅/데모용 — 위 둘 묶음)
├── api.py                  # FastAPI 래퍼 (BE 통합용 HTTP 서버)
│
├── requirements.txt        # Python 의존성
├── .env                    # API 키 (FAL_KEY + GMS_KEY, 깃 안 올라감)
├── .gitignore
├── README.md               # 이 파일 (외부 통합용)
├── ARCHITECTURE.md         # 시스템 구조 다이어그램 (내부 개발용)
├── DEVELOPER.md            # 함수/변수 레퍼런스 + 체크리스트 (내부 개발용)
│
├── test_cake.jpg           # (직접 두기) 테스트용 케이크 이미지
│
├── outputs/                # 실행 결과물 (자동 생성, 깃 안 올라감)
│   ├── analyze_<ts>/
│   │   └── analysis.json
│   ├── keyframe_<ts>_.../
│   │   ├── 1_input.jpg
│   │   ├── 2_background.jpg     (배경 교체 시만)
│   │   ├── 3_keyframe.jpg
│   │   └── metadata.json
│   ├── video_<ts>/
│   │   ├── 4_video.mp4
│   │   └── metadata.json
│   └── pipeline_<ts>_<sim>/      (풀 파이프라인 시 결과물 통합)
│
└── uploads/                # API 서버용 임시 업로드 폴더 (자동 생성)
```

> ⭐ 표시 = 오토 프롬프팅(LLM) 도입으로 새로 추가된 파일.

---

## 🔄 AI 파이프라인

### 한눈에 보는 흐름

```
[입력] 케이크 사진 1장
   │
   ▼
[STEP 2] Moondream3 분석
   │     → cake_type, creams, toppings, suggested_focus 등 추출
   │
   ▼
[사용자 선택 — UI 영역]
   • simulation:  cross_section_cut / lift_slice / topping_fall
   • focus:       strawberry / whipped_cream / sponge_layers ...
   • background:  white_marble / cafe_interior / outdoor / null(원본)
   • hint:        "고급스럽게" 같은 자유 텍스트 (선택)
   │
   ▼
[STEP 6.5] ⭐ LLM Phase 1 — 한국어 미리보기 자동 생성 (Gemini)
   │     • prompt_locks.TEXTURE_PROFILES에서 요소별 질감 가이드 합성
   │     • Gemini가 자연스러운 한국어 묘사 2~3문장 생성
   │     • 사장님 화면에 textarea로 표시 → 자유 편집 가능
   │     → "흰 대리석 위 딸기 쇼트케이크. 칼이 위에서 수직으로..."
   │
   ▼
[STEP 7] 키프레임 생성 (nano-banana-pro/edit, I2I)
   │     ① (선택) 배경 교체 — 케이크는 보존, 배경만 swap
   │     ② 시뮬레이션 적용 — 자르기/들어올리기/토핑 등
   │     → keyframe.jpg
   │     ★ 사용자가 검수 후 만족스러우면 다음, 아니면 재생성 (최대 3회)
   │
   ▼
[STEP 7.5] ⭐ LLM Phase 2 — 한→영 번역 + 잠금 결합 (Gemini)
   │     • Gemini가 사장님 한국어 → 영상 모델용 영어 프롬프트로 의역
   │     • prompt_locks에서 자동 결합:
   │       - 카메라 디렉티브 (시뮬레이션별)
   │       - 기술 키워드 (4K, ASMR, slow motion 등 공통)
   │       - 모델별 키워드 (Veo/Kling/Hailuo 별)
   │       - 부정 프롬프트 (실패 케이스 차단)
   │       - 배경 묘사 (mood lighting)
   │     → 최종 영어 프롬프트
   │
   ▼
[STEP 8] 영상 생성 (Veo 3.1 first-last-frame, I2V)
   │     입력: start_frame + end_frame + 최종 영어 프롬프트
   │     → 5~6초 영상
   │
   ▼
[결과] output.mp4
```

### 시뮬레이션별 frame_strategy

키프레임이 영상의 **첫 프레임**인지 **끝 프레임**인지가 시뮬레이션마다 달라요.

| 시뮬레이션 | I2I 결과는 | start_frame | end_frame |
|---|---|---|---|
| `cross_section_cut` (단면 자르기) | end | 원본/배경교체본 | I2I 결과 |
| `lift_slice` (한 조각 들어올리기) | end | 원본/배경교체본 | I2I 결과 |
| `topping_fall` (토핑 떨어지기) | start (역방향) | I2I 결과 | 원본/배경교체본 |

→ 이건 `frame_strategy` 필드로 응답에 포함됨. BE/호출자가 보고 분기.

---

## 📖 사용 방법

각 스크립트는 단독 실행 가능합니다. 상단의 상수(`SIMULATION`, `FOCUS`, `BACKGROUND` 등)를 직접 수정해서 다양한 조합을 테스트할 수 있어요.

### 방법 1: 검수 흐름 (실서비스와 동일, 권장)

키프레임을 미리 확인하고 마음에 들 때만 비싼 영상 생성으로 넘어가는 패턴.

```bash
# ① 케이크 분석 (Moondream3, ~$0.005)
python analyze.py
# → outputs/analyze_<ts>/analysis.json — suggested_focus 후보 확인

# ② 키프레임 생성 — 마음에 들 때까지 반복 (nano-banana-pro/edit, ~$0.04~0.08)
python generate_keyframe.py
# → outputs/keyframe_<ts>_<sim>_<focus>/3_keyframe.jpg
# → 다른 SEED로 다시 실행하면 다른 결과 (재생성 = 검수 흐름)

# ③ 만족스러우면 영상 생성 (Veo 3.1, ~$1.20)
python generate_video.py
# → 가장 최근 keyframe metadata 자동 로드 → outputs/video_<ts>/4_video.mp4
```

### 방법 2: 풀 파이프라인 한 번에 (디버깅용)

```bash
python pipeline.py
# → 분석/검수 단계 건너뛰고 키프레임 + 영상까지 한 번에 (~$1.28)
# → 코드 수정 후 end-to-end 동작 검증할 때만 사용. 실서비스 흐름 X.
```

### 방법 3: LLM 단독 (오토 프롬프팅 튜닝용, 거의 무료)

LLM 출력 품질만 빠르게 점검하고 싶을 때 (Gemini만 호출, fal.ai 호출 X).

```bash
python llm_client.py
# → Phase 1 (한국어 미리보기) + Phase 2 (한→영 번역) + 보너스 (힌트 확장) 출력
# → llm_client.py의 SYSTEM_PROMPT_* 수정 후 결과 확인용
```

> 새 시뮬레이션 추가 / 시스템 프롬프트 튜닝 시 이 명령으로 빠르게 반복 검증 가능.

### 방법 4: HTTP API 서버 (BE 통합 시뮬레이션용)

```bash
uvicorn api:app --reload --port 8000
# → http://localhost:8000/docs 접속해서 Swagger UI로 모든 엔드포인트 테스트
```

---

## 🔌 API 엔드포인트 (BE 통합용)

서버 실행: `uvicorn api:app --port 8000`

| 메서드 | 경로 | 설명 | 입력 | 출력 |
|---|---|---|---|---|
| `GET` | `/health` | **서버 상태 확인 (헬스체크)** — 서비스 살아있는지, FAL_KEY 설정됐는지 | - | `{ status, fal_key_set }` |
| `POST` | `/analyze` | **케이크 이미지 분석** — 강조 요소(focus) 후보, 케이크 종류, 크림/토핑 등 자동 추출. STEP 3 라디오 버튼 옵션 만들 때 사용. | multipart: `image` | 분석 dict (cake_type, suggested_focus 등) |
| `POST` | `/preview-prompts` ⭐ | **한국어 미리보기 (LLM Phase 1)** — 사장님 옵션을 받아 Gemini가 자연스러운 한국어 묘사 2~3문장 생성. AI 호출 비용 거의 0. 사장님이 textarea로 편집 가능. | json: `simulation`, `focus`, `background?`, `hint?`, `dessert_info`, `analysis?` | `{ korean_preview: "..." }` |
| `POST` | `/keyframe` | **키프레임 이미지 생성** — 사용자 선택(simulation/focus/배경)에 맞춘 이미지 1장 생성. 영상의 첫/끝 프레임으로 쓰임. 재생성 시 같은 엔드포인트 다시 호출(`seed` 다르게). | multipart: `image` + form: `simulation`, `focus?`, `background?`, `hint?`, `seed?` | 키프레임 metadata dict |
| `POST` | `/video` ⭐ | **영상 생성 (한국어/영어 모드)** — `video_prompt_kr` 지정 시 LLM Phase 2 자동 변환 + 잠금 라이브러리 결합. `video_prompt`(영어) 직접 지정도 가능. | json: `start_url`, `end_url`, `video_prompt_kr?` 또는 `video_prompt?`, `simulation?`, `background?`, `model_id?` | `{ video_url, save_dir, final_prompt_used, llm_translated_user_part }` |

**상세 명세**: 서버 실행 후 `/docs` 페이지에서 자동 생성된 Swagger UI 확인.

### `/keyframe` 응답 핵심 필드 (BE는 통째로 보관 권장)

```json
{
  "keyframe_url": "https://v3b.fal.media/.../keyframe.png",
  "base_url": "https://v3b.fal.media/.../base.jpg",
  "frame_strategy": "i2i_is_end",
  "video_prompt": "A sharp metal knife descends...",
  "simulation": "cross_section_cut",
  "focus": "fresh_strawberries",
  "background": "white_marble",
  "seed": null,
  ...
}
```

→ `/video` 호출 시 `frame_strategy`에 따라 start/end 결정:
```
i2i_is_end:    start = base_url,     end = keyframe_url
i2i_is_start:  start = keyframe_url, end = base_url
```

---

## 🔗 FE / BE / AI 상호작용

```
═══════════════════════════════════════════════════════════════
                       사용자 (카페 사장님)
═══════════════════════════════════════════════════════════════
                              │
                              ▼
   🎨 FE (React/Vue)
      • 사진 업로드 UI
      • 분석 결과 표시 (suggested_focus → 한국어 라벨)
      • 시뮬레이션/배경 선택 UI
      • 키프레임 검수 UI (재생성 1/3, 2/3, 3/3 누적 표시)
      • 영상 진행 표시 + 재생/다운로드
                              │
                              │ HTTP /api/v1/...
                              ▼
   🏢 BE (Spring Boot)
      • 사용자 인증
      • DB: 영상 메타데이터, 키프레임 후보 보관
      • S3: 영상 파일 저장
      • 비동기 작업 큐 (영상 생성 1~3분 소요)
      • AI 응답 통째로 보관 (keyframe metadata)
                              │
                              │ HTTP /analyze, /preview-prompts, /keyframe, /video
                              ▼
   🤖 AI (FastAPI/Python)  ← 이 폴더
      • Moondream3 (분석)
      • Gemini 2.5 Flash-Lite via SSAFY GMS (한국어 미리보기 + 한→영 번역) ⭐
      • prompt_locks (잠금 라이브러리: 카메라/기술/부정/배경/질감) ⭐
      • nano-banana-pro/edit (배경 교체 + 시뮬레이션)
      • Veo 3.1 first-last-frame (영상)
                              │
                              │ fal-client SDK + google-genai SDK
                              ▼
                       fal.ai + Google AI Studio
```

### 책임 분리

| 작업 | FE | BE | AI |
|---|:---:|:---:|:---:|
| UI/UX, 한국어 라벨 표시 | ✅ | | |
| 한국어 textarea 편집 UI ⭐ | ✅ | | |
| 사용자 인증, 권한 | | ✅ | |
| DB / 영상 메타 관리 | | ✅ | |
| S3 / 파일 저장 | | ✅ | |
| 비동기 작업 큐 | | ✅ | |
| 키프레임 후보 보관 (검수용) | | ✅ | |
| frame_strategy 보고 start/end 결정 | | ✅ | |
| AI 모델 호출 (fal.ai + Gemini) | | | ✅ |
| 프롬프트 빌드 (한국어/영어) ⭐ | | | ✅ |
| 한국어 ↔ 영어 변환 (LLM) ⭐ | | | ✅ |
| 잠금 라이브러리 결합 ⭐ | | | ✅ |

### 통신 흐름 예시 (영상 생성 1건)

```
1.  FE: 사용자가 케이크 사진 업로드
2.  FE → BE: POST /api/v1/videos (image, simulation, focus, ...)
3.  BE → AI: POST /analyze                          (Moondream3)
                ↓ 분석 dict (suggested_focus 등)
4.  FE: 사용자가 focus/시뮬레이션/배경 선택

5.  BE → AI: POST /preview-prompts ⭐                (Gemini Phase 1)
                ↓ { korean_preview: "흰 대리석 위..." }
6.  FE: 사장님 화면에 한국어 묘사 표시 + textarea로 편집 가능

7.  BE → AI: POST /keyframe                         (nano-banana-pro/edit)
                ↓ keyframe metadata                 ← BE가 DB에 보관
8.  FE: 키프레임 표시
    사용자 "재생성" 클릭 → 7번 반복 (seed 다르게, 최대 3회)
9.  사용자가 키프레임 후보 선택 + 한국어 묘사 최종 확정

10. FE → BE: 선택값 전송 (keyframe candidateId, 편집된 한국어)
11. BE → AI: POST /video ⭐                          (Gemini Phase 2 + Veo 3.1)
                ↓ AI 내부에서:
                ↓   - 한국어 → 영어 LLM 번역
                ↓   - 잠금 라이브러리 결합 (카메라/기술/부정 등)
                ↓   - Veo 호출
                ↓ video_url (백그라운드, BE에 즉시 videoId 반환)
12. BE: S3에 영상 저장, DB status=completed
13. FE: 폴링으로 status 확인 → 완료 시 영상 재생
```

---

## 💸 사용 모델 & 비용

| 단계 | 모델 | 비용/회 |
|---|---|---|
| 분석 | `fal-ai/moondream3-preview/query` (fal.ai) | ~$0.005 |
| LLM Phase 1 (한국어 미리보기) ⭐ | `gemini-2.5-flash-lite` (SSAFY GMS) | 크레딧 소량 (input 0.001 / output 0.004 per token) |
| LLM Phase 2 (한→영 번역) ⭐ | `gemini-2.5-flash-lite` (SSAFY GMS) | 크레딧 소량 (input 0.001 / output 0.004 per token) |
| I2I (배경 교체) | `fal-ai/nano-banana-pro/edit` (fal.ai) | ~$0.04 |
| I2I (시뮬레이션) | `fal-ai/nano-banana-pro/edit` (fal.ai) | ~$0.04 |
| I2V (영상) | `fal-ai/veo3.1/first-last-frame-to-video` (fal.ai) | ~$1.20 (6s/720p) |

**1회 풀 파이프라인 (배경 교체 + 키프레임 1번 + 영상 + LLM 2회)**: 약 **$1.285**

LLM 비용은 거의 무시할 수준 (전체의 0.01%). 키프레임 검수 재생성 시 매 회 추가 ~$0.04. **영상 생성 전에 키프레임 검수하는 패턴이 비용 효율적**.

---
