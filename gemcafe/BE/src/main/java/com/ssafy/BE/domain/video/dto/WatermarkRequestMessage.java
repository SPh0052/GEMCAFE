package com.ssafy.BE.domain.video.dto;

import java.io.Serializable;

public record WatermarkRequestMessage(
        String jobId,
        Integer userId,
        Integer videoId,
        String sourceFilePath,
        String downloaderUserId,
        Integer alpha
) implements Serializable {
}
