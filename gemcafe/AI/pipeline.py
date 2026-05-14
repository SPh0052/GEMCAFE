"""
풀 파이프라인 (개발/디버깅용) — 키프레임 + 영상 한 번에.

generate_keyframe.py 와 generate_video.py 를 import 해서 차례로 실행.
실서비스에서는 둘이 분리돼야 STEP 7 검수/재생성이 가능하지만,
로컬 테스트나 빠른 end-to-end 확인용으론 이 파일 하나로 충분.

흐름:
  Phase 1) generate_keyframe.generate_keyframe(...)
            → 1_input.jpg, 2_background.jpg(opt), 3_keyframe.jpg
  Phase 2) generate_video.generate_video(...)
            → 4_video.mp4
  → 둘 다 같은 폴더(pipeline_<ts>_...)에 저장됨

실행:
  1) FAL_KEY 환경변수 설정 (.env에 FAL_KEY=...)
  2) (FOCUS=None일 때만) 'python analyze.py' 먼저 실행
  3) 아래 입력 블록의 SIMULATION/FOCUS/BACKGROUND 값 수정
  4) python pipeline.py
"""
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

import generate_keyframe
import generate_video
import prompt_builder

load_dotenv()

# =====================================================================
# 입력 (지금은 하드코딩 — 나중에 BE/FE 입력으로 받게 변경)
# =====================================================================
INPUT_IMAGE_PATH = "./test_cake.jpg"

# 시뮬레이션 (GET /catalog 의 simulations[].key 와 일치)
#   "smash"              뭉개기                  (i2i = end frame)
#   "fork_bite"          포크로 한 입 뜨기        (i2i = end frame)
#   "cut_in_half"        반으로 자르기           (i2i = end frame)
#   "cream_scoop"        크림만 떠내기           (i2i = end frame)
#   "strawberry_fall"    딸기가 케이크 위로 떨어짐 (i2i = start frame, 역방향)
#   "strawberry_cascade" 딸기 우수수             (i2i = start frame, 역방향)
SIMULATION = "cream_scoop"

# 강조할 요소 (focus) — 정식 키: "sponge" / "whipped_cream" / "strawberry"
#   None              → 자동 (analysis.json의 suggested_focus[0])
#   "strawberry" 등   → 수동 지정 (별칭도 허용: fresh_strawberries / cream / sponge_layers ...)
FOCUS: Optional[str] = "baked_cheese"

# 배경
#   None              → 배경 교체 skip
#   "white_marble" / "cafe_interior" / "outdoor" / "wooden_table" /
#   "minimalist_white" / "dark_moody"
BACKGROUND: Optional[str] = "cafe_interior"

# 사용자 자유 힌트
USER_HINT: Optional[str] = None

# 키프레임 시드 (None=랜덤, 정수=재현)
SEED: Optional[int] = None

# 종횡비 (키프레임 → 영상에 그대로 전파됨)
#   "9:16" → 숏폼/세로 (YouTube Shorts / Reels / TikTok) — production 기본
#   "16:9" → 가로
#   "1:1"  → 정사각형
#   "auto" → 원본 이미지 비율 따라감
ASPECT_RATIO: str = "9:16"

# =====================================================================
# LLM 오토 프롬프팅 (production parity)
# =====================================================================
# USE_LLM_PROMPT
#   True  → API 흐름과 동일하게 LLM Phase 1 (한국어 미리보기 생성) + Phase 2
#           (한→영 번역 + 잠금 라이브러리 결합) 까지 거쳐 최종 영상 프롬프트 생성.
#           production 사장님이 만들 영상과 동일한 프롬프트로 Veo 호출.
#           추가 비용 ~$0.0002 (LLM 2회), 추가 시간 ~3~5초.
#   False → SIMULATIONS[sim].video_template 의 {focus} 치환본을 그대로 Veo 에 전달
#           (구 동작). LLM 키 없이 빠른 검증 가능하지만 production 과 다른 결과.
USE_LLM_PROMPT: bool = True

# EDIT_PROMPT_INTERACTIVELY
#   USE_LLM_PROMPT=True 일 때만 의미 있음.
#   True  → LLM 한국어 미리보기 후 일시정지. 결과를 korean_preview.txt 로 저장하고
#           사용자가 본인 에디터로 파일 편집 후 터미널에서 Enter 누르면, 수정본을
#           다시 읽어 LLM Phase 2 로 진행. (사장님이 textarea 편집하는 것과 등가)
#   False → LLM 한국어 미리보기를 그대로 사용 (편집 단계 skip).
EDIT_PROMPT_INTERACTIVELY: bool = False

OUTPUT_DIR = "outputs"


# =====================================================================
# 메인
# =====================================================================
def main():
    if not os.environ.get("FAL_KEY"):
        raise SystemExit("FAL_KEY 미설정. .env 에 FAL_KEY=... 추가하세요.")
    if not os.path.exists(INPUT_IMAGE_PATH):
        raise SystemExit(f"입력 이미지 없음: {INPUT_IMAGE_PATH}")

    # 한 폴더에 모두 저장 (pipeline_<ts>_<simulation>)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(OUTPUT_DIR) / f"pipeline_{ts}_{SIMULATION}"
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"[풀 파이프라인 시작]\n저장 폴더: {run_dir}\n")

    # ─── (디버깅용) 가장 최근 analyze_* 폴더의 결과물을 run_dir 로 복사 ───
    # pipeline 이 Moondream 을 새로 호출하진 않지만 (analyze.py 단독 실행 의도),
    # 이번 run 에 사용된 분석 결과 + reasoning 트레이스를 같은 폴더에 함께 보존해서
    # 사후 디버깅 (모델이 케이크를 어떻게 인식했는지 / 왜 그 visual_identity 가 박혔는지)
    # 추적이 쉽도록 한다.
    analyze_dirs = sorted(
        [p for p in Path(OUTPUT_DIR).glob("analyze_*") if p.is_dir()],
        reverse=True,
    )
    if analyze_dirs:
        src = analyze_dirs[0]
        copied = []
        for fname in ("analysis.json", "raw_response.txt", "full_response.json"):
            src_path = src / fname
            if src_path.exists():
                (run_dir / f"0_{fname}").write_text(
                    src_path.read_text(encoding="utf-8"),
                    encoding="utf-8",
                )
                copied.append(fname)
        if copied:
            print(f"[Moondream 분석 결과 복사] {src.name} → {', '.join('0_' + f for f in copied)}\n")
    else:
        print(f"[Moondream 분석] outputs/analyze_* 폴더 없음 — analyze.py 먼저 실행 권장\n")

    # ─── Phase 1: 키프레임 생성 ───
    print("=" * 60)
    print("Phase 1 — 키프레임 생성 (generate_keyframe)")
    print("=" * 60)
    kf = generate_keyframe.generate_keyframe(
        image_path=INPUT_IMAGE_PATH,
        simulation=SIMULATION,
        focus=FOCUS,
        background=BACKGROUND,
        hint=USER_HINT,
        seed=SEED,
        save_dir=run_dir,    # ← 같은 폴더에 저장하도록 지정
        aspect_ratio=ASPECT_RATIO,
    )

    # ─── (옵션) Phase 1.5 — LLM 오토 프롬프팅 (production parity) ───
    # USE_LLM_PROMPT=True 면 API 흐름과 동일한 LLM Phase 1+2 거쳐 최종 영상 프롬프트 생성.
    # USE_LLM_PROMPT=False 면 video_template 의 {focus} 치환본을 그대로 사용 (구 동작).
    video_prompt: str
    negative_prompt: Optional[str] = None
    duration: Optional[str] = None
    if USE_LLM_PROMPT:
        print("\n" + "=" * 60)
        print("Phase 1.5 — LLM 오토 프롬프팅 (한국어 미리보기 + 한→영 + 잠금 결합)")
        print("=" * 60)

        # analysis 가 디스크에 있으면 cake_type 을 dessert_info 로 활용
        analysis = None
        try:
            analysis = generate_keyframe.load_latest_analysis()
        except FileNotFoundError:
            pass
        dessert_info = (analysis.get("cake_type") if analysis else None) or "케이크"

        # LLM Phase 1 — 한국어 미리보기
        print("[LLM Phase 1] 한국어 미리보기 생성 중...")
        korean_preview = prompt_builder.build_korean_preview(
            simulation=SIMULATION,
            focus=kf["focus"],
            background=BACKGROUND,
            hint=USER_HINT,
            dessert_info=dessert_info,
            analysis=analysis,
        )
        print(f"\n[한국어 미리보기]\n{korean_preview}\n")

        # (옵션) 사용자 편집 대기
        if EDIT_PROMPT_INTERACTIVELY:
            preview_path = run_dir / "korean_preview.txt"
            preview_path.write_text(korean_preview, encoding="utf-8")
            print(f"[편집 모드] {preview_path}")
            print(f"   → 본인 에디터로 위 파일을 열어 한국어 묘사 수정 후")
            print(f"   → 이 터미널로 돌아와 Enter 누르면 진행됩니다.")
            input("[Enter 대기...] ")
            korean_preview = preview_path.read_text(encoding="utf-8").strip()
            print(f"\n[편집된 한국어 미리보기]\n{korean_preview}\n")

        # LLM Phase 2 — 한→영 번역 + 잠금 라이브러리 결합
        print("[LLM Phase 2] 영어 영상 프롬프트 + 잠금 결합 중...")
        final = prompt_builder.assemble_final_video_prompt(
            user_korean_text=korean_preview,
            simulation=SIMULATION,
            background=BACKGROUND,
        )
        video_prompt = final["prompt"]
        negative_prompt = final["negative_prompt"]
        duration = final["duration"]
        print(f"\n[최종 영어 프롬프트]\n{video_prompt}\n")
        print(f"[부정 프롬프트] {negative_prompt[:120]}...")
        print(f"[duration]     {duration}\n")

        # 디버깅용 저장 — 어떤 프롬프트로 영상이 만들어졌는지 추적 가능
        (run_dir / "video_prompt_final.txt").write_text(
            f"=== 한국어 미리보기 ===\n{korean_preview}\n\n"
            f"=== 최종 영어 프롬프트 (Veo 입력) ===\n{video_prompt}\n\n"
            f"=== 부정 프롬프트 ===\n{negative_prompt}\n\n"
            f"=== duration ===\n{duration}\n",
            encoding="utf-8",
        )
    else:
        print("\n[USE_LLM_PROMPT=False] LLM skip — video_template 직접 사용")
        video_prompt = kf["video_prompt"]

    # ─── Phase 2: 영상 생성 ───
    print("\n" + "=" * 60)
    print("Phase 2 — 영상 생성 (generate_video)")
    print("=" * 60)

    # frame_strategy에 따라 start/end 결정
    #   i2i_is_end   → base_url=START, keyframe=END  (smash/fork_bite/cut_in_half/cream_scoop)
    #   i2i_is_start → keyframe=START, base_url=END  (strawberry_fall/strawberry_cascade)
    if kf["frame_strategy"] == "i2i_is_end":
        start_url, end_url = kf["base_url"], kf["keyframe_url"]
    else:
        start_url, end_url = kf["keyframe_url"], kf["base_url"]

    vid = generate_video.generate_video(
        start_url=start_url,
        end_url=end_url,
        video_prompt=video_prompt,
        save_dir=run_dir,    # ← 같은 폴더
        duration=duration,
        negative_prompt=negative_prompt,
    )

    # ─── 최종 요약 ───
    print("\n" + "=" * 60)
    print(f"풀 파이프라인 완료 — {run_dir}/")
    print("=" * 60)
    if analyze_dirs:
        print(f"  0_analysis.json     (Moondream3 정형 분석)")
        print(f"  0_raw_response.txt  (Moondream3 원본 응답 — reasoning 사고 흐름 포함)")
        print(f"  0_full_response.json (fal.ai 응답 전체)")
    print(f"  1_input.jpg         (원본)")
    if BACKGROUND:
        print(f"  2_background.jpg    (배경 교체 = '{BACKGROUND}')")
    else:
        print(f"  (2_background.jpg   skip — BACKGROUND=None)")
    print(f"  3_keyframe.jpg      ({SIMULATION} × focus='{kf['focus']}')")
    if USE_LLM_PROMPT:
        print(f"  video_prompt_final.txt  (한국어 + 영어 + 부정 프롬프트 디버깅 로그)")
        if EDIT_PROMPT_INTERACTIVELY:
            print(f"  korean_preview.txt  (사용자 편집본)")
    print(f"  4_video.mp4         (Veo 3.1 first-last-frame)")
    print(f"  metadata.json       (키프레임 메타) ← Phase 1이 덮어씀")
    print()
    print(f"[키프레임 URL] {kf['keyframe_url']}")
    print(f"[영상 URL]    {vid['video_url']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
