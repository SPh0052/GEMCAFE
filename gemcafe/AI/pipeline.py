"""
이미지 + 자연어 지시문 → 5초 영상 파이프라인 (instruction-based).

흐름:
  1) 입력 이미지를 fal.ai 스토리지에 업로드
  2) nano-banana-pro로 instruction-based 이미지 편집 (END 프레임 생성)
  3) Veo 3.1 first-last-frame으로 START → END 보간 영상 생성

실행:
  1) FAL_KEY 환경변수 설정 (또는 .env 파일에 FAL_KEY=...)
  2) 아래 INPUT 블록의 변수들을 본인 케이스에 맞게 수정
  3) python pipeline.py

⚠️ fal.ai endpoint ID와 입력 필드명은 추정치입니다. fal.ai/models에서 확인 후
   ENDPOINT_* 상수와 step2_edit 함수의 arguments를 갈아끼우세요.
"""
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
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
# 입력 (지금은 하드코딩 — 나중에 함수 인자로 빼면 됨)
# =====================================================================
INPUT_IMAGE_PATH = "./test_cake.jpg"

# nano-banana-pro/edit에게 부여할 "역할/페르소나" — 자유 재해석 억제용.
# (스키마의 system_prompt 필드. 비워두려면 "" 로.)
SYSTEM_PROMPT = (
    "You are a precise photo editor. Your only job is to preserve the input image "
    "pixel-by-pixel and apply ONLY the specific edit requested in the user prompt. "
    "Never regenerate, replace, or reinterpret existing elements. "
    "Treat the input image as immutable except for the explicit additions requested."
)

# nano-banana-pro/edit에 넘길 자연어 지시문 (영어 권장).
# ⚠️ Instruction 모델은 종종 전체 장면을 새로 그려버림 (= "다른 케이크" 문제).
# 보존을 강하게 잠그는 프롬프트 패턴:
#   1) 원본 보존을 첫 문장에 명시 ("DO NOT REGENERATE")
#   2) 유지할 요소를 구체적으로 나열
#   3) 변경할 것을 "단 하나의 ADD" 형태로 좁게 표현
#   4) 마지막에 또 한 번 보존 강조
INSTRUCTION_PROMPT = (
    "DO NOT regenerate or replace the cake. Use the exact input image as the base "
    "and only ADD one new object on top. "
    "Preserve the input image pixel-by-pixel: the exact same cake shape, "
    "the exact strawberry on top, the exact cream pattern, the exact sponge layers, "
    "the cupcake liner, the wooden table, the lighting, and the camera angle — "
    "all must remain identical to the input. "
    "ADD ONLY this single new element: a metal fork descending from above and "
    "pressed into the top of the cake, with the tines partially embedded in the cream. "
    "Keep cream squeezing out slightly around the fork tines as the only deformation. "
    "Do not alter, replace, or redraw anything else. "
    "Match the original photo's lighting, color tone, and resolution exactly."
)

# Veo 3.1에 넘길 영상 프롬프트 (start → end 사이의 동작 묘사)
VIDEO_PROMPT = (
    "A metal fork descends from above and slowly presses down into the cake, "
    "deforming the soft surface as cream squeezes out around the tines."
)

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
def step1_upload(path: str) -> str:
    print(f"[1/3] 이미지 업로드: {path}")
    url = fal_client.upload_file(path)
    print(f"      → {url}")
    return url


def step2_edit(image_url: str, instruction: str) -> str:
    """
    nano-banana-pro/edit로 instruction-based 이미지 편집. 편집된 이미지 URL 반환.
    """
    print(f"[2/3] nano-banana-pro/edit 이미지 편집")
    result = fal_client.subscribe(
        ENDPOINT_EDIT,
        arguments={
            "prompt": instruction,
            "image_urls": [image_url],
            "system_prompt": SYSTEM_PROMPT,
            "aspect_ratio": "auto",          # 입력 이미지 비율 그대로 유지
            "resolution": "2K",              # 1K / 2K / 4K (해상도 ↑ = 디테일 ↑, 비용 ↑)
            "output_format": "png",
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    # 응답에서 편집된 이미지 URL 추출
    if not result.get("images"):
        debug_dump = json.dumps(result, indent=2, ensure_ascii=False, default=str)
        raise RuntimeError(f"편집된 이미지 URL을 찾지 못함. 응답: {debug_dump[:1000]}")

    edited_url = result["images"][0]["url"]
    print(f"      → 편집된 이미지: {edited_url}")
    return edited_url


def download_file(url: str, save_path: str) -> str:
    """URL에서 파일을 다운받아 로컬에 저장. 저장 경로 반환."""
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as res:
        res.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in res.iter_content(chunk_size=8192):
                f.write(chunk)
    return save_path


def step3_animate(start_url: str, end_url: str, prompt: str) -> str:
    """Veo 3.1 first-last-frame으로 start→end 프레임 보간 영상 생성. 영상 URL 반환."""
    print(f"[3/3] Veo 3.1 first-last-frame 영상 생성 (start → end 보간, 1~3분 소요)")
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

    # 이번 실행 결과물을 모아둘 폴더 만들기 (timestamp별)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(OUTPUT_DIR) / ts
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n결과물 저장 폴더: {run_dir}\n")

    # [1/3] 입력 이미지 (= START 프레임)
    input_local = run_dir / "1_input.jpg"
    shutil.copy(INPUT_IMAGE_PATH, input_local)
    image_url = step1_upload(INPUT_IMAGE_PATH)
    print(f"      → 저장: {input_local}")

    # [2/3] nano-banana-pro 편집 결과 (= END 프레임)
    end_frame_url = step2_edit(image_url, INSTRUCTION_PROMPT)
    end_frame_local = run_dir / "2_end_frame.jpg"
    download_file(end_frame_url, str(end_frame_local))
    print(f"      → 저장: {end_frame_local}")

    # [3/3] Veo 3.1 first-last-frame 영상 (원본 = START, 편집된 이미지 = END)
    video_url = step3_animate(image_url, end_frame_url, VIDEO_PROMPT)
    video_local = run_dir / "3_video.mp4"
    download_file(video_url, str(video_local))
    print(f"      → 저장: {video_local}")

    # 메타데이터 JSON 저장 (URL/프롬프트 기록 — 나중에 추적용)
    meta = {
        "timestamp": ts,
        "input_image": INPUT_IMAGE_PATH,
        "instruction_prompt": INSTRUCTION_PROMPT,
        "video_prompt": VIDEO_PROMPT,
        "video_duration": VIDEO_DURATION,
        "i2i_model": ENDPOINT_EDIT,
        "i2v_model": ENDPOINT_I2V,
        "urls": {
            "uploaded_image_start": image_url,
            "end_frame": end_frame_url,
            "video": video_url,
        },
    }
    (run_dir / "metadata.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print("\n" + "=" * 60)
    print(f"완료 — 모든 결과물이 {run_dir}/ 에 저장됨")
    print("=" * 60)
    print(f"  1_input.jpg         (원본 = 영상 START 프레임)")
    print(f"  2_end_frame.jpg     (nano-banana-pro 편집 = 영상 END 프레임)")
    print(f"  3_video.mp4         (Veo 3.1 first-last-frame으로 START → END 보간)")
    print(f"  metadata.json       (URL/프롬프트 기록)")
    print("=" * 60)


if __name__ == "__main__":
    main()
