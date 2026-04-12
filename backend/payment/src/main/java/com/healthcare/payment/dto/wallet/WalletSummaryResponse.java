package com.healthcare.payment.dto.wallet;

import com.healthcare.payment.entity.WalletType;
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
public class WalletSummaryResponse {
    private Long walletId;
    private WalletType walletType;
    private String ownerKey;
    private Long ownerId;
    private String ownerName;
    private String currency;
    private BigDecimal availableBalance;
    private BigDecimal reservedBalance;
    private BigDecimal totalCredited;
    private BigDecimal totalDebited;
    private String bankName;
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankBranch;
    private String bankCode;
    private LocalDateTime updatedAt;
}