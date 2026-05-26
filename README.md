# gem.cafe × gem.mark

> SSAFY 14기 자율 프로젝트 (S14P31S307)

케이크 사진 한 장으로 SNS 광고 영상을 자동 생성하는 **B2C AI 기반 영상 생성 서비스**와,
영상 무단 배포를 추적하는 **B2B 워터마크 보안 플랫폼**을 하나의 모노레포로 개발한 프로젝트입니다.

<img src="gemcafe/FE/public/logo.png" width="10%"> &nbsp; <img src="gemmark/FE/public/fabicon.png" width="10%">
---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [팀 구성 및 역할](#2-팀-구성-및-역할)
3. [기술 스택](#3-기술-스택)
4. [서비스 소개](#4-서비스-소개)
5. [AI 파이프라인](#6-ai-파이프라인)
6. [시스템 아키텍처](#7-시스템-아키텍처)

---

## 1. 프로젝트 개요
| 앱 | 형태 | 대상 사용자 | 핵심 가치 |
|---|---|---|---|
| **gem.cafe** | 모바일 우선 PWA | 소상공인 대상 | 케이크 사진 1장 → AI 광고 영상 자동 생성 |
| **gem.mark** | 데스크톱 어드민 | (주) 일만백만 내 운영자 / 보안 담당 | 영상 워터마크 삽입 · 검출 · 강건성 평가 |

---

## 2. 팀 구성 및 역할

| 이름 | 역할 |
|---|---|
| 엄송현 | 팀장, Frontend |
| 송은혁 | Infra, Backend |
| 우주영 | Backend |
| 황인후 | AI |

---

## 3. 기술 스택

### gem.cafe

| 분류 | 기술 |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Backend | Spring Boot 4, MySQL, RabbitMQ, Redis |
| AI | Moondream3, Gemini 2.5, nano-banana-pro/edit, Veo 3.1 |
| 인증 | Google Identity Services SDK |

### gem.mark

| 분류 | 기술 |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy, MySQL, Redis |
| 워터마크 | DCT 스프레드 스펙트럼 (scipy, OpenCV, ffmpeg) |

### 공통 인프라

```
Docker · Docker Compose · GitLab CI · Jenkins · nginx · AWS EC2
```

---

## 4. 서비스 소개

### gem.cafe — AI 영상 생성 플로우

```
1. 케이크 사진 업로드
      ↓
2. Moondream3 성분 분석 (베이스 · 크림 · 토핑 · 코팅)
      ↓
3. 강조 키워드 / 시뮬레이션 / 배경 선택
      ↓
4. Gemini 한국어 영상 프롬프트 자동 생성 (편집 가능)
      ↓
5. nano-banana-pro/edit 키프레임 생성 (최대 3회 시도)
      ↓
6. Veo 3.1 first-last-frame → 5~6초 영상 생성
      ↓
7. 편집기에서 텍스트 · 스티커 · BGM 추가
      ↓
8. 워터마크 삽입 후 다운로드 / SNS 자동 업로드
```

### gem.mark — 워터마크 플로우

```
영상 생성 시: DCT 기반 포렌식 워터마크 자동 삽입 (삽입 정보 DB 기록)
              ↓
검증 시:      의심 영상 업로드 → 워터마크 추출 → BER 비교 → 원본 확인
```

---


## 5. AI 파이프라인

```
케이크 사진
  │
  ├─ [Moondream3 via fal.ai]
  │    → 케이크 구성 분석 (analysis.json)
  │
  ├─ [사용자 선택] simulation / focus / background / hint
  │
  ├─ [Gemini 2.5 Flash-Lite via SSAFY GMS]
  │    → 한국어 영상 프롬프트 생성 (편집 가능)
  │    → 한→영 번역 (영상 생성 프롬프트)
  │
  ├─ [nano-banana-pro/edit via fal.ai]
  │    → I2I 키프레임 이미지 생성 (최대 3회)
  │
  └─ [Veo 3.1 first-last-frame via fal.ai]
       → 5~6초 MP4 영상 생성
```

`frame_strategy`에 따라 키프레임이 시작 프레임(`i2i_is_end`) 또는 마지막 프레임(`i2i_is_start`)으로 배치됩니다.

---

## 6. 시스템 아키텍처

```
Client (Browser / PWA)
    │
    ▼
nginx  ─────── gem.cafe FE (React)
    │  ─────── gem.mark FE (React)
    │
    ├── /dev/be/gemcafe/ ──► gem.cafe BE (Spring Boot :8002)
    │                              │
    │                              ├── MySQL (gemcafe DB)
    │                              ├── RabbitMQ → gem.cafe AI (FastAPI :8000)
    │                              └── gem.mark BE (내부 HTTP)
    │
    └── /dev/be/gemmark/ ──► gem.mark BE (FastAPI :8000)
                                   │
                                   └── MySQL (gemmark DB)
```

---

