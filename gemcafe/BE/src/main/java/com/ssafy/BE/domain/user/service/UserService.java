package com.ssafy.BE.domain.user.service;

import com.ssafy.BE.domain.user.dto.UserMeResponse;
import com.ssafy.BE.domain.user.entity.User;
import com.ssafy.BE.domain.user.repository.UserRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserMeResponse getMe(Integer userId) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return UserMeResponse.from(user);
    }
}
