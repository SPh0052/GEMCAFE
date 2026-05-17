# 프롬프트 작업 가이드

이 문서는 `gemcafe/AI/`의 시뮬레이션 프롬프트(이미지/영상)를 다듬는 작업의 원칙과 체크리스트입니다. 새 시뮬레이션의 프롬프트를 짜거나 기존 것을 다듬을 때마다 이 가이드를 따라 진행하세요.

---

## 0. 작업 범위 — 절대 원칙

- ✅ **`gemcafe/AI/` 폴더만 수정.**
- ❌ `gemcafe/FE/`, `gemcafe/BE/`, Infra 폴더 **건드리지 말 것**.
- 불가피하게 FE/BE 수정 필요하면 **사용자에게 먼저 알리고 승인 받기**.
- AI 변경이 FE/BE/Infra에 영향 줄 수 있는 경우(API 스키마/응답/요청 변경 등) 코드 변경 **전에 사용자에게 알리기**.

---

## 1. 프롬프트 구조 이해

### 1.1 시뮬레이션 정의 (`prompt_builder.py`의 `SIMULATIONS` dict)

각 시뮬레이션은 다음 필드를 가짐:

| 필드 | 역할 |
|------|------|
| `label_kr` | 사장님 화면 한국어 라벨 |
| `category` | `"sheet"` / `"cream"` / `"topping"` — 자동 focus 결정 |
| `applicable_focus` | 이 시뮬에 적용 가능한 focus 키 리스트 |
| `frame_strategy` | `"i2i_is_end"` (start=원본, end=I2I) 또는 `"i2i_is_start"` (역방향) |
| `slot_phrases` | `{base}/{cream}/{topping}` 슬롯 wrapping 문장 (선택) |
| `start_frame_template` | (선택) 1단계 I2I 첫 프레임 — 2단계 체인 시뮬에서만 |
| `instruction_template` | I2I 키프레임 (nano-banana-pro/edit) |
| `video_template` | I2V 영상 (Veo 3.1) |

### 1.2 최종 프롬프트 빌드 과정 (`build_prompts()`)

```
1. _resolve_slot_phrases()  → {base}/{cream}/{topping}/{texture}/{interior_structure} 채움
2. _process_inline_markers()→ {?slot:...} 마커 처리 + 공백/콤마 자동 정리
3. format_map()             → 남은 placeholder ({focus} 등) 치환
4. prepend                  → temperature_note / signature(key_feature) / structure_ctx
5. suffix                   → background ("Setting: ..."), hint
→ instruction_prompt, video_prompt, start_frame_prompt 응답에 들어감
```

### 1.3 영상 측은 추가 자동 결합 (`assemble_final_video_prompt()`)

한국어 편집 모드(`/video` + `video_prompt_kr`)에서만:
- 사장님 한국어 → 영어 (LLM)
- (suffix) `"Setting: {bg_text}"`
- (suffix) `"Camera: {camera_directive}"` ← **잠금 라이브러리 자동 추가**
- (suffix) `TECHNICAL_BASELINE`
- (suffix) `model_extras`

→ **이미지 측엔 잠금 자동 추가 안 됨. 영상 측만 추가됨.**

---

## 2. 사용자가 영어 프롬프트를 줄 때 — 절대 원칙

### 2.1 원본 문장은 **절대 재구성하지 말 것**

사용자가 신중히 작성한 프롬프트의 단락 구조·문장·표현을 임의로 다시 쓰지 말 것.

- ❌ "더 깔끔하게 정리하자"는 reflex 금지
- ❌ "이왕 손대는 김에" 다른 부분도 다듬기 금지
- ✅ **케이크-specific 단어/문장만 최소 침습으로 일반화**
- ✅ 사용자가 명시적으로 "다시 써줘"라고 했을 때만 재구성

### 2.2 점검 + 결정 받기 흐름

사용자 프롬프트 받으면 **곧바로 코드에 박지 말고** 다음 점검 진행:

1. **잠금 라이브러리 충돌 점검** (영상 측만 자동 결합):
   - `CAMERA_DIRECTIVES[sim_id]` 와 사용자 [Camera] 부분
   - `TECHNICAL_BASELINE` 과 사용자 [Style]
   - `NEGATIVE_PER_SIMULATION[sim_id]` 와 사용자 [Constraints]
   - `MODEL_SPECIFIC_ADDITIONS` 와 사용자 [Mood and Sound]
   - `DURATION_SETTINGS[sim_id]` 와 사용자 [Pacing] (Veo 3.1은 **4/6/8초만** 가능)
2. **케이크-specific 표현 식별** — 다른 케이크에 안 맞는 단어/문장
3. **사용자에게 점검 결과 보여주고 결정 받기** (옵션 제시)
4. 결정 받은 후에만 코드 변경

### 2.3 [Scene]/[Camera]/[Style] 등 섹션의 역할 이해

| 섹션 | 역할 | 마커/일반화 권장? |
|------|------|------------------|
| **[Scene]** | 영상 보간 중 *불변* 요소 명시 (케이크 본체/플레이트/cut line 보존) | 구체 케이크 종류 빼고 "cake"로 일반화. 구조 정보 유지. |
| **[Motion]** | 동작 흐름 | 그대로. 케이크-specific 텍스처 묘사 있으면 `{texture}` 슬롯으로 |
| **[Pacing]** | 시간 흐름 | 그대로. duration과 일치 확인 |
| **[Camera]** | 카메라 워크 | 이미지 측은 그대로. 영상 측은 잠금 라이브러리도 같은 값으로 동기화 |
| **[Lighting]** | 조명 | 그대로 |
| **[Style]** | 스타일 | 그대로 (TECHNICAL_BASELINE과 중복 OK, 충돌 아님) |
| **[Mood and Sound]** | 분위기/사운드 | 그대로 |
| **[Constraints]** | 제약 | NEGATIVE_PER_SIMULATION과 충돌 없는지 점검 |

---

## 3. 일반화 옵션 — 3가지

케이크-specific 표현(`basque cheesecake`, `sponge layers`, `pale-yellow body` 등)을 다룰 때:

### 옵션 A — 단순 일반화 (보수적)
```diff
- basque cheesecake
+ cake

- sponge layers, cream filling, and internal structure
+ the internal structure

- creamy pale-yellow body
+ the cake's actual body color and texture as shown in the input
```

언제 쓰나:
- 의미 추상화로 충분한 자리 (보존 지시, 구조 묘사)
- "input image가 시각 정보 제공"하는 자리

### 옵션 B — 인라인 마커 `{?slot:...}` (lift_slice 위치 1·3 패턴)

```python
"exposing the cross-section{?base: of the {base}}{?cream: with the {cream}}"
```

| 케이크 | 결과 |
|--------|------|
| 생크림 | `"exposing the cross-section of the vanilla sponge with the whipped cream"` |
| 바스크 | `"exposing the cross-section of the baked cheesecake filling"` (cream 자동 omit) |
| 라바 | `"exposing the cross-section of the chocolate sponge with the molten chocolate"` |

언제 쓰나:
- **단면 노출, focus 강조 같이 모델이 "무엇을 그려야 할지" 정확히 알아야 하는 자리**
- 케이크별 다른 재료를 명시하면 정확도 ↑
- 단, 빈 슬롯이 phrase 통째 빠지면 자연스러운 자리에만 (콤마는 자동 정리됨)

### 옵션 C — `{texture}` 슬롯 활용

```python
"The cake yields under the pull according to its actual material properties{texture}."
```

→ `TEXTURE_PROFILES[focus][{action_type}_en]` (baseline) + `analysis.element_textures[focus]` (Vision modifier) 자동 결합. 케이크별 적절한 텍스처 묘사 + 안전장치(예: "cheese ≠ mozzarella") 자동 박힘.

언제 쓰나:
- 길고 정교한 texture 묘사가 케이크별로 달라야 하는 자리
- 케이크-specific 텍스처 단어("custard-like", "billowy", "molten") 들어간 자리

### 안 쓰는 경우
- 결합 표현 `"X and Y layers"` 같이 마커 분리 시 잔여 발생하는 자리 → 단순 일반화(A)
- 단어 나열 (괄호 안 enumeration) → 한 줄로 추상화(A)

---

## 4. 잠금 라이브러리 동기화 (`prompt_locks.py`)

영상 프롬프트(video_template) 변경 시 잠금 라이브러리도 같은 값으로 동기화:

| 잠금 | 위치 | 동기화 항목 |
|------|------|------------|
| `CAMERA_DIRECTIVES[sim_id]` | `prompt_locks.py:48~` | 사용자 [Camera] 텍스트로 통째 교체 |
| `DURATION_SETTINGS[sim_id]` | `prompt_locks.py:222~` | 사용자 [Pacing] 시간 (Veo 3.1: 4/6/8초만) |
| `NEGATIVE_PER_SIMULATION[sim_id]` | `prompt_locks.py:135~` | 사용자 [Constraints]와 모순되는 부정 제거. 특히 텍스처 관련 부정(stretching, stringing 등)은 `{texture}` 슬롯이 케이크별 처리하므로 일반 부정에서 빼는 게 좋음 |

### NEGATIVE 처리 원칙
- 케이크-specific 부정 (예: "stretching cream strands", "sticky filling pulling")은 **`{texture}` 슬롯이 알아서 처리**하니 잠금 NEGATIVE에서 빼기
- 일반 부정 (bare hands, deformed, shaky camera 등)은 유지
- 새 시뮬 디자인에 맞춰 단어 정정 (예: "slice halves" → "cake halves")

### TECHNICAL_BASELINE
- 보통 그대로 둠. 사용자 [Style]과 의미 일치하면 OK
- 잠금이 일반적 (photorealistic, shallow DOF, ASMR style)이라 모순 거의 없음

---

## 5. API 응답 노출 점검

### `/keyframe` 응답에 포함되는 prompt 필드 (`generate_keyframe.py:329`)
- `instruction_prompt`
- `system_prompt`
- `video_prompt`
- `start_frame_prompt`

→ 사장님 화면이나 디버그 UI에 raw prompt 노출되는 흐름이 있다면 **렌더링 후 클린한 영어만** 노출되어야 함.
→ **마커 syntax `{?slot:...}` 가 응답에 노출되면 안 됨.** `build_prompts()` 안에서 이미 처리되어 응답엔 클린 prompt만 들어가지만, 새 placeholder 추가 시 반드시 검증.

검증 명령:
```python
r = pb.build_prompts(sim_id, focus=..., analysis=...)
assert '{?' not in r['instruction_prompt']
assert '{?' not in r['video_prompt']
assert '{?' not in (r.get('start_frame_prompt') or '')
```

---

## 6. 작업 흐름 (한 시뮬레이션 다듬기)

### 단계 0 — 브랜치 준비
- 시뮬별 브랜치 (예: `prompt_smash`, `prompt_topping_fall`) 만들기 — develop 또는 통합 브랜치 기반
- 매 커밋 전 **현재 브랜치 확인**: `git -C "..." branch --show-current` (실수 방지)

### 단계 1 — start_frame_template (있는 경우)
1. 사용자가 영어 텍스트 줌
2. 점검 (잠금 충돌 없음 — 이미지 측 / 케이크-specific 식별)
3. 옵션 제시 + 결정 받기
4. 코드 변경 + 검증 + 커밋

### 단계 2 — instruction_template
1. 사용자 텍스트 받음
2. 점검 + 옵션 제시 + 결정 받기
3. 마커/슬롯 활용 (단면 노출 자리에 효과적)
4. 코드 변경 + 검증 + 커밋

### 단계 3 — video_template + 잠금 라이브러리 동기화
1. 사용자 텍스트 받음
2. 점검 — **잠금 라이브러리 4가지 항목 충돌 확인**
3. 옵션 제시 + 결정 받기
4. video_template + CAMERA + DURATION + NEGATIVE 동시 변경 (한 커밋)
5. 검증 (마커 노출 없음, 케이크별 렌더링 확인) + 커밋

### 단계 4 — push + MR
- 작업 완료되면 push (`-u` 첫 push 시)
- GitLab UI에서 MR 만들어 통합 브랜치(또는 develop)로 머지

---

## 7. 커밋 메시지 포맷

브랜치별 Jira 티켓에 맞춰:
- `feat/prompt_lift_slice` → `[S14P31S307-673] feat : ~~`
- `prompt_hand_split` → `[S14P31S307-638] feat : ~~`
- 새 시뮬은 사용자가 별도 알려줌

한 작업당 한 커밋. 작업 단위 명확히 (예: "start_frame 추가", "마커 적용", "잠금 동기화").

---

## 8. 검증 명령어 모음

### 마커 syntax 노출 검증
```bash
cd /c/Users/SSAFY/Desktop/S14P31S307/gemcafe/AI && py -X utf8 -c "
import prompt_builder as pb
for sim in pb.SIMULATIONS:
    for focus in pb.SIMULATIONS[sim]['applicable_focus']:
        r = pb.build_prompts(sim, focus=focus, analysis={'base':[focus],'is_layered':True})
        for k in ('instruction_prompt', 'video_prompt', 'start_frame_prompt'):
            v = r.get(k) or ''
            assert '{?' not in v, f'{sim}/{focus}/{k} 마커 노출!'
print('ALL CLEAN')
"
```

### 9종 케이크 호환성 검증
3종 정도(생크림/바스크/라바)에 대해 build_prompts 돌려서 자연어 결과 눈으로 확인.

---

## 9. 자주 하는 실수 — 피하기

| 실수 | 방지 |
|------|------|
| 사용자 원본 문장 임의 재구성 | "일반화 = 단어 교체"로 한정. 재구성은 사용자가 명시 요청 시만 |
| 매 커밋 전 브랜치 미확인 → 다른 브랜치에 커밋 | `git -C "..." branch --show-current` 매번 확인 |
| 케이크-specific 단어 그대로 박음 (basque cheesecake 등) | 9종 케이크 호환 위해 일반화 또는 마커 사용 |
| 영상 측 잠금과 사용자 텍스트 충돌 무시 | DURATION/CAMERA/NEGATIVE 4가지 점검 필수 |
| `/keyframe` 응답에 마커 syntax 노출 | `build_prompts()` 안에서 처리 → 검증 명령으로 확인 |
| FE/BE/Infra 영향 무시하고 변경 | API 스키마/응답 형식 변경 시 사용자에게 알리기 |

---

## 10. 참고 — 9종 케이크와 매핑

| 케이크 | base focus | cream focus | 비고 |
|--------|-----------|-------------|------|
| 생크림 | sponge / vanilla_sponge | whipped_cream | 다층 |
| 바스크 치즈케이크 | baked_cheese | (없음) | 단일층 |
| NY 치즈케이크 | baked_cheese | (없음) | 단일층 |
| 롤케이크 | sponge | whipped_cream | sponge로 묶임 |
| 티라미수 | ladyfinger_biscuit | mascarpone_cream | 다층 |
| 초콜릿/가나슈 | chocolate_sponge | ganache | 다층 |
| 시폰/카스테라 | sponge | (없음) | sponge로 fallback |
| 무스 | mousse | (직접 mousse) | 단일/다층 모두 |
| 라바 | chocolate_sponge | molten_chocolate | 단일층 (warm) |
