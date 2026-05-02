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
                Provider provider, String providerUserId, Integer gem) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.provider = provider != null ? provider : Provider.LOCAL;
        this.providerUserId = providerUserId;
        this.emailVerified = false;
        this.gem = gem != null ? gem : 0;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
