"""화질/정확도 측정 지표."""

import numpy as np


def psnr(original: np.ndarray, modified: np.ndarray) -> float:
    """PSNR(Peak Signal-to-Noise Ratio). 40dB 이상이면 육안 구분 어려움."""
    mse = np.mean(
        (original.astype(np.float64) - modified.astype(np.float64)) ** 2
    )
    if mse == 0:
        return float("inf")
    return 10.0 * np.log10(255.0 ** 2 / mse)


def ber(original_bits: np.ndarray, extracted_bits: np.ndarray) -> float:
    """BER(Bit Error Rate). 0.0=완벽 일치, 0.5=랜덤 추측, 보통 0.1 이하를 매칭으로 간주."""
    n = min(len(original_bits), len(extracted_bits))
    if n == 0:
        return 1.0
    errors = int(np.sum(original_bits[:n] != extracted_bits[:n]))
    return errors / n
