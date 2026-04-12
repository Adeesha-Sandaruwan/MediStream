import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDoctorWalletSummary, requestWithdrawal } from '../api/paymentApi';
import { getDoctorProfile } from '../api/doctorApi';
import { Wallet, DollarSign, Send, AlertCircle, Loader2, CreditCard } from 'lucide-react';

const formatCurrency = (amount) => {
  if (!amount) return 'Rs. 0.00';
  return 'Rs. ' + parseFloat(amount).toFixed(2);
};

const DoctorWalletView = ({ doctorId: propDoctorId }) => {
  const { token } = useAuth();
  const [doctorId, setDoctorId] = useState(propDoctorId || null);
  const [walletSummary, setWalletSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankBranch: '',
    bankCode: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch doctor ID if not provided
  useEffect(() => {
    if (!propDoctorId && token) {
      (async () => {
        try {
          const profile = await getDoctorProfile(token);
          setDoctorId(profile.id);
        } catch (err) {
          console.error('Error fetching doctor profile:', err);
          setError('Failed to load doctor profile. Please try again.');
        }
      })();
    }
  }, [propDoctorId, token]);

  const loadWalletData = useCallback(async () => {
    if (!doctorId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getDoctorWalletSummary(token, doctorId);
      setWalletSummary(data);
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token, doctorId]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const handleWithdrawalChange = (e) => {
    const { name, value } = e.target;
    setWithdrawalForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (!walletSummary?.walletId) {
        throw new Error('Wallet not found');
      }

      const withdrawalData = {
        amount: parseFloat(withdrawalForm.amount),
        bankName: withdrawalForm.bankName,
        bankAccountName: withdrawalForm.bankAccountName,
        bankAccountNumber: withdrawalForm.bankAccountNumber,
        bankBranch: withdrawalForm.bankBranch,
        bankCode: withdrawalForm.bankCode,
        requestedById: doctorId,
        requestedByRole: 'DOCTOR',
      };

      const result = await requestWithdrawal(token, walletSummary.walletId, withdrawalData);
      
      setSuccessMessage(`Withdrawal request ${result.referenceCode} submitted successfully! Pending admin approval.`);
      setWithdrawalForm({
        amount: '',
        bankName: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bankBranch: '',
        bankCode: '',
      });
      setShowWithdrawalForm(false);
      loadWalletData();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      setError(err.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-3 rounded-2xl">
            <Wallet className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">My Earnings Wallet</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor and withdraw your consultation earnings</p>
          </div>
        </div>
        {walletSummary && (
          <button
            onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Send size={18} />
            Withdraw Earnings
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="mr-3 shrink-0" size={20} />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-sm">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : walletSummary ? (
        <>
          {/* Wallet Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Available Balance</p>
                <DollarSign className="text-emerald-500" size={24} />
              </div>
              <p className="text-3xl font-black text-emerald-600 mb-2">
                {formatCurrency(walletSummary.availableBalance)}
              </p>
              <p className="text-xs text-gray-500">Ready to withdraw anytime</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Reserved Earnings</p>
                <AlertCircle className="text-amber-500" size={24} />
              </div>
              <p className="text-3xl font-black text-amber-600 mb-2">
                {formatCurrency(walletSummary.reservedBalance)}
              </p>
              <p className="text-xs text-gray-500">Awaiting admin payout confirmation</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Earnings</p>
                <Wallet className="text-blue-600" size={24} />
              </div>
              <p className="text-3xl font-black text-blue-600 mb-2">
                {formatCurrency(walletSummary.totalCredited)}
              </p>
              <p className="text-xs text-gray-500">Cumulative earnings from consultations</p>
            </div>
          </div>

          {/* Withdrawal Form */}
          {showWithdrawalForm && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Withdraw to Bank Account</h2>
              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount to Withdraw (Rs.) *</label>
                  <input
                    type="number"
                    name="amount"
                    value={withdrawalForm.amount}
                    onChange={handleWithdrawalChange}
                    required
                    step="0.01"
                    min="100"
                    max={walletSummary.availableBalance}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatCurrency(walletSummary.availableBalance)} (Minimum: Rs. 100.00)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={withdrawalForm.bankName}
                      onChange={handleWithdrawalChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                      placeholder="e.g., Bank of Ceylon"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Branch</label>
                    <input
                      type="text"
                      name="bankBranch"
                      value={withdrawalForm.bankBranch}
                      onChange={handleWithdrawalChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                      placeholder="e.g., Colombo Main"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Account Holder Name *</label>
                  <input
                    type="text"
                    name="bankAccountName"
                    value={withdrawalForm.bankAccountName}
                    onChange={handleWithdrawalChange}
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="Your full name as in bank account"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Account Number *</label>
                    <input
                      type="text"
                      name="bankAccountNumber"
                      value={withdrawalForm.bankAccountNumber}
                      onChange={handleWithdrawalChange}
                      required
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                      placeholder="0123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Code (SWIFT)</label>
                    <input
                      type="text"
                      name="bankCode"
                      value={withdrawalForm.bankCode}
                      onChange={handleWithdrawalChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                      placeholder="BOCSLKLA"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                  <p className="text-xs text-blue-800 font-medium">
                    <strong>Note:</strong> Withdrawal requests will be reviewed and processed by the admin within 2-3 business days. You'll receive confirmation once the transfer is initiated.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawalForm(false)}
                    className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    Request Withdrawal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-start gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <CreditCard className="text-indigo-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-indigo-900 mb-2">How Your Wallet Works</p>
                <ul className="text-sm text-indigo-800 space-y-2">
                  <li>✓ You earn 85% of each appointment fee</li>
                  <li>✓ When a payment completes, 15% goes to platform, 85% is reserved for you</li>
                  <li>✓ Admin confirms and releases your earnings to "Available Balance"</li>
                  <li>✓ Withdraw anytime to your bank account with admin approval</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DoctorWalletView;
