"""
영상 생성 전용 스크립트.

generate_keyframe.py에서 만든 키프레임을 받아서 Veo 3.1 first-last-frame으로 영상 생성.

두 가지 입력 방식:
  1) 자동 (기본): outputs/ 안의 가장 최근 keyframe_* 폴더의 metadata.json에서 자동 로드
     → 그냥 'python generate_video.py' 실행하면 됨
  2) 수동: 아래 START_URL / END_URL / VIDEO_PROMPT 에 직접 박기

출력:
  outputs/video_<timestamp>/
    4_video.mp4
    metadata.json
"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import fal_client
import requests
from dotenv import load_dotenv

load_dotenv()

# =====================================================================
# 설정
# =====================================================================
ENDPOINT_I2V = "fal-ai/veo3.1/first-last-frame-to-video"

# 입력 URL — 셋 다 None이면 가장 최근 keyframe metadata에서 자동 로드.
# 특정 키프레임으로 영상 만들고 싶으면 여기 직접 박기.
START_URL: Optional[str] = None
END_URL: Optional[str] = None
VIDEO_PROMPT: Optional[str] = None

# Veo 3.1 옵션 (duration: "4s"/"6s"/"8s" 만 가능, 문자열)
VIDEO_DURATION = "6s"
VIDEO_RESOLUTION = "720p"           # 720p / 1080p / 4k
VIDEO_GENERATE_AUDIO = False
VIDEO_NEGATIVE_PROMPT = "blur, distort, low quality, deformed, ugly"

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
def load_latest_keyframe_metadata() -> dict:
    """outputs/ 안의 가장 최근 keyframe_* 폴더에서 metadata.json 로드."""
    keyframe_dirs = sorted(
        [p for p in Path(OUTPUT_DIR).glob("keyframe_*") if p.is_dir()],
        reverse=True,
    )
    if not keyframe_dirs:
        raise SystemExit(
            "keyframe_* 폴더 없음. 먼저 'python generate_keyframe.py' 실행하세요.\n"
            "(또는 START_URL/END_URL/VIDEO_PROMPT 직접 지정)"
        )
    metadata_path = keyframe_dirs[0] / "metadata.json"
    if not metadata_path.exists():
        raise SystemExit(f"{metadata_path} 없음")
    with open(metadata_path, encoding="utf-8") as f:
        meta = json.load(f)
    print(f"[키프레임 로드] {metadata_path}")
    return meta


def resolve_frames_from_metadata(meta: dict) -> tuple[str, str, str]:
    """frame_strategy에 따라 start/end URL 결정. video_prompt도 같이 반환."""
    base_url = meta["base_url"]
    keyframe_url = meta["keyframe_url"]
    strategy = meta["frame_strategy"]
    if strategy == "i2i_is_end":
        return base_url, keyframe_url, meta["video_prompt"]
    else:  # "i2i_is_start"
        return keyframe_url, base_url, meta["video_prompt"]


def download_file(url: str, save_path: str) -> str:
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as res:
        res.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in res.iter_content(chunk_size=8192):
                f.write(chunk)
    return save_path


# =====================================================================
# 핵심 함수 — BE/프론트가 import 해서 호출 가능
# =====================================================================
def generate_video(
    start_url: str,
    end_url: str,
    video_prompt: str,
    save_dir: Optional[Path] = None,
    duration: Optional[str] = None,
    resolution: str = VIDEO_RESOLUTION,
    generate_audio: bool = VIDEO_GENERATE_AUDIO,
    negative_prompt: Optional[str] = None,
) -> dict:
    """
    Veo 3.1 first-last-frame으로 영상 1편 생성.

    Returns:
        {
          "video_url": str,
          "save_dir":  str,
          "start_url": str,
          "end_url":   str,
          "video_prompt": str,
        }
    """
    if save_dir is None:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_dir = Path(OUTPUT_DIR) / f"video_{ts}"
    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    print(f"[저장 폴더] {save_dir}\n")

    # 기본값 fallback (인자가 None일 때만)
    duration = duration or VIDEO_DURATION
    negative_prompt = negative_prompt or VIDEO_NEGATIVE_PROMPT

    print(f"[Veo 3.1 영상 생성] (1~3분 소요, ~$1.20)")
    print(f"      start = {start_url}")
    print(f"      end   = {end_url}")
    print(f"      prompt = {video_prompt[:80]}...")

    result = fal_client.subscribe(
        ENDPOINT_I2V,
        arguments={
            "prompt": video_prompt,
            "first_frame_url": start_url,
            "last_frame_url": end_url,
            "duration": duration,
            "resolution": resolution,
            "generate_audio": generate_audio,
            "negative_prompt": negative_prompt,
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    video_url = result["video"]["url"]
    print(f"      → 영상 URL: {video_url}")

    # 다운로드
    video_local = save_dir / "4_video.mp4"
    download_file(video_url, str(video_local))
    print(f"      → 저장: {video_local}")

    # 메타데이터
    meta = {
        "video_url": video_url,
        "start_url": start_url,
        "end_url": end_url,
        "video_prompt": video_prompt,
        "duration": duration,
        "resolution": resolution,
        "generate_audio": generate_audio,
        "i2v_model": ENDPOINT_I2V,
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
    }
    (save_dir / "metadata.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    return {
        "video_url": video_url,
        "save_dir": str(save_dir),
        "start_url": start_url,
        "end_url": end_url,
        "video_prompt": video_prompt,
    }


# =====================================================================
# 단독 실행
# =====================================================================
def main():
    if not os.environ.get("FAL_KEY"):
        raise SystemExit("FAL_KEY 미설정")

    # 입력 결정 — 수동 지정 vs 자동 로드
    if START_URL and END_URL and VIDEO_PROMPT:
        print("[수동 모드] 스크립트 상단 URL 사용")
        start, end, prompt = START_URL, END_URL, VIDEO_PROMPT
    else:
        print("[자동 모드] 가장 최근 keyframe_* 메타데이터에서 URL 로드")
        meta = load_latest_keyframe_metadata()
        start, end, prompt = resolve_frames_from_metadata(meta)
        print(f"      simulation: {meta.get('simulation')} × focus: {meta.get('focus')}")
        print(f"      strategy:   {meta.get('frame_strategy')}")
        print(f"      keyframe:   {meta.get('save_dir')}")
        print()

    result = generate_video(start, end, prompt)

    print("\n" + "=" * 60)
    print(f"영상 생성 완료")
    print("=" * 60)
    print(f"  저장 폴더: {result['save_dir']}")
    print(f"  video_url: {result['video_url']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
