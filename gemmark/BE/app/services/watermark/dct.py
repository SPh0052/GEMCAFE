"""
DCT(이산 코사인 변환) 기반 스테가노그래피 워터마크 모듈.

알고리즘: Spread-Spectrum + 8x8 Block DCT + Zero-Mean Detection
- Y채널을 8x8 블록으로 분할 → 각 블록에 2D DCT 적용
- 중간 주파수 계수(COEF_U, COEF_V)에 PN 시퀀스를 곱해 비트 삽입
- 추출 시 DC 제거 후 상관 → 밝기/대비 공격 자동 무효화

성능 최적화: numpy reshape + scipy 배치 DCT
- 블록별 for 루프 대신 (N,8,8) 배열로 일괄 변환
- cv2.dct 14,400회 호출 → scipy 배치 호출 1회로 대체

watermark_dwt 참고 → gemmark BE 포팅 (alpha 기본값 20).
"""

import cv2
import numpy as np
from scipy.fftpack import dct as sp_dct
from scipy.fftpack import idct as sp_idct

BLOCK = 8        # DCT 블록 크기 (표준 JPEG와 동일)
COEF_U = 2       # 삽입할 계수 행 인덱스 (0=DC, 높을수록 고주파)
COEF_V = 1       # 삽입할 계수 열 인덱스
DEFAULT_ALPHA = 20.0
DEFAULT_KEY = 42


def _pn_seq(bit_idx: int, length: int, key: int) -> np.ndarray:
    seed = int(key) ^ int(bit_idx * 2654435769 % (2 ** 32))
    rng = np.random.RandomState(seed & 0xFFFFFFFF)
    return rng.choice([-1.0, 1.0], size=length)


def _dct2_batch(blocks: np.ndarray) -> np.ndarray:
    return sp_dct(sp_dct(blocks, axis=2, norm="ortho"), axis=1, norm="ortho")


def _idct2_batch(blocks: np.ndarray) -> np.ndarray:
    return sp_idct(sp_idct(blocks, axis=2, norm="ortho"), axis=1, norm="ortho")


def _img_to_blocks(y: np.ndarray, bh: int, bw: int) -> np.ndarray:
    return (
        y[: bh * BLOCK, : bw * BLOCK]
        .reshape(bh, BLOCK, bw, BLOCK)
        .transpose(0, 2, 1, 3)
        .reshape(bh * bw, BLOCK, BLOCK)
        .astype(np.float64)
    )


def _blocks_to_img(blocks: np.ndarray, bh: int, bw: int, y_orig: np.ndarray) -> np.ndarray:
    y_out = y_orig.copy()
    y_out[: bh * BLOCK, : bw * BLOCK] = (
        blocks
        .reshape(bh, bw, BLOCK, BLOCK)
        .transpose(0, 2, 1, 3)
        .reshape(bh * BLOCK, bw * BLOCK)
    )
    return y_out


def embed(
    frame: np.ndarray,
    watermark_bits: np.ndarray,
    key: int = DEFAULT_KEY,
    alpha: float = DEFAULT_ALPHA,
) -> np.ndarray:
    """프레임에 워터마크 비트열을 DCT 도메인에 삽입."""
    ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb).astype(np.float64)
    y = ycrcb[:, :, 0]
    h, w = y.shape
    bh, bw = h // BLOCK, w // BLOCK
    n_blocks = bh * bw

    wm_len = len(watermark_bits)
    chunk = n_blocks // wm_len
    if chunk < 10:
        raise ValueError(f"이미지가 너무 작습니다. 최대 {n_blocks // 10}비트 가능")

    blocks = _img_to_blocks(y, bh, bw)
    dct_blocks = _dct2_batch(blocks)

    coefs = dct_blocks[:, COEF_U, COEF_V].copy()
    for i, bit in enumerate(watermark_bits):
        pn = _pn_seq(i, chunk, key)
        start = i * chunk
        coefs[start: start + chunk] += alpha * (1.0 if bit else -1.0) * pn
    dct_blocks[:, COEF_U, COEF_V] = coefs

    y_wm = _blocks_to_img(_idct2_batch(dct_blocks), bh, bw, y)

    ycrcb[:, :, 0] = np.clip(y_wm, 0, 255)
    return cv2.cvtColor(ycrcb.astype(np.uint8), cv2.COLOR_YCrCb2BGR)


def extract(
    frame: np.ndarray,
    wm_len: int,
    key: int = DEFAULT_KEY,
    alpha: float = DEFAULT_ALPHA,
) -> np.ndarray:
    """프레임에서 워터마크 비트열을 추출 (DC 제거 후 PN 상관 부호로 비트 판별)."""
    ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb).astype(np.float64)
    y = ycrcb[:, :, 0]
    bh, bw = y.shape[0] // BLOCK, y.shape[1] // BLOCK
    n_blocks = bh * bw
    chunk = n_blocks // wm_len

    blocks = _img_to_blocks(y, bh, bw)
    coefs = _dct2_batch(blocks)[:, COEF_U, COEF_V]

    bits = []
    for i in range(wm_len):
        pn = _pn_seq(i, chunk, key)
        segment = coefs[i * chunk: i * chunk + chunk]
        z = segment - segment.mean()
        bits.append(1 if float(np.dot(z, pn)) > 0 else 0)

    return np.array(bits, dtype=np.uint8)


def bits_to_hex(bits: np.ndarray) -> str:
    result = ""
    padded = len(bits) - (len(bits) % 4)
    for i in range(0, padded, 4):
        val = (int(bits[i]) << 3) | (int(bits[i + 1]) << 2) | (int(bits[i + 2]) << 1) | int(bits[i + 3])
        result += f"{val:X}"
    return result
