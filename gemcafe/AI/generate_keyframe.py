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
SIMULATION = "cross_section_cut"      # cross_section_cut | lift_slice | topping_fall
FOCUS = None                           # None=자동, "strawberry" 등=수동
BACKGROUND = None                      # None=교체 안 함, "white_marble" 등
USER_HINT = None

# 재생성용 — 매번 다른 결과 원하면 None(랜덤). 재현 원하면 정수 박기.
SEED = None

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
    """outputs/ 안의 가장 최근 analyze_* 폴더에서 analysis.json 로드."""
    analyze_dirs = sorted(
        [p for p in Path(OUTPUT_DIR).glob("analyze_*") if p.is_dir()],
        reverse=True,
    )
    if not analyze_dirs:
        raise SystemExit(
            "analyze 결과 폴더 없음. 먼저 'python analyze.py' 실행하거나 "
            "FOCUS = '...' 로 수동 지정하세요."
        )
    analysis_path = analyze_dirs[0] / "analysis.json"
    if not analysis_path.exists():
        raise SystemExit(f"{analysis_path} 없음")
    with open(analysis_path, encoding="utf-8") as f:
        analysis = json.load(f)
    print(f"[분석 로드] {analysis_path}")
    return analysis


def resolve_focus(focus_setting: Optional[str]) -> tuple[str, Optional[dict]]:
    if focus_setting is not None:
        print(f"[FOCUS] 수동 지정: '{focus_setting}'")
        return focus_setting, None
    analysis = load_latest_analysis()
    options = analysis.get("suggested_focus") or []
    if not options:
        raise SystemExit("suggested_focus 비어있음")
    chosen = options[0]
    print(f"[FOCUS] 자동 선택: '{chosen}' (후보: {options})")
    return chosen, analysis


def call_nano_banana_edit(
    image_url: str, prompt: str, system_prompt: str, seed: Optional[int] = None
) -> str:
    """nano-banana-pro/edit 공통 호출."""
    args = {
        "prompt": prompt,
        "image_urls": [image_url],
        "system_prompt": system_prompt,
        "aspect_ratio": "auto",
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
) -> dict:
    """
    키프레임 1장 생성. 재호출 가능 (재생성 흐름용).

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
        }
    """
    # 1) Focus 해석
    resolved_focus, _loaded = resolve_focus(focus)

    # 2) 프롬프트 빌드
    prompts = prompt_builder.build_prompts(
        simulation=simulation,
        focus=resolved_focus,
        background=background,
        hint=hint,
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

    # 5) [2/3] 배경 교체 (선택)
    if background:
        print(f"[2/3] 배경 교체: '{background}'")
        bg_prompt = prompt_builder.build_background_prompt(background)
        bg_url = call_nano_banana_edit(image_url, bg_prompt, prompts["system_prompt"], seed)
        bg_local = save_dir / "2_background.jpg"
        download_file(bg_url, str(bg_local))
        print(f"      → 배경 교체 이미지: {bg_url}")
        print(f"      → 저장: {bg_local}")
        base_url = bg_url
    else:
        print(f"[2/3] 배경 교체: skip (background=None)")
        base_url = image_url

    # 6) [3/3] 시뮬레이션 키프레임
    print(f"[3/3] 키프레임 생성")
    keyframe_url = call_nano_banana_edit(
        base_url,
        prompts["instruction_prompt"],
        prompts["system_prompt"],
        seed,
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
