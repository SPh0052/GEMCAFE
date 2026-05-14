# Gemcafe AI Service — 개발자 레퍼런스

> 코드 수정 시 빠르게 찾아보기 위한 내부 레퍼런스 문서.<br/>
> 시스템 구조/다이어그램은 [ARCHITECTURE.md](./ARCHITECTURE.md) 참조.<br/>
> 외부 통합(BE/FE)에 대한 설명은 [README.md](./README.md) 참조.

## 📑 목차

- [1. 파일별 함수/변수 상세 표](#1-파일별-함수변수-상세-표)
- [2. 데이터 형식 변환 표](#2-데이터-형식-변환-표)
- [3. 새 시뮬레이션 추가 체크리스트](#3-새-시뮬레이션-추가-체크리스트)
- [4. 미연결 / 부분 활용 코드](#4-미연결--부분-활용-코드-dead-code-추적)

---

## 1. 파일별 함수/변수 상세 표

코드 수정할 때 "이 기능 어디 있더라?" 빠르게 찾기 위한 레퍼런스.
전체 구현이 아니라 **주요 함수 + 자주 수정할 상수**만 추림.

### 1.1 [api.py](./api.py)
FastAPI 서버. BE가 HTTP로 호출하는 엔드포인트 4종.

**엔드포인트 함수**
| 함수 | 메서드+경로 | 역할 |
|---|---|---|
| `health` | `GET /health` | 서비스 상태 + FAL_KEY 설정 여부 |
| `analyze_endpoint` | `POST /analyze` | 이미지 분석 (analyze.py 호출) |
| `preview_prompts_endpoint` | `POST /preview-prompts` | 한국어 미리보기 (Phase 1) |
| `keyframe_endpoint` | `POST /keyframe` | 키프레임 생성 (재호출 가능) |
| `video_endpoint` | `POST /video` | 영상 생성 (한국어 모드 / 영어 모드) |

**Pydantic 스키마**
| 이름 | 용도 |
|---|---|
| `HealthResponse` | `/health` 응답 |
| `PreviewPromptsRequest` | `/preview-prompts` 요청 본문 |
| `VideoRequest` | `/video` 요청 본문 (한/영 모드 둘 다) |

---

### 1.2 [analyze.py](./analyze.py)
Moondream3로 케이크 구성요소 분석.

**함수**
| 함수 | 역할 | 반환 |
|---|---|---|
| `upload(path)` | 이미지를 fal.ai에 업로드 | URL 문자열 |
| `analyze_with_moondream(url, prompt)` | Moondream 호출 + JSON 파싱 | `dict` (cake_type, creams 등) |
| `extract_json(text)` | LLM 응답에서 JSON만 추출 | `dict` |

**상수**
| 이름 | 역할 | 수정 빈도 |
|---|---|---|
| `ENDPOINT_MOONDREAM` | fal.ai endpoint ID | 거의 X |
| `INPUT_IMAGE_PATH` | 단독 실행 시 입력 이미지 경로 | 테스트마다 |
| `ANALYSIS_PROMPT` | few-shot 시스템 프롬프트 (예시 3개 포함) | 분석 정확도 튜닝 시 |

---

### 1.3 [generate_keyframe.py](./generate_keyframe.py)
키프레임 1장 생성. 재호출 가능 (검수/재생성 흐름).

**함수**
| 함수 | 역할 | 반환 |
|---|---|---|
| `generate_keyframe(image_path, simulation, focus, background, hint, seed, save_dir)` | **메인 함수** — 1장 생성 | `dict` (keyframe_url, base_url, frame_strategy 등) |
| `load_latest_analysis()` | 가장 최근 analyze 결과 로드 | `dict` |
| `resolve_focus(focus_setting)` | FOCUS=None이면 자동, 문자열이면 그대로 | `(focus_key, analysis_dict)` |
| `call_nano_banana_edit(url, prompt, system_prompt, seed)` | nano-banana-pro/edit 호출 | URL 문자열 |
| `download_file(url, path)` | URL → 로컬 저장 | 저장 경로 |

**상수 (단독 실행용)**
| 이름 | 역할 |
|---|---|
| `ENDPOINT_EDIT` | fal.ai endpoint (`fal-ai/nano-banana-pro/edit`) |
| `INPUT_IMAGE_PATH` | 입력 이미지 |
| `SIMULATION` / `FOCUS` / `BACKGROUND` / `USER_HINT` / `SEED` | 단독 실행 시 옵션값 |

---

### 1.4 [generate_video.py](./generate_video.py)
Veo 3.1로 영상 생성. start/end + prompt 받아서 호출.

**함수**
| 함수 | 역할 | 반환 |
|---|---|---|
| `generate_video(start_url, end_url, video_prompt, save_dir, duration, resolution, generate_audio, negative_prompt)` | **메인 함수** — 영상 1편 생성 | `dict` (video_url, save_dir 등) |
| `load_latest_keyframe_metadata()` | 자동 모드 시 최근 keyframe 메타 로드 | `dict` |
| `resolve_frames_from_metadata(meta)` | metadata에서 start/end URL 결정 | `(start, end, prompt)` |

**상수**
| 이름 | 역할 |
|---|---|
| `ENDPOINT_I2V` | fal.ai endpoint (`fal-ai/veo3.1/first-last-frame-to-video`) |
| `VIDEO_DURATION` | 기본 영상 길이 (`"6s"`) |
| `VIDEO_RESOLUTION` | 기본 해상도 (`"720p"`) |
| `VIDEO_GENERATE_AUDIO` / `VIDEO_NEGATIVE_PROMPT` | 기본값 |

---

### 1.5 [prompt_builder.py](./prompt_builder.py)
프롬프트 조립의 중심. I2I용/I2V용/한국어 미리보기용 각각.

**함수**
| 함수 | 역할 | 반환 |
|---|---|---|
| `build_prompts(simulation, focus, background, hint)` | I2I 키프레임용 프롬프트 빌드 | `dict` (instruction_prompt, video_prompt, frame_strategy 등) |
| `build_background_prompt(background_key)` | 배경 교체용 I2I 프롬프트 | 영어 문자열 |
| `build_korean_preview(simulation, focus, background, hint, dessert_info, cake_elements, analysis)` | **Phase 1** — 한국어 미리보기 (LLM 호출) | 한국어 문자열 |
| `assemble_final_video_prompt(user_korean_text, simulation, background, model_id)` | **Phase 2 + 잠금 결합** — 최종 영어 영상 프롬프트 | `dict` (prompt, negative_prompt, duration) |
| `focus_phrase(focus_key)` | focus 키 → 영어 자연어 | 문자열 |

**상수/데이터**
| 이름 | 역할 |
|---|---|
| `FOCUS_TEXT` | focus 키 → 영어 표현 (색깔 가정 없음) |
| `SIMULATIONS` | 시뮬레이션별 I2I 템플릿 + frame_strategy |
| `SYSTEM_PROMPT` | nano-banana-pro/edit 페르소나 |
| `BACKGROUND_TEXT` | 배경 키 → 영어 묘사 |
| `BACKGROUND_INSTRUCTION_TEMPLATE` | 배경 교체 I2I 지시문 템플릿 |

---

### 1.6 [prompt_locks.py](./prompt_locks.py)
잠금 라이브러리. **순수 데이터 + 헬퍼 함수만 있는 파일** (외부 호출 X).

**조회 헬퍼**
| 함수 | 역할 |
|---|---|
| `get_camera(simulation_id)` | 시뮬레이션별 카메라 디렉티브 |
| `get_mood_lighting(background_id)` | 배경별 영어 묘사 |
| `get_negative_prompt(simulation_id)` | 공통 + 시뮬레이션별 부정 프롬프트 결합 |
| `get_duration(simulation_id)` | 시뮬레이션 권장 영상 길이 |
| `get_model_extras(model_id)` | 영상 모델별 추가 키워드 |
| `get_simulation_label_kr(simulation_id)` | 시뮬레이션 한국어 라벨 |
| `get_background_label_kr(background_id)` | 배경 한국어 라벨 |
| `get_texture_guidance(elements, simulation_id)` | 요소 리스트 → 한국어 질감 가이드 |
| `collect_elements_from_analysis(analysis)` | Moondream 결과 → 요소 키 리스트 |

**잠금 데이터**
| 이름 | 종류 | 역할 |
|---|---|---|
| `SIMULATION_LABELS_KR` | dict | 시뮬레이션 한국어 라벨 |
| `BACKGROUND_LABELS_KR` | dict | 배경 한국어 라벨 |
| `CAMERA_DIRECTIVES` | dict | 시뮬레이션별 카메라 워크 |
| `TECHNICAL_BASELINE` | str | 모든 영상 공통 기술 키워드 |
| `MODEL_SPECIFIC_ADDITIONS` | dict | 영상 모델별 추가 키워드 |
| `NEGATIVE_COMMON` | str | 공통 부정 프롬프트 |
| `NEGATIVE_PER_SIMULATION` | dict | 시뮬레이션별 부정 프롬프트 |
| `MOOD_LIGHTING` | dict | 배경별 영어 묘사 |
| `DURATION_SETTINGS` | dict | 시뮬레이션별 권장 길이 |
| `TEXTURE_PROFILES` | dict | 요소별 질감/반응 (under_pressure_kr + when_cut_kr) |
| `SIMULATION_ACTION_TYPE` | dict | 시뮬레이션 → 어느 질감 컬럼 사용할지 |

---

### 1.7 [llm_client.py](./llm_client.py)
Gemini 2.5 Flash-Lite (SSAFY GMS 게이트웨이 경유) 래퍼. 3가지 시스템 프롬프트.

**공개 함수**
| 함수 | 역할 | 반환 |
|---|---|---|
| `generate_korean_preview(dessert_info, focus_label_kr, simulation_label_kr, background_label_kr, user_hint, texture_guidance, temperature)` | **Phase 1** — 한국어 미리보기 생성 | 한국어 문자열 |
| `translate_to_video_prompt(korean_text, temperature)` | **Phase 2** — 한국어 → 영어 영상 프롬프트 | 영어 문자열 |
| `expand_hint(hint, temperature)` | (선택) 짧은 힌트 → 4가지 측면 | dict (조명/모션/분위기/시각적_디테일) |

**내부 함수/상수**
| 이름 | 역할 |
|---|---|
| `_get_client()` | Gemini 클라이언트 lazy init |
| `_call_gemini(system, user, temperature)` | 공통 호출 |
| `_MODEL` | 모델 ID (`"gemini-2.5-flash-lite"`, SSAFY GMS 경유) |
| `SYSTEM_PROMPT_PREVIEW` | Phase 1 시스템 프롬프트 (예시 2개 포함) |
| `SYSTEM_PROMPT_TRANSLATE` | Phase 2 시스템 프롬프트 (한국 음식 음역 사전 등) |
| `SYSTEM_PROMPT_HINT_EXPAND` | 힌트 확장 시스템 프롬프트 |

---

### 1.8 [pipeline.py](./pipeline.py)
풀 파이프라인 (디버깅/데모용). generate_keyframe + generate_video를 한 번에.

**함수**
| 함수 | 역할 |
|---|---|
| `main()` | 전체 흐름 — 분석 결과 자동 로드 + 키프레임 + 영상 |

**상수 (단독 실행용)**
| 이름 | 역할 |
|---|---|
| `INPUT_IMAGE_PATH` | 입력 이미지 |
| `SIMULATION` / `FOCUS` / `BACKGROUND` / `USER_HINT` / `SEED` | 옵션값 |
| `OUTPUT_DIR` | 결과 저장 폴더 |

---

## 2. 데이터 형식 변환 표

같은 개념이 **레이어마다 다른 형식**으로 존재해요. 한눈에 매핑 보려고 정리.

```
[FE/사용자]            [AI 코드 키]              [LLM/Veo 영어]
"단면 자르기"   ←→    "cross_section_cut"  ←→   "Knife enters from top..."
```

### 2.1 시뮬레이션 ID 변환표

| AI 코드 (snake_case) | 한국어 라벨 (FE) | 영어 카메라 묘사 (Veo) | frame_strategy |
|---|---|---|---|
| `cross_section_cut` | 단면 자르기 | Static camera at eye level. Knife enters from top. Slight push-in as cross-section reveals. | `i2i_is_end` |
| `lift_slice` | 한 조각 들어올리기 | Camera tracks upward following the lifted slice. Starts low, ends slightly above. | `i2i_is_end` |
| `topping_fall` | 토핑 위에서 떨어지기 | Static camera, top-down 45-degree angle. Captures full cake surface and falling topping briefly. | `i2i_is_start` |

**정의 위치:** [prompt_locks.py](./prompt_locks.py)의 `SIMULATION_LABELS_KR`, `CAMERA_DIRECTIVES`, `SIMULATION_ACTION_TYPE` + [prompt_builder.py](./prompt_builder.py)의 `SIMULATIONS`

---

### 2.2 Focus 키 변환표

| AI 코드 (Moondream/snake_case) | 한국어 라벨 | 영어 (FOCUS_TEXT) | 질감 (when_cut_kr) |
|---|---|---|---|
| `strawberry` / `fresh_strawberries` | 딸기 / 신선한 딸기 | the strawberry on top | 단면에 즙 맺힘, 빨간 단면 노출 |
| `blueberry` / `blueberries` | 블루베리 | the blueberries | 보라빛 즙 맺힘 |
| `whipped_cream` / `fluffy_whipped_cream` | 생크림 / 부드러운 생크림 | the whipped cream | 부드럽게 갈라짐, 결 따라 매끄럽게 분리 |
| `mascarpone_cream` | 마스카포네 크림 | the mascarpone cream | 매끈한 단면, 살짝 윤기 |
| `ganache` | 가나슈 | (FOCUS_TEXT 없음) | 매끈한 단면, 윤기 |
| `molten_chocolate` | 흐르는 초콜릿 | (FOCUS_TEXT 없음) | 단면에서 진하게 흘러내림 |
| `sponge` / `soft_sponge_layers` | 스펀지 시트 / 부드러운 시트 | (FOCUS_TEXT 없음) | 부스러기 발생, 결과 층 노출 |
| `vanilla_sponge` | 바닐라 스펀지 | (FOCUS_TEXT 없음) | 노란빛 결과 층 드러남 |
| `chocolate_sponge` | 초콜릿 스펀지 | (FOCUS_TEXT 없음) | 진한 갈색 결과 층 드러남 |
| `mousse` | 무스 | (FOCUS_TEXT 없음) | 매끈하게 베이며 단면 부드러움 |
| `cocoa_dusting` / `cocoa_powder` | 코코아 더스팅 / 코코아 파우더 | (FOCUS_TEXT 없음) | 단면에 살짝 묻어남 |
| `powdered_sugar` | 슈가파우더 | (FOCUS_TEXT 없음) | 단면에 살짝 묻어남 |

**정의 위치:** [prompt_builder.py](./prompt_builder.py)의 `FOCUS_TEXT` + [prompt_locks.py](./prompt_locks.py)의 `TEXTURE_PROFILES`

> ⚠️ **FOCUS_TEXT에 없는 항목은 어떻게 되나?** [prompt_builder.py](./prompt_builder.py)의 `focus_phrase()`가 fallback으로 underscore를 공백으로만 바꿔서 사용 (예: `chocolate_sponge` → `chocolate sponge`). 자연스러운 영어 표현 원하면 FOCUS_TEXT에 추가.

---

### 2.3 배경 키 변환표

| AI 코드 | 한국어 라벨 | 영어 묘사 (MOOD_LIGHTING, Veo 입력) |
|---|---|---|
| `null` (None) | 원본 배경 그대로 | (배경 교체 단계 skip — 원본 사진 배경 유지) |
| `white_marble` | 흰 대리석 | white marble counter, soft golden hour lighting from the left, clean minimalist setting |
| `cafe_interior` | 카페 인테리어 | softly blurred cafe background with bokeh, warm ambient lighting, intimate setting |
| `outdoor` | 야외 정원 | natural wooden tray on garden table, dappled sunlight through leaves, organic outdoor setting |
| `wooden_table` | 원목 테이블 | warm wooden surface, soft warm afternoon lighting, cozy atmosphere |
| `minimalist_white` | 미니멀 화이트 | pure white seamless background, soft diffused lighting, studio product photography |
| `dark_moody` | 어두운 무드 | dark slate surface, dramatic single-source side lighting, high contrast moody atmosphere |

**정의 위치:** [prompt_locks.py](./prompt_locks.py)의 `BACKGROUND_LABELS_KR` + `MOOD_LIGHTING`

---

### 2.4 frame_strategy 변환표

| 값 | 의미 | 적용 시뮬레이션 | 영상 흐름 |
|---|---|---|---|
| `i2i_is_end` | I2I 결과 = 영상의 **끝** 프레임 | `cross_section_cut`, `lift_slice` | 원본 → I2I 결과 (변형 후) |
| `i2i_is_start` | I2I 결과 = 영상의 **시작** 프레임 (역방향) | `topping_fall` | I2I 결과 (변형 전) → 원본 |

**정의 위치:** [prompt_builder.py](./prompt_builder.py)의 `SIMULATIONS`의 `frame_strategy` 필드 + [prompt_locks.py](./prompt_locks.py)의 `SIMULATION_ACTION_TYPE`

---

### 2.5 영상 모델 ID 변환표

| AI 코드 (model_id) | 회사 | 모델별 키워드 (MODEL_SPECIFIC_ADDITIONS) |
|---|---|---|
| `veo-3.1` | Google (현재 사용) | ASMR sound design, natural ambient audio, cinematic depth |
| `kling-3.0-pro` | Kuaishou | preserve original texture and color, maintain object identity, smooth motion interpolation |
| `kling-2.6-pro` | Kuaishou | smooth motion, preserve original colors, no distortion |
| `hailuo-2.3` | MiniMax | natural physics, realistic motion, smooth transitions |

**정의 위치:** [prompt_locks.py](./prompt_locks.py)의 `MODEL_SPECIFIC_ADDITIONS`

> 현재 `veo-3.1`만 실제 사용. 나머지는 미래 모델 교체 대비.

---

### 2.6 Moondream 분석 결과 → AI 내부 키 매핑

[analyze.py](./analyze.py)가 Moondream에서 받는 JSON의 어떤 필드가 AI 내부에서 어떻게 쓰이는지.

| Moondream 출력 필드 | 타입 | 사용 위치 |
|---|---|---|
| `cake_type` | str | (현재 미사용 — 향후 디저트 분류용) |
| `creams` | list | `collect_elements_from_analysis()` → `TEXTURE_PROFILES` 매칭 |
| `toppings` | list | 동일 |
| `base` | list | 동일 |
| `coating` | str | 동일 ("none" 제외) |
| `key_feature` | str | (현재 미사용 — LLM 컨텍스트에 추가 가능) |
| `is_warm` | bool | (현재 미사용 — 향후 따뜻한 디저트 분기) |
| `is_layered` | bool | (현재 미사용 — 단면 시뮬레이션 적합성 판단용) |
| `suggested_focus` | list | `FOCUS = None` 일 때 자동 선택 (`suggested_focus[0]`) |

**정의 위치:** [analyze.py](./analyze.py)의 `ANALYSIS_PROMPT` (few-shot 예시 스키마)

---

## 3. 새 시뮬레이션 추가 체크리스트 🛠

새 시뮬레이션 1개를 시스템에 등록하려면 **최소 5~6군데**를 같은 ID로 동기화해야 함.
한 군데라도 빠뜨리면 fallback이 일어나서 소리 없이 결과가 이상해질 수 있어요.

> 예시: `cream_press` (포크로 크림 누르기) 시뮬레이션 추가한다고 가정.

### Step 1. [prompt_builder.py](./prompt_builder.py) — `SIMULATIONS` dict 추가

```python
SIMULATIONS = {
    # ... 기존 것들 ...
    "cream_press": {                               # ← 새 ID
        "label_kr": "포크로 크림 누르기",          # 한국어 라벨
        "frame_strategy": "i2i_is_end",            # 또는 "i2i_is_start"
        "instruction_template": (
            "DO NOT regenerate or replace the cake. ... "
            "ADD ONLY this: a fork pressing flat against the cream side, "
            "deforming the cream as it spreads sideways. ..."
        ),
        "video_template": (
            "A fork is pressing flat against the side of the cake, "
            "the {focus} spreading sideways gently. ..."
        ),
    },
}
```

체크:
- [ ] `label_kr` (한국어 라벨)
- [ ] `frame_strategy` (`"i2i_is_end"` 또는 `"i2i_is_start"`)
- [ ] `instruction_template` (영어 I2I 프롬프트, `DO NOT regenerate` 보존 패턴 포함)
- [ ] `video_template` (영어 영상 묘사, `{focus}` 자리표시자 포함)

---

### Step 2. [prompt_locks.py](./prompt_locks.py) — 5개 dict에 동시 추가

#### 2-1. `SIMULATION_LABELS_KR` (LLM에 슬롯으로 전달되는 한국어)
```python
SIMULATION_LABELS_KR = {
    # ...
    "cream_press": "포크로 크림 옆면 누르기 (포크가 옆면을 평평하게 누름)",
}
```
- [ ] 등록 (Step 1의 `label_kr`보다 자세한 동작 설명 포함)

#### 2-2. `CAMERA_DIRECTIVES` (시뮬레이션별 카메라 워크)
```python
CAMERA_DIRECTIVES = {
    # ...
    "cream_press": (
        "Static camera holds for 0.5s. Subtle dolly-in toward press point. "
        "45-degree side angle."
    ),
}
```
- [ ] 등록 (영어, Veo가 받는 카메라 지시문)

#### 2-3. `NEGATIVE_PER_SIMULATION` (시뮬레이션별 부정 프롬프트)
```python
NEGATIVE_PER_SIMULATION = {
    # ...
    "cream_press": (
        "no hands holding fork, no cake collapsing, no excessive deformation"
    ),
}
```
- [ ] 등록 (이 시뮬레이션에서 흔한 실패 케이스 차단)

#### 2-4. `DURATION_SETTINGS` (권장 영상 길이)
```python
DURATION_SETTINGS = {
    # ...
    "cream_press": "4s",   # 짧은 동작이라 4초로
}
```
- [ ] 등록 (`"4s"` / `"6s"` / `"8s"` 중 — Veo 3.1 제약)

#### 2-5. `SIMULATION_ACTION_TYPE` (질감 가이드 라우팅)
```python
SIMULATION_ACTION_TYPE = {
    # ...
    "cream_press": "under_pressure",   # 누르는 동작 → under_pressure_kr 컬럼 사용
}
```
- [ ] 등록 (값: `"when_cut"` / `"under_pressure"` / `None`)

---

### Step 3. (선택) 새 동작 카테고리 도입 시
만약 기존 두 카테고리(`when_cut`, `under_pressure`)에 안 맞는 새 동작이면:

- [ ] `TEXTURE_PROFILES`의 각 요소에 새 컬럼 추가 (예: `when_dropped_kr`)
- [ ] `get_texture_guidance()`에서 새 컬럼 처리 로직 추가

---

### Step 4. (선택) FE 라벨 매핑
프론트엔드가 사용자에게 보여줄 한국어 라벨도 등록 필요 (FE 코드에서):

```javascript
const SIMULATION_KR = {
  // ...
  "cream_press": "🍴 포크로 크림 누르기",
}
```
- [ ] FE 코드 업데이트 (FE팀과 협업)

---

### Step 5. 테스트

- [ ] **프롬프트 미리보기 (무료)**:
      ```bash
      python prompt_builder.py
      ```
      → 새 시뮬레이션 프롬프트가 정상 출력되는지 확인

- [ ] **LLM Phase 1 단독 테스트**:
      ```bash
      python llm_client.py
      ```
      → 한국어 미리보기에 새 시뮬레이션 한국어 라벨이 자연스럽게 들어가는지

- [ ] **풀 파이프라인 (비용 발생 ~$1.28)**:
      [pipeline.py](./pipeline.py)의 `SIMULATION = "cream_press"` 변경 후
      ```bash
      python pipeline.py
      ```
      → 키프레임 + 영상 결과 확인

---

### 빠뜨렸을 때 증상 — 디버깅 가이드

| 빠뜨린 곳 | 증상 |
|---|---|
| `SIMULATIONS` (Step 1) | `KeyError` 발생, 즉시 알 수 있음 |
| `SIMULATION_LABELS_KR` | LLM이 한국어 묘사에 `cream_press` 같은 snake_case 그대로 박음 |
| `CAMERA_DIRECTIVES` | "Static camera, macro close-up, eye level." 기본값 사용 (단조로움) |
| `NEGATIVE_PER_SIMULATION` | 공통 부정만 적용 → 시뮬레이션 특유 실패 케이스 차단 못 함 |
| `DURATION_SETTINGS` | 기본 6초 강제 |
| `SIMULATION_ACTION_TYPE` | 질감 가이드 안 만들어짐 → LLM이 비물리적 묘사 생성 가능 |

---

### 비슷한 패턴의 다른 추가 작업들

새 시뮬레이션 외에도 동기화 필요한 작업들:

#### 새 배경 추가
- [prompt_locks.py](./prompt_locks.py)의 `BACKGROUND_LABELS_KR` + `MOOD_LIGHTING` 두 군데
- (선택) FE의 BACKGROUND_KR 매핑

#### 새 focus 요소 추가 (Moondream이 잡는 새 재료)
- [prompt_builder.py](./prompt_builder.py)의 `FOCUS_TEXT` (영어 자연어)
- [prompt_locks.py](./prompt_locks.py)의 `TEXTURE_PROFILES` (한국어 질감/반응)

#### 새 영상 모델 지원
- [prompt_locks.py](./prompt_locks.py)의 `MODEL_SPECIFIC_ADDITIONS`
- [generate_video.py](./generate_video.py)의 `ENDPOINT_I2V` 변경
- 입력/응답 스키마가 다르면 `generate_video()` 함수 수정

---

## 4. 미연결 / 부분 활용 코드 (Dead Code 추적)

코드는 정의/등록돼있지만 **메인 흐름에서 호출 안 되거나 일부만 활용되는 항목** 목록.
새 기능 추가 시 이 자리에 매핑/등록을 잊으면 표 늘어남. 관리용.

### 4.1 미연결 (정의만 됐고 메인 흐름에서 호출 0회)

| 항목 | 위치 | 상태 |
|---|---|---|
| (현재 없음 — 모든 함수가 메인 흐름에 연결됨) | - | - |

> 과거에 `llm_client.expand_hint()`가 미연결 상태였으나, [prompt_builder.py](./prompt_builder.py)의 `build_korean_preview()`에서 hint가 있을 때 자동 호출하도록 연결됨.

### 4.2 부분 활용 (등록은 됐지만 일부만 활용)

| 항목 | 위치 | 상태 | 활용 방법 |
|---|---|---|---|
| `MODEL_SPECIFIC_ADDITIONS`의 `kling-3.0-pro`, `kling-2.6-pro`, `hailuo-2.3` | [prompt_locks.py](./prompt_locks.py) | 현재 `veo-3.1`만 실사용. 나머지 3개는 미래 영상 모델 교체 대비 placeholder. | [generate_video.py](./generate_video.py)의 `ENDPOINT_I2V` 갈아끼우면 자동 활성. |
| Moondream 분석 결과의 `cake_type` | [analyze.py](./analyze.py) `ANALYSIS_PROMPT` | 추출은 되나 prompt 빌드 단계에서 사용 안 됨. | 향후 디저트 종류별 시뮬레이션 자동 추천에 활용 가능. |
| Moondream 분석 결과의 `key_feature` | 동일 | 추출만 됨. | LLM Phase 1 입력에 추가 컨텍스트로 넣을 수 있음. |
| Moondream 분석 결과의 `is_warm` | 동일 | 추출만 됨. | 따뜻한 디저트(라바케이크 등) 분기 시 활용. 김 모락모락 시뮬레이션 등에 적합. |
| Moondream 분석 결과의 `is_layered` | 동일 | 추출만 됨. | 단면 시뮬레이션(`cross_section_cut`, `lift_slice`) 적합성 판단에 활용 가능. |

### 4.3 새 항목 발생 시 갱신 가이드

새 기능 추가하다가 "정의만 하고 안 부르는" 코드가 생기면 이 표에 등록해서 추적.
나중에 연결되면 표에서 제거.

---

## 끝
