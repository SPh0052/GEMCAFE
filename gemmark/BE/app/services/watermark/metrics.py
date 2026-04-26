"""화질 측정 지표 (PSNR)."""

import numpy as np


def psnr(original: np.ndarray, modified: np.ndarray) -> float:
    """PSNR(Peak Signal-to-Noise Ratio). 40dB 이상이면 육안 구분 어려움."""
    mse = np.mean(
        (original.astype(np.float64) - modified.astype(np.float64)) ** 2
    )
    if mse == 0:
        return float("inf")
    return 10.0 * np.log10(255.0 ** 2 / mse)
