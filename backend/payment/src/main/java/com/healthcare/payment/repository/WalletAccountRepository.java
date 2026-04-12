package com.healthcare.payment.repository;

import com.healthcare.payment.entity.WalletAccount;
import com.healthcare.payment.entity.WalletType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WalletAccountRepository extends JpaRepository<WalletAccount, Long> {

    Optional<WalletAccount> findByOwnerKey(String ownerKey);

    Optional<WalletAccount> findByWalletTypeAndOwnerId(WalletType walletType, Long ownerId);

    Optional<WalletAccount> findByWalletType(WalletType walletType);

    List<WalletAccount> findByWalletTypeOrderByUpdatedAtDesc(WalletType walletType);
}