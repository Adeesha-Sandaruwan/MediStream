package com.healthcare.payment.repository;

import com.healthcare.payment.entity.WalletWithdrawal;
import com.healthcare.payment.entity.WalletWithdrawalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletWithdrawalRepository extends JpaRepository<WalletWithdrawal, Long> {

    List<WalletWithdrawal> findByWalletIdOrderByRequestedAtDesc(Long walletId);

    List<WalletWithdrawal> findByStatusOrderByRequestedAtDesc(WalletWithdrawalStatus status);

    List<WalletWithdrawal> findByRequestedByRoleOrderByRequestedAtDesc(String requestedByRole);
}