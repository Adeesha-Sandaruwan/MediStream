package com.healthcare.payment.service;

import com.healthcare.payment.dto.wallet.WalletSummaryResponse;
import com.healthcare.payment.dto.wallet.WalletWithdrawalRequest;
import com.healthcare.payment.dto.wallet.WalletWithdrawalResponse;
import com.healthcare.payment.entity.WalletAccount;
import com.healthcare.payment.entity.WalletTransaction;
import com.healthcare.payment.entity.WalletTransactionType;
import com.healthcare.payment.entity.WalletType;
import com.healthcare.payment.entity.WalletWithdrawal;
import com.healthcare.payment.entity.WalletWithdrawalStatus;
import com.healthcare.payment.repository.WalletAccountRepository;
import com.healthcare.payment.repository.WalletTransactionRepository;
import com.healthcare.payment.repository.WalletWithdrawalRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Wallet Service
 * Manages wallet accounts, transactions, and withdrawal requests
 */
@Service
@Slf4j
public class WalletService {

    @Autowired
    private WalletAccountRepository walletAccountRepository;

    @Autowired
    private WalletTransactionRepository walletTransactionRepository;

    @Autowired
    private WalletWithdrawalRepository walletWithdrawalRepository;

    /**
     * Get or create admin system wallet
     * 
     * @return WalletAccount for the admin system
     */
    @Transactional
    public WalletAccount getOrCreateAdminWallet() {
        String ownerKey = "ADMIN_SYSTEM";
        return walletAccountRepository.findByOwnerKey(ownerKey)
                .orElseGet(() -> {
                    WalletAccount wallet = WalletAccount.builder()
                            .walletType(WalletType.ADMIN_SYSTEM)
                            .ownerKey(ownerKey)
                            .ownerId(null)
                            .ownerLabel("ADMIN")
                            .ownerName("MediStream Platform")
                            .currency("LKR")
                            .availableBalance(BigDecimal.ZERO)
                            .reservedBalance(BigDecimal.ZERO)
                            .totalCredited(BigDecimal.ZERO)
                            .totalDebited(BigDecimal.ZERO)
                            .build();
                    wallet = walletAccountRepository.save(wallet);
                    log.info("Created admin system wallet with ID: {}", wallet.getId());
                    return wallet;
                });
    }

    /**
     * Get or create doctor wallet
     * 
     * @param doctorId Doctor ID
     * @param doctorName Doctor name for display
     * @return WalletAccount for the doctor
     */
    @Transactional
    public WalletAccount getOrCreateDoctorWallet(Long doctorId, String doctorName) {
        String ownerKey = "DOCTOR_" + doctorId;
        return walletAccountRepository.findByOwnerKey(ownerKey)
                .orElseGet(() -> {
                    WalletAccount wallet = WalletAccount.builder()
                            .walletType(WalletType.DOCTOR)
                            .ownerKey(ownerKey)
                            .ownerId(doctorId)
                            .ownerLabel("DOCTOR")
                            .ownerName(doctorName != null ? doctorName : "Doctor " + doctorId)
                            .currency("LKR")
                            .availableBalance(BigDecimal.ZERO)
                            .reservedBalance(BigDecimal.ZERO)
                            .totalCredited(BigDecimal.ZERO)
                            .totalDebited(BigDecimal.ZERO)
                            .build();
                    wallet = walletAccountRepository.save(wallet);
                    log.info("Created doctor wallet for doctor ID: {} with wallet ID: {}", doctorId, wallet.getId());
                    return wallet;
                });
    }

    /**
     * Credit payment to admin wallet and reserve doctor earnings
     * Called when a payment is completed
     * 
     * @param paymentId Payment ID reference
     * @param platformFee Platform fee amount
     * @param doctorId Doctor ID
     * @param doctorEarnings Doctor earnings amount
     * @param description Transaction description
     * @return true if transaction succeeded
     */
    @Transactional
    public boolean creditPaymentToWallets(Long paymentId, BigDecimal platformFee, Long doctorId,
                                         BigDecimal doctorEarnings, String description) {
        try {
            // Credit platform fee to admin wallet
            WalletAccount adminWallet = getOrCreateAdminWallet();
            addTransaction(adminWallet, paymentId, null, WalletTransactionType.PAYMENT_CREDIT,
                          platformFee, description);
            log.info("Credited platform fee {} to admin wallet for payment ID: {}", platformFee, paymentId);

            // Reserve doctor earnings in doctor wallet
            WalletAccount doctorWallet = getOrCreateDoctorWallet(doctorId, null);
            addTransaction(doctorWallet, paymentId, null, WalletTransactionType.DOCTOR_PAYOUT_RESERVE,
                          doctorEarnings, "Earnings reserved from payment " + paymentId);
            log.info("Reserved doctor earnings {} for doctor ID: {}", doctorEarnings, doctorId);

            return true;
        } catch (Exception e) {
            log.error("Failed to credit payment to wallets: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Release reserved doctor earnings to available balance when admin pays out
     * 
     * @param doctorId Doctor ID
     * @param doctorEarnings Amount to release
     * @return true if transaction succeeded
     */
    @Transactional
    public boolean releaseDoctorEarnings(Long doctorId, BigDecimal doctorEarnings) {
        try {
            WalletAccount doctorWallet = walletAccountRepository.findByWalletTypeAndOwnerId(WalletType.DOCTOR, doctorId)
                    .orElseThrow(() -> new RuntimeException("Doctor wallet not found for ID: " + doctorId));

            // Move from reserved to available
            if (doctorWallet.getReservedBalance().compareTo(doctorEarnings) < 0) {
                throw new RuntimeException("Insufficient reserved balance for doctor: " + doctorId);
            }

            doctorWallet.setReservedBalance(doctorWallet.getReservedBalance().subtract(doctorEarnings));
            doctorWallet.setAvailableBalance(doctorWallet.getAvailableBalance().add(doctorEarnings));

            addTransaction(doctorWallet, null, null, WalletTransactionType.DOCTOR_PAYOUT_RELEASE,
                          doctorEarnings, "Doctor earnings released to available balance");

            walletAccountRepository.save(doctorWallet);
            log.info("Released doctor earnings {} for doctor ID: {} to available balance", doctorEarnings, doctorId);

            return true;
        } catch (Exception e) {
            log.error("Failed to release doctor earnings: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Process a withdrawal request from a wallet
     * 
     * @param walletId Wallet ID to withdraw from
     * @param request Withdrawal request details
     * @return WalletWithdrawal record
     */
    @Transactional
    public WalletWithdrawal createWithdrawalRequest(Long walletId, WalletWithdrawalRequest request) {
        try {
            WalletAccount wallet = walletAccountRepository.findById(walletId)
                    .orElseThrow(() -> new RuntimeException("Wallet not found with ID: " + walletId));

            if (wallet.getAvailableBalance().compareTo(request.getAmount()) < 0) {
                throw new RuntimeException("Insufficient available balance. Available: " +
                        wallet.getAvailableBalance() + ", Requested: " + request.getAmount());
            }

            // Deduct from available balance and add to withdrawal
            wallet.setAvailableBalance(wallet.getAvailableBalance().subtract(request.getAmount()));

            WalletWithdrawal withdrawal = WalletWithdrawal.builder()
                    .walletId(walletId)
                    .requestedById(request.getRequestedById())
                    .requestedByRole(request.getRequestedByRole())
                    .amount(request.getAmount())
                    .bankName(request.getBankName())
                    .bankAccountName(request.getBankAccountName())
                    .bankAccountNumber(request.getBankAccountNumber())
                    .bankBranch(request.getBankBranch())
                    .bankCode(request.getBankCode())
                    .status(WalletWithdrawalStatus.PENDING)
                    .referenceCode("WD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .build();

            withdrawal = walletWithdrawalRepository.save(withdrawal);

            addTransaction(wallet, null, withdrawal.getId(), WalletTransactionType.WITHDRAWAL_REQUEST,
                          request.getAmount(), "Withdrawal request " + withdrawal.getReferenceCode());

            walletAccountRepository.save(wallet);
            log.info("Created withdrawal request {} for amount {}", withdrawal.getReferenceCode(), request.getAmount());

            return withdrawal;
        } catch (Exception e) {
            log.error("Failed to create withdrawal request: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create withdrawal request: " + e.getMessage());
        }
    }

    /**
     * Approve and process a withdrawal
     * 
     * @param withdrawalId Withdrawal ID to process
     * @param processedById User who approved the withdrawal
     * @param processedByRole Role of the user who approved
     * @return Updated WalletWithdrawal
     */
    @Transactional
    public WalletWithdrawal processWithdrawal(Long withdrawalId, Long processedById, String processedByRole) {
        try {
            WalletWithdrawal withdrawal = walletWithdrawalRepository.findById(withdrawalId)
                    .orElseThrow(() -> new RuntimeException("Withdrawal not found with ID: " + withdrawalId));

            if (withdrawal.getStatus() != WalletWithdrawalStatus.PENDING) {
                throw new RuntimeException("Withdrawal is not in PENDING status: " + withdrawal.getStatus());
            }

            withdrawal.setStatus(WalletWithdrawalStatus.COMPLETED);
            withdrawal.setProcessedAt(LocalDateTime.now());
            withdrawal.setProcessedById(processedById);
            withdrawal.setProcessedByRole(processedByRole);

            WalletAccount wallet = walletAccountRepository.findById(withdrawal.getWalletId())
                    .orElseThrow(() -> new RuntimeException("Wallet not found"));

            wallet.setTotalDebited(wallet.getTotalDebited().add(withdrawal.getAmount()));

            addTransaction(wallet, null, withdrawalId, WalletTransactionType.WITHDRAWAL_COMPLETED,
                          withdrawal.getAmount(), "Withdrawal completed " + withdrawal.getReferenceCode());

            walletAccountRepository.save(wallet);
            walletWithdrawalRepository.save(withdrawal);

            log.info("Processed withdrawal {} for amount {}", withdrawal.getReferenceCode(), withdrawal.getAmount());

            return withdrawal;
        } catch (Exception e) {
            log.error("Failed to process withdrawal: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process withdrawal: " + e.getMessage());
        }
    }

    /**
     * Get wallet summary for display
     * 
     * @param walletId Wallet ID
     * @return WalletSummaryResponse
     */
    public WalletSummaryResponse getWalletSummary(Long walletId) {
        WalletAccount wallet = walletAccountRepository.findById(walletId)
                .orElseThrow(() -> new RuntimeException("Wallet not found with ID: " + walletId));

        return WalletSummaryResponse.builder()
                .walletId(wallet.getId())
                .walletType(wallet.getWalletType())
                .ownerKey(wallet.getOwnerKey())
                .ownerId(wallet.getOwnerId())
                .ownerName(wallet.getOwnerName())
                .currency(wallet.getCurrency())
                .availableBalance(wallet.getAvailableBalance())
                .reservedBalance(wallet.getReservedBalance())
                .totalCredited(wallet.getTotalCredited())
                .totalDebited(wallet.getTotalDebited())
                .bankName(wallet.getBankName())
                .bankAccountName(wallet.getBankAccountName())
                .bankAccountNumber(wallet.getBankAccountNumber())
                .bankBranch(wallet.getBankBranch())
                .bankCode(wallet.getBankCode())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }

    /**
     * Get doctor wallet summary
     * 
     * @param doctorId Doctor ID
     * @return WalletSummaryResponse
     */
    public WalletSummaryResponse getDoctorWalletSummary(Long doctorId) {
        WalletAccount wallet = walletAccountRepository.findByWalletTypeAndOwnerId(WalletType.DOCTOR, doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor wallet not found for ID: " + doctorId));

        return getWalletSummary(wallet.getId());
    }

    /**
     * Get admin wallet summary
     * 
     * @return WalletSummaryResponse
     */
    public WalletSummaryResponse getAdminWalletSummary() {
        WalletAccount wallet = getOrCreateAdminWallet();
        return getWalletSummary(wallet.getId());
    }

    /**
     * Get withdrawal requests by status
     * 
     * @param status Withdrawal status
     * @return List of withdrawal responses
     */
    public List<WalletWithdrawalResponse> getWithdrawalsByStatus(WalletWithdrawalStatus status) {
        return walletWithdrawalRepository.findByStatusOrderByRequestedAtDesc(status)
                .stream()
                .map(this::mapWithdrawalToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get wallet transactions
     * 
     * @param walletId Wallet ID
     * @return List of transactions
     */
    public List<WalletTransaction> getWalletTransactions(Long walletId) {
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(walletId);
    }

    /**
     * Update withdrawal status (for admin approval process)
     * 
     * @param withdrawalId Withdrawal ID
     * @param newStatus New status
     * @return Updated withdrawal
     */
    @Transactional
    public WalletWithdrawal updateWithdrawalStatus(Long withdrawalId, WalletWithdrawalStatus newStatus) {
        WalletWithdrawal withdrawal = walletWithdrawalRepository.findById(withdrawalId)
                .orElseThrow(() -> new RuntimeException("Withdrawal not found"));

        if (newStatus == WalletWithdrawalStatus.COMPLETED) {
            return processWithdrawal(withdrawalId, null, null);
        }

        withdrawal.setStatus(newStatus);
        return walletWithdrawalRepository.save(withdrawal);
    }

    // ==================== Private Helper Methods ====================

    /**
     * Add a transaction record to the wallet's ledger
     * 
     * @param wallet Wallet account
     * @param paymentId Associated payment ID (nullable)
     * @param withdrawalId Associated withdrawal ID (nullable)
     * @param transactionType Type of transaction
     * @param amount Transaction amount
     * @param notes Transaction notes
     */
    private void addTransaction(WalletAccount wallet, Long paymentId, Long withdrawalId,
                               WalletTransactionType transactionType, BigDecimal amount, String notes) {
        BigDecimal balanceBefore = wallet.getAvailableBalance();

        // Update wallet balances based on transaction type
        if (transactionType == WalletTransactionType.PAYMENT_CREDIT) {
            wallet.setAvailableBalance(wallet.getAvailableBalance().add(amount));
            wallet.setTotalCredited(wallet.getTotalCredited().add(amount));
        } else if (transactionType == WalletTransactionType.DOCTOR_PAYOUT_RESERVE) {
            wallet.setReservedBalance(wallet.getReservedBalance().add(amount));
        } else if (transactionType == WalletTransactionType.DOCTOR_PAYOUT_RELEASE) {
            // Already handled in releaseDoctorEarnings
        } else if (transactionType == WalletTransactionType.WITHDRAWAL_REQUEST ||
                   transactionType == WalletTransactionType.WITHDRAWAL_COMPLETED) {
            wallet.setTotalDebited(wallet.getTotalDebited().add(amount));
        }

        BigDecimal balanceAfter = wallet.getAvailableBalance();

        WalletTransaction transaction = WalletTransaction.builder()
                .walletId(wallet.getId())
                .paymentId(paymentId)
                .withdrawalId(withdrawalId)
                .transactionType(transactionType)
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .referenceCode(UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .notes(notes)
                .build();

        walletTransactionRepository.save(transaction);
    }

    /**
     * Map WalletWithdrawal to response DTO
     * 
     * @param withdrawal Withdrawal entity
     * @return WalletWithdrawalResponse
     */
    private WalletWithdrawalResponse mapWithdrawalToResponse(WalletWithdrawal withdrawal) {
        return WalletWithdrawalResponse.builder()
                .id(withdrawal.getId())
                .walletId(withdrawal.getWalletId())
                .requestedById(withdrawal.getRequestedById())
                .requestedByRole(withdrawal.getRequestedByRole())
                .amount(withdrawal.getAmount())
                .bankName(withdrawal.getBankName())
                .bankAccountName(withdrawal.getBankAccountName())
                .bankAccountNumber(withdrawal.getBankAccountNumber())
                .bankBranch(withdrawal.getBankBranch())
                .bankCode(withdrawal.getBankCode())
                .status(withdrawal.getStatus())
                .referenceCode(withdrawal.getReferenceCode())
                .notes(withdrawal.getNotes())
                .requestedAt(withdrawal.getRequestedAt())
                .processedAt(withdrawal.getProcessedAt())
                .processedById(withdrawal.getProcessedById())
                .processedByRole(withdrawal.getProcessedByRole())
                .build();
    }
}
