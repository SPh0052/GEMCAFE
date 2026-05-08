package com.ssafy.BE.domain.background.service;

import com.ssafy.BE.domain.background.entity.Background;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * background.code (DB) → AI 서비스가 이해하는 코드 + 추가 hint 변환.
 * AI는 white_marble / cafe_interior / outdoor 만 지원하므로 한국 라벨을 매핑한다.
 */
@Component
public class BackgroundAiMapper {

    private record AiBackground(String code, String hint) {}

    private static final Map<String, AiBackground> MAPPING = Map.of(
            "hanok_cafe",  new AiBackground("cafe_interior", "한옥 분위기의 따뜻한 카페"),
            "retro_cafe",  new AiBackground("cafe_interior", "레트로 빈티지 카페"),
            "wood_desk",   new AiBackground("white_marble",  "나무 책상 위"),
            "outdoor",     new AiBackground("outdoor",       null)
    );

    public String resolveAiCode(Background background) {
        AiBackground mapped = MAPPING.get(background.getCode());
        return mapped != null ? mapped.code() : background.getCode();
    }

    /**
     * background에서 유래한 hint와 사용자가 입력한 hint를 병합.
     */
    public String mergeHint(Background background, String userHint) {
        AiBackground mapped = MAPPING.get(background.getCode());
        String bgHint = mapped != null ? mapped.hint() : null;

        if (bgHint == null && userHint == null) return null;
        if (bgHint == null) return userHint;
        if (userHint == null) return bgHint;
        return bgHint + ". " + userHint;
    }
}
