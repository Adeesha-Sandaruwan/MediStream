package com.healthcare.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_withdrawals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletWithdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(name = "requested_by_id")
    private Long requestedById;

    @Column(name = "requested_by_role", nullable = false)
    private String requestedByRole;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account_name", nullable = false)
    private String bankAccountName;

    @Column(name = "bank_account_number", nullable = false)
    private String bankAccountNumber;

    @Column(name = "bank_branch")
    private String bankBranch;

    @Column(name = "bank_code")
    private String bankCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private WalletWithdrawalStatus status;

    @Column(name = "reference_code")
    private String referenceCode;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "processed_by_id")
    private Long processedById;

    @Column(name = "processed_by_role")
    private String processedByRole;

    @PrePersist
    protected void onCreate() {
        if (this.requestedAt == null) {
            this.requestedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = WalletWithdrawalStatus.PENDING;
        }
    }
}