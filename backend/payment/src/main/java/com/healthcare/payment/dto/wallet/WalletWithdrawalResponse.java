package com.healthcare.payment.dto.wallet;

import com.healthcare.payment.entity.WalletWithdrawalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletWithdrawalResponse {
    private Long id;
    private Long walletId;
    private Long requestedById;
    private String requestedByRole;
    private BigDecimal amount;
    private String bankName;
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankBranch;
    private String bankCode;
    private WalletWithdrawalStatus status;
    private String referenceCode;
    private String notes;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;
    private Long processedById;
    private String processedByRole;
}