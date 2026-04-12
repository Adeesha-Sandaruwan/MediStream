package com.healthcare.payment.dto.wallet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletWithdrawalRequest {
    private BigDecimal amount;
    private String bankName;
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankBranch;
    private String bankCode;
    private Long requestedById;
    private String requestedByRole;
}