CREATE SCHEMA IF NOT EXISTS payment;

CREATE TABLE IF NOT EXISTS payment.wallet_accounts (
	id BIGSERIAL PRIMARY KEY,
	wallet_type VARCHAR(30) NOT NULL,
	owner_key VARCHAR(120) NOT NULL,
	owner_id BIGINT,
	owner_label VARCHAR(255),
	owner_name VARCHAR(255),
	currency VARCHAR(3) NOT NULL DEFAULT 'LKR',
	available_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
	reserved_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
	total_credited DECIMAL(12,2) NOT NULL DEFAULT 0,
	total_debited DECIMAL(12,2) NOT NULL DEFAULT 0,
	bank_name VARCHAR(255),
	bank_account_name VARCHAR(255),
	bank_account_number VARCHAR(100),
	bank_branch VARCHAR(255),
	bank_code VARCHAR(100),
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT uq_wallet_accounts_owner_key UNIQUE (owner_key)
);

CREATE TABLE IF NOT EXISTS payment.wallet_transactions (
	id BIGSERIAL PRIMARY KEY,
	wallet_id BIGINT NOT NULL,
	payment_id BIGINT,
	withdrawal_id BIGINT,
	transaction_type VARCHAR(40) NOT NULL,
	amount DECIMAL(12,2) NOT NULL,
	balance_before DECIMAL(12,2) NOT NULL,
	balance_after DECIMAL(12,2) NOT NULL,
	reference_code VARCHAR(255),
	notes VARCHAR(1000),
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_wallet_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES payment.wallet_accounts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment.wallet_withdrawals (
	id BIGSERIAL PRIMARY KEY,
	wallet_id BIGINT NOT NULL,
	requested_by_id BIGINT,
	requested_by_role VARCHAR(20) NOT NULL,
	amount DECIMAL(12,2) NOT NULL,
	bank_name VARCHAR(255),
	bank_account_name VARCHAR(255) NOT NULL,
	bank_account_number VARCHAR(100) NOT NULL,
	bank_branch VARCHAR(255),
	bank_code VARCHAR(100),
	status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
	reference_code VARCHAR(255),
	notes VARCHAR(1000),
	requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	processed_at TIMESTAMP,
	processed_by_id BIGINT,
	processed_by_role VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_type_owner ON payment.wallet_accounts(wallet_type, owner_key);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON payment.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON payment.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_wallet ON payment.wallet_withdrawals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON payment.wallet_withdrawals(status);

