package com.ssafy.BE.domain.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255, unique = true)
    private String email;

    @Column(length = 60)
    private String password;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(length = 11)
    private String phone;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Provider provider;

    @Column(name = "provider_user_id", length = 50)
    private String providerUserId;

    @Column(nullable = false)
    private int gem;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public User(String email, String password, String name, String phone,
                Provider provider, String providerUserId, Integer gem, Boolean emailVerified) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.provider = provider != null ? provider : Provider.LOCAL;
        this.providerUserId = providerUserId;
        this.emailVerified = emailVerified != null && emailVerified;
        this.gem = gem != null ? gem : 0;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    /**
     * 소셜 로그인 신규 가입 후 추가 정보(전화번호) 입력 시 호출.
     */
    public void completePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException("phone must not be blank");
        }
        this.phone = phone;
    }

    public boolean hasPhone() {
        return phone != null && !phone.isBlank();
    }

    public void deductGem(int amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("amount must be non-negative");
        }
        if (this.gem < amount) {
            throw new IllegalStateException("insufficient gem: have " + this.gem + ", need " + amount);
        }
        this.gem -= amount;
    }

    public void refundGem(int amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("amount must be non-negative");
        }
        this.gem += amount;
    }
}
