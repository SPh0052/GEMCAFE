# gemcafe/AI — Claude Code 가이드

## 프로젝트 개요
케이크 이미지 → 시뮬레이션 영상 생성 파이프라인.

## 주요 파일
| 파일 | 역할 |
|------|------|
| `analyze.py` | Gemini 2.5 Pro(GMS)로 케이크 구성요소 분석 → analysis.json |
| `prompt_builder.py` | simulation + focus → I2I/I2V 프롬프트 자동 생성 |
| `generate_keyframe.py` | nano-banana-pro/edit(fal.ai)로 키프레임 생성 |
| `generate_video.py` | Veo 3.1 first-last-frame으로 영상 생성 |
| `api.py` | FastAPI 래퍼 (BE 연동용) |
| `llm_client.py` | GMS/fal.ai 클라이언트 공유 |
| `pipeline.py` | 개발용 end-to-end 실행 (keyframe + video) |
| `prompt_locks.py` | 프롬프트 고정값 |

## 시뮬레이션 카테고리
- **sheet**: fork_bite, cut_in_half, lift_slice
- **cream**: smash, cream_scoop, hand_split
- **topping**: topping_fall

## 지원 Focus 키
`sponge`, `strawberry`, `whipped_cream`, `ganache`, `molten_chocolate`, `mascarpone_cream`, `baked_cheese`

## 핵심 규칙

### 어휘 금지어 (whipped_cream 묘사)
`stretch`, `strand`, `string`, `pull` — 사용 금지 (크림은 늘어나지 않음).
대신: `dollop`, `peaks`, `glossy`, `billowy` 사용.

### 색깔/구체적 외형 가정 금지
프롬프트에 "white"/"red" 같은 색상 하드코딩 금지.
실제 색/외형은 원본 사진(I2I/I2V)과 Gemini 분석이 제공.

### 슬롯 시스템
`{texture}`, `{interior_structure}`, `{base}`, `{topping}` 등은 analysis.json 결과로 동적 채워짐.
`TEXTURE_PROFILES`에 `under_pressure_en`/`when_cut_en` 필드 존재.

## 환경 변수
- `GMS_KEY` — Gemini 2.5 Pro (분석)
- `FAL_KEY` — nano-banana-pro/edit + Veo 3.1 (생성)

## 커밋 포맷
현재 브랜치(`feat/general_prompt_texture`): `[S14P31S307-670] feat : ~~`
