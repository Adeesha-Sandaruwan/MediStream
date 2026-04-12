package com.healthcare.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_type", nullable = false)
    private WalletType walletType;

    @Column(name = "owner_key", nullable = false, unique = true)
    private String ownerKey;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "owner_label")
    private String ownerLabel;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "currency", nullable = false)
    private String currency;

    @Column(name = "available_balance", nullable = false, precision = 12, scale = 2)
    private BigDecimal availableBalance;

    @Column(name = "reserved_balance", nullable = false, precision = 12, scale = 2)
    private BigDecimal reservedBalance;

    @Column(name = "total_credited", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCredited;

    @Column(name = "total_debited", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDebited;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    @Column(name = "bank_branch")
    private String bankBranch;

    @Column(name = "bank_code")
    private String bankCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.currency == null) {
            this.currency = "LKR";
        }
        if (this.availableBalance == null) {
            this.availableBalance = BigDecimal.ZERO;
        }
        if (this.reservedBalance == null) {
            this.reservedBalance = BigDecimal.ZERO;
        }
        if (this.totalCredited == null) {
            this.totalCredited = BigDecimal.ZERO;
        }
        if (this.totalDebited == null) {
            this.totalDebited = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}