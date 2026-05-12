package com.ssafy.BE.domain.user.repository;

import com.ssafy.BE.domain.user.entity.Provider;
import com.ssafy.BE.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    boolean existsByEmailAndDeletedAtIsNull(String email);

    Optional<User> findByEmailAndDeletedAtIsNull(String email);

    /**
     * 소셜 로그인 사용자 조회. (provider, providerUserId) 조합이 사용자 식별자.
     */
    Optional<User> findByProviderAndProviderUserIdAndDeletedAtIsNull(
            Provider provider, String providerUserId
    );
}
