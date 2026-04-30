"""32-bit 워터마크 페이로드 생성 (Hex 8자).

video_uuid + downloader_user_id 기반 결정론적 비트열.
SSAFY 운영 규모(영상 수십~수백)에선 충돌 가능성 무시 가능.
"""

import hashlib

import numpy as np

PAYLOAD_BITS = 32


def make_payload_bits(video_uuid: str, downloader_user_id: str) -> np.ndarray:
    """video_uuid + downloader_user_id로 결정론적 144-bit 페이로드 생성.

    같은 입력 → 항상 같은 비트열 (검증 시 비교 가능).
    """
    seed_material = f"{video_uuid}:{downloader_user_id}".encode()
    digest = hashlib.sha256(seed_material).digest()
    seed = int.from_bytes(digest[:4], "big") & 0xFFFFFFFF
    rng = np.random.RandomState(seed)
    return rng.randint(0, 2, size=PAYLOAD_BITS).astype(np.uint8)
