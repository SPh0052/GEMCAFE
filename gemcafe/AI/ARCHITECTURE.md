# Gemcafe AI Service — 내부 아키텍처

> 이 문서는 **AI 코드를 직접 수정할 때 어디를 봐야 하는지** 한눈에 파악하기 위한 내부 개발자용 문서입니다.<br/>
> 외부 통합(BE/FE)에 대한 설명은 [README.md](./README.md) 참조.<br/>
> Mermaid Diagram 이므로 → Extensions → "Markdown Preview Mermaid Support" 설치할 것

---

## 1. 파일 호출 관계 (Call Graph)

```mermaid
flowchart LR
    %% 진입점
    api[api.py<br/>FastAPI<br/>endpoints]:::entry
    pipeline[pipeline.py<br/>풀 파이프라인<br/>디버깅용]:::entry

    %% 모듈
    analyze[analyze.py<br/>케이크 분석]:::core
    gen_kf[generate_keyframe.py<br/>키프레임 생성]:::core
    gen_vid[generate_video.py<br/>영상 생성]:::core
    pb[prompt_builder.py<br/>프롬프트 빌드]:::core
    pl[prompt_locks.py<br/>잠금 라이브러리]:::data
    llm[llm_client.py<br/>Gemini 래퍼]:::core

    %% 외부 서비스
    moondream(((Moondream3))):::ext
    nb(((nano-banana-pro/edit))):::ext
    veo(((Veo 3.1))):::ext
    gemini(((Gemini 3.1 Flash-Lite))):::ext

    %% api.py가 부르는 것
    api --> analyze
    api --> gen_kf
    api --> gen_vid
    api --> pb

    %% pipeline.py가 부르는 것
    pipeline --> gen_kf
    pipeline --> gen_vid

    %% 모듈 간 의존
    gen_kf --> pb
    pb --> pl
    pb --> llm

    %% 외부 호출
    analyze -->|fal-client| moondream
    gen_kf -->|fal-client| nb
    gen_vid -->|fal-client| veo
    llm -->|google-genai| gemini

    %% 스타일
    classDef entry fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef core fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef data fill:#fff9c4,stroke:#f57f17,stroke-width:2px,color:#000
    classDef ext fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
```

**범례:**
- 🟥 분홍 = 진입점 (사용자/BE가 호출하는 곳)
- 🟦 파랑 = 핵심 로직 모듈
- 🟨 노랑 = 데이터/잠금 라이브러리 (값만 들어있음)
- 🟪 보라 = 외부 AI 서비스

---

## 2. `/preview-prompts` 엔드포인트 호출 순서

사장님이 옵션 선택 후 한국어 미리보기 받는 흐름.

```mermaid
sequenceDiagram
    participant FE
    participant BE as BE (Spring)
    participant API as api.py
    participant PB as prompt_builder.py
    participant PL as prompt_locks.py
    participant LLM as llm_client.py
    participant G as Gemini Flash-Lite

    FE->>BE: 옵션 선택<br/>(simulation, focus, bg, hint)
    BE->>API: POST /preview-prompts<br/>{...옵션, analysis}

    API->>PB: build_korean_preview(simulation, focus, bg, hint, analysis)

    PB->>PL: collect_elements_from_analysis(analysis)
    PL-->>PB: ["whipped_cream", "sponge", "strawberry"]

    PB->>PL: get_texture_guidance(elements, simulation)
    PL-->>PB: "- 생크림: 부드럽게 갈라짐<br/>- 스펀지: 부스러기..."

    PB->>LLM: generate_korean_preview(<br/>dessert, focus, sim, bg, hint, texture_guidance)
    LLM->>G: system_prompt + 슬롯
    G-->>LLM: 한국어 묘사 (2~3문장)
    LLM-->>PB: 한국어 텍스트

    PB-->>API: 한국어 텍스트
    API-->>BE: { korean_preview: "..." }
    BE-->>FE: 사장님 화면에<br/>편집 가능한 textarea로 표시
```

---

## 3. `/video` 엔드포인트 호출 순서 (한국어 모드)

사장님이 한국어 편집 후 영상 생성 트리거.

```mermaid
sequenceDiagram
    participant FE
    participant BE as BE (Spring)
    participant API as api.py
    participant PB as prompt_builder.py
    participant PL as prompt_locks.py
    participant LLM as llm_client.py
    participant GV as generate_video.py
    participant G as Gemini Flash-Lite
    participant Veo as fal.ai Veo 3.1

    FE->>BE: 사장님 한국어 편집 완료
    BE->>API: POST /video<br/>{start_url, end_url,<br/>video_prompt_kr, simulation,<br/>background, model_id}

    API->>PB: assemble_final_video_prompt(<br/>한국어, simulation, bg, model)

    PB->>LLM: translate_to_video_prompt(한국어)
    LLM->>G: system_prompt #2 + 한국어
    G-->>LLM: 영어 영상 프롬프트
    LLM-->>PB: 영어 텍스트<br/>(사장님 부분만)

    PB->>PL: get_camera(simulation)
    PL-->>PB: 카메라 디렉티브
    PB->>PL: get_mood_lighting(background)
    PL-->>PB: 배경 묘사
    PB->>PL: TECHNICAL_BASELINE +<br/>get_model_extras(model_id)
    PL-->>PB: 기술 키워드
    PB->>PL: get_negative_prompt(simulation)
    PL-->>PB: 부정 프롬프트
    PB->>PL: get_duration(simulation)
    PL-->>PB: "6s"

    PB-->>API: { prompt, negative_prompt, duration }

    API->>GV: generate_video(start, end,<br/>prompt, negative, duration)
    GV->>Veo: fal_client.subscribe(...)
    Note over Veo: 1~3분 처리
    Veo-->>GV: video_url
    GV-->>API: { video_url, save_dir }

    API-->>BE: { video_url,<br/>final_prompt_used, ... }
    BE-->>FE: 영상 URL
```

---

## 4. 데이터 변환 — 입력에서 출력까지

```mermaid
flowchart TD
    Start([케이크 사진 1장]):::input

    Start --> A[STEP 2 - analyze.py<br/>Moondream3]
    A --> A_OUT[/analysis.json<br/>cake_type, creams,<br/>toppings, suggested_focus/]:::data

    A_OUT --> S3[STEP 3-6 - 사용자 선택<br/>simulation, focus,<br/>background, hint]:::user
    S3 --> P1[Phase 1 - prompt_builder<br/>build_korean_preview]
    P1 --> P1_OUT[/한국어 미리보기/]:::data

    P1_OUT --> EDIT[사장님이 한국어 편집<br/>또는 그대로 사용]:::user
    EDIT --> P2[Phase 2 - prompt_builder<br/>assemble_final_video_prompt]
    P2 --> P2_OUT[/영어 영상 프롬프트<br/>+ negative_prompt<br/>+ duration/]:::data

    %% 평행 흐름: 키프레임 생성
    A_OUT --> S7[STEP 7 - generate_keyframe<br/>nano-banana-pro/edit]
    S3 --> S7
    S7 --> KF[/키프레임 이미지<br/>+ frame_strategy/]:::data

    KF --> S8[STEP 8 - generate_video<br/>Veo 3.1 first-last-frame]
    P2_OUT --> S8
    S8 --> END([영상 mp4]):::output

    classDef input fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef output fill:#ffccbc,stroke:#d84315,color:#000
    classDef data fill:#fff9c4,stroke:#f57f17,color:#000
    classDef user fill:#e1bee7,stroke:#6a1b9a,color:#000
```

---

## 5. 파일별 책임 한 줄 요약

| 파일 | 무엇을 함 | 누가 호출 | 무엇을 호출 |
|---|---|---|---|
| **api.py** | FastAPI 엔드포인트 4종 | BE | analyze, generate_keyframe, generate_video, prompt_builder |
| **analyze.py** | Moondream3로 케이크 분석 | api / 단독 | fal.ai (Moondream) |
| **generate_keyframe.py** | 키프레임 1장 생성 | api / pipeline / 단독 | prompt_builder, fal.ai (nano-banana-pro/edit) |
| **generate_video.py** | Veo로 영상 생성 | api / pipeline / 단독 | fal.ai (Veo) |
| **prompt_builder.py** | 모든 프롬프트 빌드/조립 | api / generate_keyframe | prompt_locks, llm_client |
| **prompt_locks.py** | 카메라/기술/질감/부정 잠금 데이터 | prompt_builder | (없음, 데이터만) |
| **llm_client.py** | Gemini 호출 (한↔영, 미리보기) | prompt_builder / 단독 | Google Gemini API |
| **pipeline.py** | 전체를 한 번에 (디버깅용) | 단독 (CLI) | generate_keyframe, generate_video |

---

## 다음에 추가될 다이어그램 (예고)

이 파일은 일단 호출 관계만 담았어요. 다음 단계로 추가할 예정:

- 📊 파일별 함수/변수 상세 표
- 🛠 "새 시뮬레이션 추가하려면 어디 수정?" 체크리스트
- 🔄 데이터 형식 변환 표 (snake_case → 한국어 라벨 등)

필요하시면 알려주세요.
