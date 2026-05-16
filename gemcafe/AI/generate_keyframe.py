"""
키프레임 생성 전용 스크립트.

호출 1번 = 키프레임 1장 생성.
STEP 7 검수/재생성 흐름에서 프론트가 이 스크립트(또는 함수)를
SEED만 바꿔서 최대 3번 호출해서 후보 모음.

흐름 (3단계):
  1) 입력 이미지 업로드
  2) (선택) 배경 교체 — BACKGROUND 지정 시
  3) 시뮬레이션 키프레임 생성 (nano-banana-pro/edit)

출력:
  outputs/keyframe_<timestamp>_<simulation>_<focus>/
    1_input.jpg
    2_background.jpg     (BACKGROUND 지정 시만)
    3_keyframe.jpg
    metadata.json        ← 다음 단계(generate_video.py)에서 읽음
"""
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional
import fal_client
import requests
from dotenv import load_dotenv

import prompt_builder

load_dotenv()

# =====================================================================
# 설정
# =====================================================================
ENDPOINT_EDIT = "fal-ai/nano-banana-pro/edit"

INPUT_IMAGE_PATH = "./test_cake.jpg"

# 시뮬레이션 / focus / 배경 / 힌트 (pipeline.py 와 동일 의미)
SIMULATION = "cut_in_half"             # smash | fork_bite | cut_in_half | cream_scoop |
                                       # strawberry_fall | strawberry_cascade
FOCUS = None                           # None=자동, "strawberry" 등=수동
BACKGROUND = None                      # None=교체 안 함, "white_marble" 등
USER_HINT = None

# 재생성용 — 매번 다른 결과 원하면 None(랜덤). 재현 원하면 정수 박기.
SEED = None

# 키프레임 종횡비 (CLI 단독 실행용 디폴트)
#   "9:16" → 숏폼/세로 (YouTube Shorts / Reels / TikTok) — production 기본
#   "16:9" → 가로
#   "1:1"  → 정사각형
#   "auto" → fal.ai 자동 추론 (원본 이미지 비율 따라감)
# 배경 교체와 키프레임 양쪽에 같은 값을 적용해야 Veo first-last-frame 이 정상 동작.
KEYFRAME_ASPECT_RATIO = "9:16"

OUTPUT_DIR = "outputs"


# =====================================================================
# 진행 로그 콜백
# =====================================================================
def on_queue_update(update):
    if isinstance(update, fal_client.InProgress):
        for log in (update.logs or []):
            msg = log.get("message", "")
            if msg:
                print(f"      [fal] {msg}")


# =====================================================================
# 헬퍼
# =====================================================================
def load_latest_analysis() -> dict:
    """outputs/ 안의 가장 최근 analyze_* 폴더에서 analysis.json 로드 (CLI 단독 실행용)."""
    analyze_dirs = sorted(
        [p for p in Path(OUTPUT_DIR).glob("analyze_*") if p.is_dir()],
        reverse=True,
    )
    if not analyze_dirs:
        raise FileNotFoundError(
            "analyze 결과 폴더 없음. 먼저 'python analyze.py' 실행하거나 "
            "FOCUS = '...' 로 수동 지정하세요."
        )
    analysis_path = analyze_dirs[0] / "analysis.json"
    if not analysis_path.exists():
        raise FileNotFoundError(f"{analysis_path} 없음")
    with open(analysis_path, encoding="utf-8") as f:
        analysis = json.load(f)
    print(f"[분석 로드] {analysis_path}")
    return analysis


def resolve_focus(
    focus_setting: Optional[str],
    analysis: Optional[dict] = None,
    simulation: Optional[str] = None,
) -> tuple[str, Optional[dict]]:
    """
    Focus 값 결정. 우선순위:
      1) focus_setting 직접 지정 → 그대로 사용 (analysis 무시)
      2) simulation 에 category 정의됨 → derive_focus_from_category()
         (시트/크림/토핑 카테고리 → analysis 의 base/cream/topping 첫 요소)
      3) analysis['suggested_focus'][0] (구 동작 — 카테고리 없는 시뮬용 폴백)
      4) focus_setting=None + analysis=None → 디스크에서 최신 analysis 로드 (CLI fallback)

    멀티유저 환경(API 호출)에서는 analysis를 명시적으로 넘기는 게 안전.
    디스크 로드는 단독 실행(CLI) 편의를 위한 fallback.
    """
    if focus_setting is not None:
        print(f"[FOCUS] 수동 지정: '{focus_setting}'")
        return focus_setting, None

    if analysis is None:
        analysis = load_latest_analysis()  # CLI fallback

    # 카테고리 기반 자동 결정 우선 시도 (simulation 이 주어진 경우만)
    if simulation:
        derived = prompt_builder.derive_focus_from_category(simulation, analysis)
        if derived is not None:
            print(f"[FOCUS] 카테고리 자동 결정: '{derived}' (simulation='{simulation}')")
            return derived, analysis

    # 폴백: suggested_focus (카테고리 없는 시뮬 / 구 시뮬)
    options = analysis.get("suggested_focus") or []
    if not options:
        raise ValueError(
            "suggested_focus가 비어있음. analysis 결과 확인 필요 "
            "(또는 focus를 명시적으로 지정)"
        )
    chosen = options[0]
    print(f"[FOCUS] suggested_focus 폴백: '{chosen}' (후보: {options})")
    return chosen, analysis


def call_nano_banana_edit(
    image_url: str,
    prompt: str,
    system_prompt: str,
    seed: Optional[int] = None,
    aspect_ratio: str = "auto",
) -> str:
    """nano-banana-pro/edit 공통 호출."""
    args = {
        "prompt": prompt,
        "image_urls": [image_url],
        "system_prompt": system_prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": "2K",
        "output_format": "png",
    }
    if seed is not None:
        args["seed"] = seed
    result = fal_client.subscribe(
        ENDPOINT_EDIT,
        arguments=args,
        with_logs=True,
        on_queue_update=on_queue_update,
    )
    if not result.get("images"):
        raise RuntimeError(
            f"편집 실패. 응답: "
            f"{json.dumps(result, indent=2, ensure_ascii=False, default=str)[:1000]}"
        )
    return result["images"][0]["url"]


def download_file(url: str, save_path: str) -> str:
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as res:
        res.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in res.iter_content(chunk_size=8192):
                f.write(chunk)
    return save_path


# =====================================================================
# 핵심 함수 — BE/프론트가 import 해서 호출할 수 있게 라이브러리 형태
# =====================================================================
def generate_keyframe(
    image_path: str,
    simulation: str,
    focus: Optional[str] = None,
    background: Optional[str] = None,
    hint: Optional[str] = None,
    seed: Optional[int] = None,
    save_dir: Optional[Path] = None,
    analysis: Optional[dict] = None,
    aspect_ratio: str = "9:16",
) -> dict:
    """
    키프레임 1장 생성. 재호출 가능 (재생성 흐름용).

    aspect_ratio: 키프레임 종횡비. 배경 교체와 키프레임 양쪽에 동일 적용.
                  "9:16"(숏폼, 기본) / "16:9" / "1:1" / "auto".

    Returns:
        {
          "keyframe_url":      str,    # 생성된 키프레임 URL
          "base_url":          str,    # 원본 또는 배경 교체된 이미지 URL
          "input_image_url":   str,    # 최초 업로드한 원본 URL
          "frame_strategy":    str,    # "i2i_is_end" or "i2i_is_start"
          "video_prompt":      str,    # 다음 단계에서 사용할 영상 프롬프트
          "system_prompt":     str,
          "instruction_prompt": str,
          "background_swapped": bool,
          "save_dir":          str,
          "simulation":        str,
          "focus":             str,
          "background":        Optional[str],
          "hint":              Optional[str],
          "seed":              Optional[int],
          "aspect_ratio":      str,    # 영상 단계에서 참조 가능
        }
    """
    # 0) analysis 가 없으면 디스크에서 best-effort 로드 (visual identity 가이드용).
    #    실패해도 fatal 아님 — instruction_prompt 에 시각 식별 정보만 빠지고 진행.
    #    focus 가 None 인 경우엔 resolve_focus 가 어차피 load 시도하므로 여기서 미리 잡기.
    if analysis is None:
        try:
            analysis = load_latest_analysis()
            print(f"[analysis] 디스크에서 자동 로드 (visual identity 가이드용)")
        except FileNotFoundError:
            print(f"[analysis] 디스크에 없음 — visual identity 가이드 생략")
            analysis = None

    # 1) Focus 해석 — simulation 의 category 가 있으면 카테고리 기반 자동 결정
    resolved_focus, _ = resolve_focus(focus, analysis=analysis, simulation=simulation)

    # 2) 프롬프트 빌드 (analysis 가 있으면 visual identity 가이드가 instruction 앞에 박힘)
    prompts = prompt_builder.build_prompts(
        simulation=simulation,
        focus=resolved_focus,
        background=background,
        hint=hint,
        analysis=analysis,
    )
    print(f"[시뮬레이션] {simulation} ({prompts['label_kr']}) × focus='{resolved_focus}'")
    print(f"[frame_strategy] {prompts['frame_strategy']}")
    if seed is not None:
        print(f"[seed] {seed}")

    # 3) 저장 폴더 (지정 안 됐으면 keyframe_<ts>_... 폴더 자동 생성)
    if save_dir is None:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_dir = Path(OUTPUT_DIR) / f"keyframe_{ts}_{simulation}_{resolved_focus}"
    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    print(f"[저장 폴더] {save_dir}\n")

    # 4) [1/3] 업로드
    input_local = save_dir / "1_input.jpg"
    shutil.copy(image_path, input_local)
    print(f"[1/3] 이미지 업로드: {image_path}")
    image_url = fal_client.upload_file(image_path)
    print(f"      → {image_url}")
    print(f"      → 저장: {input_local}")

    # 저장 파일명 규칙:
    #   2_start_frame.jpg  → Veo 가 받는 영상 첫 프레임 (bg-swap 결과 또는 시작 프레임 I2I 결과)
    #   3_keyframe.jpg     → I2I (instruction_template) 결과. frame_strategy 에 따라
    #                        start 또는 end 프레임으로 사용됨.
    start_frame_filename = "2_start_frame.jpg"

    # 같은 seed로 nano-banana 여러 번 호출 시 결과가 서로 영향 받을 수 있어 분리.
    # bg 교체 = seed, 시작 프레임 I2I = seed+2, 키프레임 = seed+1.
    # (둘/셋 다 None이면 그대로 None.)
    bg_seed = seed
    kf_seed = (seed + 1) if seed is not None else None
    sf_seed = (seed + 2) if seed is not None else None

    start_frame_prompt = prompts.get("start_frame_prompt")

    # 5) [2/3] 배경 교체 (선택). 시작 프레임 I2I 가 뒤따르면 이 결과는 중간물(URL만 사용).
    if background:
        print(f"[2/3] 배경 교체: '{background}' (seed={bg_seed}, aspect={aspect_ratio})")
        bg_prompt = prompt_builder.build_background_prompt(background)
        bg_url = call_nano_banana_edit(
            image_url, bg_prompt, prompts["system_prompt"], bg_seed, aspect_ratio
        )
        print(f"      → 배경 교체 이미지: {bg_url}")
        # 시작 프레임 I2I 단계가 없으면 이게 곧 첫 프레임 → 저장.
        if not start_frame_prompt:
            bg_local = save_dir / start_frame_filename
            download_file(bg_url, str(bg_local))
            print(f"      → 저장 (첫 프레임): {bg_local}")
        base_url = bg_url
    else:
        print(f"[2/3] 배경 교체: skip (background=None)")
        base_url = image_url

    # 5b) 시뮬에 start_frame_template 가 정의돼 있으면 시작 프레임 I2I 호출 추가.
    #     (예: cream_scoop — 슬라이스를 장갑 낀 손이 잡은 자세를 첫 프레임으로 생성)
    #     이 결과가 영상의 실제 첫 프레임이 되고, 동시에 마지막 프레임 I2I 의 입력이 됨.
    if start_frame_prompt:
        print(f"[추가] 시작 프레임 I2I (seed={sf_seed}, aspect={aspect_ratio})")
        first_frame_url = call_nano_banana_edit(
            base_url,
            start_frame_prompt,
            prompts["system_prompt"],
            sf_seed,
            aspect_ratio,
        )
        first_frame_local = save_dir / start_frame_filename
        download_file(first_frame_url, str(first_frame_local))
        print(f"      → 첫 프레임: {first_frame_url}")
        print(f"      → 저장 (첫 프레임): {first_frame_local}")
        base_url = first_frame_url

    # 6) [3/3] 시뮬레이션 키프레임 (마지막 프레임).
    #    start_frame_prompt 가 있었다면 입력은 그 결과, 없었다면 bg-swap 또는 원본.
    print(f"[3/3] 키프레임 생성 (seed={kf_seed}, aspect={aspect_ratio})")
    keyframe_url = call_nano_banana_edit(
        base_url,
        prompts["instruction_prompt"],
        prompts["system_prompt"],
        kf_seed,
        aspect_ratio,
    )
    keyframe_local = save_dir / "3_keyframe.jpg"
    download_file(keyframe_url, str(keyframe_local))
    print(f"      → 키프레임: {keyframe_url}")
    print(f"      → 저장: {keyframe_local}")

    # 7) 메타데이터 저장
    result = {
        "keyframe_url": keyframe_url,
        "base_url": base_url,
        "input_image_url": image_url,
        "frame_strategy": prompts["frame_strategy"],
        "video_prompt": prompts["video_prompt"],
        "system_prompt": prompts["system_prompt"],
        "instruction_prompt": prompts["instruction_prompt"],
        "background_swapped": background is not None,
        "save_dir": str(save_dir),
        "simulation": simulation,
        "focus": resolved_focus,
        "background": background,
        "hint": hint,
        "seed": seed,
        "aspect_ratio": aspect_ratio,
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
    }
    (save_dir / "metadata.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return result


# =====================================================================
# 단독 실행
# =====================================================================
def main():
    if not os.environ.get("FAL_KEY"):
        raise SystemExit("FAL_KEY 미설정")
    if not os.path.exists(INPUT_IMAGE_PATH):
        raise SystemExit(f"입력 이미지 없음: {INPUT_IMAGE_PATH}")

    result = generate_keyframe(
        image_path=INPUT_IMAGE_PATH,
        simulation=SIMULATION,
        focus=FOCUS,
        background=BACKGROUND,
        hint=USER_HINT,
        seed=SEED,
        aspect_ratio=KEYFRAME_ASPECT_RATIO,
    )

    print("\n" + "=" * 60)
    print(f"키프레임 생성 완료")
    print("=" * 60)
    print(f"  저장 폴더:   {result['save_dir']}")
    print(f"  keyframe:    {result['keyframe_url']}")
    print(f"  base:        {result['base_url']}")
    print(f"  strategy:    {result['frame_strategy']}")
    print()
    print("다음 단계: python generate_video.py")
    print("(또는 SEED 다른 값으로 다시 이 스크립트 실행해서 재생성)")
    print("=" * 60)


if __name__ == "__main__":
    main()
