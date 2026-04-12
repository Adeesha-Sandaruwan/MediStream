package com.healthcare.payment.repository;

import com.healthcare.payment.entity.WalletTransaction;
import com.healthcare.payment.entity.WalletTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(Long walletId);

    List<WalletTransaction> findByWalletIdAndTransactionTypeOrderByCreatedAtDesc(Long walletId, WalletTransactionType transactionType);
}