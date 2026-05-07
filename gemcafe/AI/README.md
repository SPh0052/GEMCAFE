# Gemcafe AI Service

카페 사장님이 케이크 사진 1장을 올리면 **AI가 자동으로 5~6초짜리 광고 영상**을 만들어주는 서비스의 AI 파트입니다.

```
[케이크 사진]  →  [분석]  →  [키프레임 생성]  →  [영상 생성]  →  [output.mp4]
              Moondream3  nano-banana-pro/edit   Veo 3.1
```

---

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
- [fal.ai](https://fal.ai) 계정 + API Key
- (Windows) Git Bash 또는 PowerShell

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

### 3. 빠른 동작 확인

```bash
# 테스트 이미지 준비
# gemcafe/AI/test_cake.jpg 위치에 케이크 사진 1장 두기

# 단계별 실행 (검수 흐름)
python analyze.py             # ① 케이크 분석 (~15초, ~$0.005)
python generate_keyframe.py   # ② 키프레임 생성 (~30초, ~$0.04~0.08)
                              #    → outputs/keyframe_<ts>.../3_keyframe.jpg 확인
                              #    → 마음에 안 들면 그냥 다시 실행 (다른 결과 나옴)
python generate_video.py      # ③ 만족스러우면 영상 생성 (~2분, ~$1.20)
                              #    → 자동으로 가장 최근 키프레임 사용
```

결과는 `outputs/` 폴더에 자동 저장됩니다.

> 한 번에 다 돌리고 싶으면 `python pipeline.py` 사용 (검수 단계 건너뜀).

---

## 📁 폴더 구조

```
gemcafe/AI/
├── analyze.py              # STEP 2: 케이크 이미지 분석 (Moondream3)
├── prompt_builder.py       # 프롬프트 템플릿 + 빌더
├── generate_keyframe.py    # STEP 7: 키프레임 생성 (재호출 가능, 검수용)
├── generate_video.py       # STEP 8: 영상 생성 (Veo 3.1)
├── pipeline.py             # 풀 파이프라인 (디버깅/데모용 — 위 둘 묶음)
├── api.py                  # FastAPI 래퍼 (BE 통합용 HTTP 서버)
│
├── requirements.txt        # Python 의존성
├── .env                    # API 키 (직접 만들기, 깃 안 올라감)
├── .gitignore
├── README.md               # 이 파일
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
[STEP 7] 키프레임 생성 (nano-banana-pro/edit, I2I)
   │     ① (선택) 배경 교체 — 케이크는 보존, 배경만 swap
   │     ② 시뮬레이션 적용 — 자르기/들어올리기/토핑 등
   │     → keyframe.jpg
   │     ★ 사용자가 검수 후 만족스러우면 다음, 아니면 재생성 (최대 3회)
   │
   ▼
[STEP 8] 영상 생성 (Veo 3.1 first-last-frame, I2V)
   │     입력: start_frame + end_frame + video_prompt
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

### 방법 1: 단계별 실행 (개발/디버깅 권장)

각 단계의 결과를 따로 확인할 수 있습니다.

```bash
# ① 케이크 분석
python analyze.py
# → outputs/analyze_<ts>/analysis.json
# → suggested_focus 강조 요소 후보를 확인

# ② 키프레임 생성 (마음에 들 때까지 반복 가능)
python generate_keyframe.py
# → outputs/keyframe_<ts>_<sim>_<focus>/3_keyframe.jpg
# → 결과 확인 후 다른 SEED로 다시 실행하면 다른 키프레임

# ③ 영상 생성
python generate_video.py
# → 가장 최근 keyframe metadata를 자동으로 읽어 영상 생성
# → outputs/video_<ts>/4_video.mp4
```

각 스크립트 상단의 상수(`SIMULATION`, `FOCUS`, `BACKGROUND` 등)를 직접 수정해서 다양한 조합을 테스트할 수 있어요.

### 방법 2: 풀 파이프라인 한 번에

```bash
python pipeline.py
# → 실제 서비스에서는 키프레임 검수가 필요하므로 사용 X.
# → 코드 수정 후 end-to-end 동작 검증할 때만 사용.
```

---

## 🔌 API 엔드포인트 (BE 통합용)

서버 실행: `uvicorn api:app --port 8000`

| 메서드 | 경로 | 설명 | 입력 | 출력 |
|---|---|---|---|---|
| `GET` | `/health` | **서버 상태 확인 (헬스체크)** — 서비스 살아있는지, FAL_KEY 설정됐는지 | - | `{ status, fal_key_set }` |
| `POST` | `/analyze` | **케이크 이미지 분석** — 강조 요소(focus) 후보, 케이크 종류, 크림/토핑 등 자동 추출. STEP 3 라디오 버튼 옵션 만들 때 사용. | multipart: `image` | 분석 dict (cake_type, suggested_focus 등) |
| `POST` | `/keyframe` | **키프레임 이미지 생성** — 사용자 선택(simulation/focus/배경)에 맞춘 이미지 1장 생성. 영상의 첫/끝 프레임으로 쓰임. 재생성 시 같은 엔드포인트 다시 호출(`seed` 다르게). | multipart: `image` + form: `simulation`, `focus?`, `background?`, `hint?`, `seed?` | 키프레임 metadata dict |
| `POST` | `/video` | **영상 생성** — 선택된 키프레임을 start/end 프레임으로 사용해 5~6초 영상 보간. | json: `start_url`, `end_url`, `video_prompt`, `duration?`, `resolution?` | `{ video_url, save_dir }` |

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
                              │ HTTP /analyze, /keyframe, /video
                              ▼
   🤖 AI (FastAPI/Python)  ← 이 폴더
      • Moondream3 (분석)
      • nano-banana-pro/edit (배경 교체 + 시뮬레이션)
      • Veo 3.1 first-last-frame (영상)
                              │
                              │ fal-client SDK
                              ▼
                          fal.ai 모델
```

### 책임 분리

| 작업 | FE | BE | AI |
|---|:---:|:---:|:---:|
| UI/UX, 한국어 라벨 표시 | ✅ | | |
| 사용자 인증, 권한 | | ✅ | |
| DB / 영상 메타 관리 | | ✅ | |
| S3 / 파일 저장 | | ✅ | |
| 비동기 작업 큐 | | ✅ | |
| 키프레임 후보 보관 (검수용) | | ✅ | |
| frame_strategy 보고 start/end 결정 | | ✅ | |
| AI 모델 호출 (fal.ai) | | | ✅ |
| 프롬프트 빌드 (영어) | | | ✅ |

### 통신 흐름 예시 (영상 생성 1건)

```
1. FE: 사용자가 케이크 사진 업로드
2. FE → BE: POST /api/v1/videos (image, simulation, focus, ...)
3. BE → AI: POST /analyze              (Moondream3)
                ↓ 분석 dict
4. BE → AI: POST /keyframe             (nano-banana-pro/edit)
                ↓ keyframe metadata    ← BE가 DB에 보관
5. FE: 키프레임 표시
   사용자 "재생성" 클릭 → 4번 반복 (seed 다르게, 최대 3회)
6. 사용자가 후보 선택
7. FE → BE: 선택된 candidateId 전송
8. BE → AI: POST /video                (Veo 3.1)
   (백그라운드 작업, FE에 즉시 videoId 반환)
                ↓ video_url
9. BE: S3에 영상 저장, DB status=completed
10. FE: 폴링으로 status 확인 → 완료 시 영상 재생
```

---

## 💸 사용 모델 & 비용

| 단계 | 모델 (fal.ai endpoint) | 비용/회 |
|---|---|---|
| 분석 | `fal-ai/moondream3-preview/query` | ~$0.005 |
| I2I (배경 교체) | `fal-ai/nano-banana-pro/edit` | ~$0.04 |
| I2I (시뮬레이션) | `fal-ai/nano-banana-pro/edit` | ~$0.04 |
| I2V (영상) | `fal-ai/veo3.1/first-last-frame-to-video` | ~$1.20 (6s/720p) |

**1회 풀 파이프라인 (배경 교체 + 키프레임 1번 + 영상)**: 약 **$1.28**

키프레임 검수에서 재생성 시 매 회 추가 ~$0.04. 영상 생성 전에 검수하는 패턴이 비용 효율적.

---

## 🔮 앞으로 할 일 (미구현)

- [ ] `/preview-prompts` 엔드포인트 — 사용자가 프롬프트를 한국어로 보고 편집 가능하게
- [ ] 한→영 프롬프트 번역 (Claude API)
- [ ] 단면 사진 추가 업로드 분기 (자르기/들어올리기 정확도 향상)
- [ ] 비동기 작업 큐 도입 (현재는 동기 — 영상 생성 동안 connection hold)
- [ ] BE-AI 사이 인증 (운영 배포 시)
