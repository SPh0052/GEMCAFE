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

load_dotenv()

# =====================================================================
# 입력 (지금은 하드코딩 — 나중에 BE/FE 입력으로 받게 변경)
# =====================================================================
INPUT_IMAGE_PATH = "./test_cake.jpg"

# 시뮬레이션
#   "cross_section_cut"  단면 자르기   (i2i = end frame)
#   "lift_slice"         한 조각 들어올리기 (i2i = end frame)
#   "topping_fall"       토핑 떨어지기  (i2i = start frame, 역방향)
SIMULATION = "cross_section_cut"

# 강조할 요소
#   None              → 자동 (analysis.json의 suggested_focus[0])
#   "strawberry" 등   → 수동 지정
FOCUS: Optional[str] = None

# 배경
#   None              → 배경 교체 skip
#   "white_marble" / "cafe_interior" / "outdoor"
BACKGROUND: Optional[str] = None

# 사용자 자유 힌트
USER_HINT: Optional[str] = None

# 키프레임 시드 (None=랜덤, 정수=재현)
SEED: Optional[int] = None

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
    )

    # ─── Phase 2: 영상 생성 ───
    print("\n" + "=" * 60)
    print("Phase 2 — 영상 생성 (generate_video)")
    print("=" * 60)

    # frame_strategy에 따라 start/end 결정
    #   i2i_is_end   → base_url=START, keyframe=END  (자르기/들어올리기)
    #   i2i_is_start → keyframe=START, base_url=END  (토핑 떨어지기)
    if kf["frame_strategy"] == "i2i_is_end":
        start_url, end_url = kf["base_url"], kf["keyframe_url"]
    else:
        start_url, end_url = kf["keyframe_url"], kf["base_url"]

    vid = generate_video.generate_video(
        start_url=start_url,
        end_url=end_url,
        video_prompt=kf["video_prompt"],
        save_dir=run_dir,    # ← 같은 폴더
    )

    # ─── 최종 요약 ───
    print("\n" + "=" * 60)
    print(f"풀 파이프라인 완료 — {run_dir}/")
    print("=" * 60)
    print(f"  1_input.jpg         (원본)")
    if BACKGROUND:
        print(f"  2_background.jpg    (배경 교체 = '{BACKGROUND}')")
    else:
        print(f"  (2_background.jpg   skip — BACKGROUND=None)")
    print(f"  3_keyframe.jpg      ({SIMULATION} × focus='{kf['focus']}')")
    print(f"  4_video.mp4         (Veo 3.1 first-last-frame)")
    print(f"  metadata.json       (키프레임 메타) ← Phase 1이 덮어씀")
    print()
    print(f"[키프레임 URL] {kf['keyframe_url']}")
    print(f"[영상 URL]    {vid['video_url']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
