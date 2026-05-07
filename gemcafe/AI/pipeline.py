"""
이미지 + 시뮬레이션/focus/배경 선택 → 영상 파이프라인 (instruction-based).

흐름 (4단계):
  1) 입력 이미지를 fal.ai 스토리지에 업로드
  2) (선택) 배경 교체 — BACKGROUND 지정 시 nano-banana-pro/edit으로 배경만 교체
  3) 시뮬레이션 키프레임 — nano-banana-pro/edit으로 자르기/들어올리기/토핑 적용
  4) Veo 3.1 first-last-frame으로 START → END 보간 영상 생성

실행:
  1) FAL_KEY 환경변수 설정 (또는 .env 파일에 FAL_KEY=...)
  2) 'python analyze.py'로 케이크 분석 (FOCUS=None일 때만 필요)
  3) 아래 입력 블록의 SIMULATION/FOCUS/BACKGROUND 값을 케이스에 맞게 수정
  4) python pipeline.py
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

load_dotenv()  # .env 파일에서 FAL_KEY 자동 로드

# =====================================================================
# ⚠️ fal.ai endpoint ID — fal.ai/models 페이지에서 확인 후 수정 필요
# =====================================================================
ENDPOINT_EDIT = "fal-ai/nano-banana-pro/edit"                  # I2I (instruction-based 편집)
ENDPOINT_I2V = "fal-ai/veo3.1/first-last-frame-to-video"       # I2V (start+end 보간, Veo 3.1)

# =====================================================================
# 입력 (지금은 하드코딩 — 나중에 BE/FE 입력으로 받게 변경)
# =====================================================================
INPUT_IMAGE_PATH = "./test_cake.jpg"

# 시뮬레이션 종류 (prompt_builder.SIMULATIONS의 키)
#   "cross_section_cut"  단면 자르기
#   "lift_slice"         한 조각 들어올리기
#   "topping_fall"       토핑 위에서 떨어지기
SIMULATION = "cross_section_cut"

# 강조할 요소 — None이면 outputs/analyze_* 폴더의 최신 analysis.json에서
# suggested_focus[0]을 자동으로 가져옴. 직접 지정하려면 문자열로 박기.
#   None              → 자동 (분석 결과 첫 번째 요소)
#   "strawberry"      → 수동 지정
FOCUS = None

# 배경 (선택). None이면 배경 교체 안 함 — 원본 사진 그대로 유지.
#   None              → 배경 교체 skip
#   "white_marble"    → 흰 대리석
#   "cafe_interior"   → 카페 인테리어
#   "outdoor"         → 야외
BACKGROUND = "white_marble"

# 사용자 추가 힌트 (선택). 시뮬레이션 프롬프트 끝에 붙음.
USER_HINT = None        # 예: "고급스러운 분위기로"

# Veo 3.1 옵션 (duration: "4s"/"6s"/"8s" 만 가능, 문자열)
VIDEO_DURATION = "6s"           # ⚠️ 정수 아니라 문자열. 4/6/8초만 허용.
VIDEO_RESOLUTION = "720p"       # 720p / 1080p / 4k
VIDEO_GENERATE_AUDIO = False    # 무음
VIDEO_NEGATIVE_PROMPT = "blur, distort, low quality, deformed, ugly"

# 결과물 저장 폴더 (실행마다 timestamp로 새 폴더 생성)
# 상대 경로: pipeline.py 실행 위치 기준. gemcafe/AI/outputs/<timestamp>/ 에 저장됨.
OUTPUT_DIR = "outputs"


# =====================================================================
# 진행 로그 콜백 (큐 폴링 중 fal.ai가 보내주는 로그 출력)
# =====================================================================
def on_queue_update(update):
    if isinstance(update, fal_client.InProgress):
        for log in (update.logs or []):
            msg = log.get("message", "")
            if msg:
                print(f"      [fal] {msg}")


# =====================================================================
# 단계별 함수
# =====================================================================
def load_latest_analysis() -> dict:
    """outputs/ 안의 가장 최근 analyze_* 폴더에서 analysis.json 로드."""
    analyze_dirs = sorted(
        [p for p in Path(OUTPUT_DIR).glob("analyze_*") if p.is_dir()],
        reverse=True,
    )
    if not analyze_dirs:
        raise SystemExit(
            "analyze 결과 폴더를 찾을 수 없습니다.\n"
            "먼저 'python analyze.py' 를 실행해서 이미지를 분석하세요.\n"
            "(또는 FOCUS = '...' 로 수동 지정해도 됩니다)"
        )
    latest = analyze_dirs[0]
    analysis_path = latest / "analysis.json"
    if not analysis_path.exists():
        raise SystemExit(f"{analysis_path} 파일이 없습니다.")

    with open(analysis_path, encoding="utf-8") as f:
        analysis = json.load(f)

    print(f"[분석 로드] {analysis_path}")
    return analysis


def resolve_focus(focus_setting: Optional[str]) -> tuple[str, Optional[dict]]:
    """
    FOCUS 설정값을 해석:
      - 문자열로 박혀있으면 → 그대로 사용 (analysis는 None)
      - None이면 → 최신 analysis.json 로드해서 suggested_focus[0] 사용
    Returns: (focus_key, analysis_dict_or_None)
    """
    if focus_setting is not None:
        print(f"[FOCUS] 수동 지정: '{focus_setting}'")
        return focus_setting, None

    analysis = load_latest_analysis()
    options = analysis.get("suggested_focus") or []
    if not options:
        raise SystemExit(
            "분석 결과에 suggested_focus가 비어있습니다.\n"
            "analysis.json 확인하거나 FOCUS = '...' 로 수동 지정하세요."
        )
    chosen = options[0]
    print(f"[FOCUS] 자동 선택: '{chosen}' (suggested_focus 후보: {options})")
    return chosen, analysis


def step_upload(path: str) -> str:
    print(f"[1/4] 이미지 업로드: {path}")
    url = fal_client.upload_file(path)
    print(f"      → {url}")
    return url


def call_nano_banana_edit(image_url: str, prompt: str, system_prompt: str) -> str:
    """nano-banana-pro/edit 공통 호출 함수. 편집된 이미지 URL 반환."""
    result = fal_client.subscribe(
        ENDPOINT_EDIT,
        arguments={
            "prompt": prompt,
            "image_urls": [image_url],
            "system_prompt": system_prompt,
            "aspect_ratio": "auto",          # 입력 이미지 비율 그대로 유지
            "resolution": "2K",              # 1K / 2K / 4K
            "output_format": "png",
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )
    if not result.get("images"):
        debug_dump = json.dumps(result, indent=2, ensure_ascii=False, default=str)
        raise RuntimeError(f"편집된 이미지 URL을 찾지 못함. 응답: {debug_dump[:1000]}")
    return result["images"][0]["url"]


def step_swap_background(image_url: str, background_key: str, system_prompt: str) -> str:
    """배경/표면만 교체. 케이크는 보존. 배경 교체된 이미지 URL 반환."""
    print(f"[2/4] 배경 교체: '{background_key}'")
    bg_prompt = prompt_builder.build_background_prompt(background_key)
    new_url = call_nano_banana_edit(image_url, bg_prompt, system_prompt)
    print(f"      → 배경 교체된 이미지: {new_url}")
    return new_url


def step_keyframe(image_url: str, instruction: str, system_prompt: str) -> str:
    """시뮬레이션 적용 (자르기/들어올리기/토핑 등). 키프레임 URL 반환."""
    print(f"[3/4] 키프레임 생성 (시뮬레이션 I2I)")
    new_url = call_nano_banana_edit(image_url, instruction, system_prompt)
    print(f"      → 키프레임: {new_url}")
    return new_url


def download_file(url: str, save_path: str) -> str:
    """URL에서 파일을 다운받아 로컬에 저장. 저장 경로 반환."""
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as res:
        res.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in res.iter_content(chunk_size=8192):
                f.write(chunk)
    return save_path


def step_animate(start_url: str, end_url: str, prompt: str) -> str:
    """Veo 3.1 first-last-frame으로 start→end 프레임 보간 영상 생성. 영상 URL 반환."""
    print(f"[4/4] Veo 3.1 first-last-frame 영상 생성 (start → end 보간, 1~3분 소요)")
    result = fal_client.subscribe(
        ENDPOINT_I2V,
        arguments={
            "prompt": prompt,
            "first_frame_url": start_url,     # start frame
            "last_frame_url": end_url,        # end frame
            "duration": VIDEO_DURATION,
            "resolution": VIDEO_RESOLUTION,
            "generate_audio": VIDEO_GENERATE_AUDIO,
            "negative_prompt": VIDEO_NEGATIVE_PROMPT,
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )
    video_url = result["video"]["url"]
    print(f"      → 영상 URL: {video_url}")
    return video_url


# =====================================================================
# 메인
# =====================================================================
def main():
    if not os.environ.get("FAL_KEY"):
        raise SystemExit("환경변수 FAL_KEY가 설정되지 않았습니다. .env 파일에 FAL_KEY=... 추가하세요.")

    if not os.path.exists(INPUT_IMAGE_PATH):
        raise SystemExit(f"입력 이미지가 없습니다: {INPUT_IMAGE_PATH}")

    # FOCUS 해석 — None이면 최신 analysis.json에서 자동 로드
    resolved_focus, loaded_analysis = resolve_focus(FOCUS)

    # 시뮬레이션 + focus 조합으로 프롬프트 동적 생성
    prompts = prompt_builder.build_prompts(
        simulation=SIMULATION,
        focus=resolved_focus,
        background=BACKGROUND,
        hint=USER_HINT,
    )
    print(f"\n[시뮬레이션] {SIMULATION} ({prompts['label_kr']}) × focus='{resolved_focus}'")
    print(f"[frame_strategy] {prompts['frame_strategy']}")

    # 이번 실행 결과물을 모아둘 폴더 만들기 (timestamp + 시뮬레이션 라벨)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(OUTPUT_DIR) / f"{ts}_{SIMULATION}_{resolved_focus}"
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"결과물 저장 폴더: {run_dir}\n")

    # [1/4] 입력 이미지 업로드
    input_local = run_dir / "1_input.jpg"
    shutil.copy(INPUT_IMAGE_PATH, input_local)
    image_url = step_upload(INPUT_IMAGE_PATH)
    print(f"      → 저장: {input_local}")

    # [2/4] 배경 교체 (BACKGROUND 지정된 경우만 실행, 아니면 skip)
    bg_swapped_url = None
    if BACKGROUND:
        bg_swapped_url = step_swap_background(
            image_url, BACKGROUND, prompts["system_prompt"]
        )
        bg_local = run_dir / "2_background.jpg"
        download_file(bg_swapped_url, str(bg_local))
        print(f"      → 저장: {bg_local}")
        base_url = bg_swapped_url   # 이후 단계에선 배경 교체된 이미지를 "원본" 취급
    else:
        print(f"[2/4] 배경 교체: skip (BACKGROUND=None)")
        base_url = image_url

    # [3/4] 시뮬레이션 키프레임 생성 (자르기/들어올리기/토핑)
    keyframe_url = step_keyframe(
        base_url,
        prompts["instruction_prompt"],
        prompts["system_prompt"],
    )
    keyframe_local = run_dir / "3_keyframe.jpg"
    download_file(keyframe_url, str(keyframe_local))
    print(f"      → 저장: {keyframe_local}")

    # [4/4] Veo 3.1 first-last-frame 영상
    # frame_strategy에 따라 start/end 결정:
    #   "i2i_is_end"   → base_url을 START, 키프레임을 END  (자르기/들어올리기)
    #   "i2i_is_start" → 키프레임을 START, base_url을 END  (토핑 떨어지기)
    if prompts["frame_strategy"] == "i2i_is_end":
        start_url, end_url = base_url, keyframe_url
    else:  # "i2i_is_start"
        start_url, end_url = keyframe_url, base_url
    print(f"\n[start frame] {start_url}")
    print(f"[end   frame] {end_url}")

    video_url = step_animate(start_url, end_url, prompts["video_prompt"])
    video_local = run_dir / "4_video.mp4"
    download_file(video_url, str(video_local))
    print(f"      → 저장: {video_local}")

    # 메타데이터 JSON 저장 (URL/프롬프트 기록 — 나중에 추적용)
    meta = {
        "timestamp": ts,
        "input_image": INPUT_IMAGE_PATH,
        "simulation": SIMULATION,
        "focus": resolved_focus,
        "focus_setting": FOCUS,                  # None이면 자동 선택, 문자열이면 수동
        "focus_source": "auto" if FOCUS is None else "manual",
        "background": BACKGROUND,                # None이면 배경 교체 안 함
        "background_swapped": BACKGROUND is not None,
        "user_hint": USER_HINT,
        "frame_strategy": prompts["frame_strategy"],
        "instruction_prompt": prompts["instruction_prompt"],
        "video_prompt": prompts["video_prompt"],
        "video_duration": VIDEO_DURATION,
        "i2i_model": ENDPOINT_EDIT,
        "i2v_model": ENDPOINT_I2V,
        "loaded_analysis": loaded_analysis,      # 자동 모드일 때 로드한 분석 결과 (수동이면 None)
        "urls": {
            "input": image_url,
            "background_swapped": bg_swapped_url,    # BACKGROUND=None일 때 None
            "keyframe": keyframe_url,
            "start_frame": start_url,
            "end_frame": end_url,
            "video": video_url,
        },
    }
    (run_dir / "metadata.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print("\n" + "=" * 60)
    print(f"완료 — 모든 결과물이 {run_dir}/ 에 저장됨")
    print("=" * 60)
    print(f"  1_input.jpg         (원본 이미지)")
    if BACKGROUND:
        print(f"  2_background.jpg    (배경 교체된 이미지 = 새 START)")
    else:
        print(f"  (2_background.jpg   skip — 배경 교체 안 함)")
    print(f"  3_keyframe.jpg      (시뮬레이션 적용 키프레임)")
    print(f"  4_video.mp4         (Veo 3.1 first-last-frame 영상)")
    print(f"  metadata.json       (선택값 + 프롬프트 + URL 기록)")
    print("=" * 60)


if __name__ == "__main__":
    main()
