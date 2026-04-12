import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminWalletSummary,
  getPendingWithdrawals,
  approveWithdrawal,
  requestWithdrawal,
} from '../api/paymentApi';
import { Wallet, DollarSign, Send, CheckCircle, Clock, AlertCircle, Loader2, Eye, FileText, CreditCard, BankIcon } from 'lucide-react';

const formatCurrency = (amount) => {
  if (!amount) return 'Rs. 0.00';
  return 'Rs. ' + parseFloat(amount).toFixed(2);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function AdminWalletView() {
  const { token } = useAuth();
  const [walletSummary, setWalletSummary] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
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

  const loadWalletData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [walletData, withdrawalsData] = await Promise.all([
        getAdminWalletSummary(token),
        getPendingWithdrawals(token),
      ]);
      setWalletSummary(walletData);
      setPendingWithdrawals(withdrawalsData || []);
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
        requestedById: 1,
        requestedByRole: 'ADMIN',
      };

      await requestWithdrawal(token, walletSummary.walletId, withdrawalData);
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
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      setError(err.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId) => {
    try {
      await approveWithdrawal(token, withdrawalId);
      loadWalletData();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      alert('Failed to approve withdrawal');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 p-3 rounded-2xl">
            <Wallet className="text-emerald-600" size={28} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Platform Wallet</h1>
        </div>
        {walletSummary && (
          <button
            onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Send size={18} />
            Request Withdrawal
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

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
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
              <p className="text-xs text-gray-500">Ready to withdraw</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Reserved (Pending Payouts)</p>
                <Clock className="text-amber-500" size={24} />
              </div>
              <p className="text-3xl font-black text-amber-600 mb-2">
                {formatCurrency(walletSummary.reservedBalance)}
              </p>
              <p className="text-xs text-gray-500">Being distributed to doctors</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Revenue</p>
                <FileText className="text-indigo-500" size={24} />
              </div>
              <p className="text-3xl font-black text-indigo-600 mb-2">
                {formatCurrency(walletSummary.totalCredited)}
              </p>
              <p className="text-xs text-gray-500">Cumulative platform fees</p>
            </div>
          </div>

          {/* Bank Details */}
          {walletSummary.bankAccountNumber && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <CreditCard className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-3">Bank Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-blue-700 mb-1">ACCOUNT NAME</p>
                      <p className="font-bold text-blue-900">{walletSummary.bankAccountName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-700 mb-1">ACCOUNT NUMBER</p>
                      <p className="font-bold text-blue-900">{walletSummary.bankAccountNumber}</p>
                    </div>
                    {walletSummary.bankName && (
                      <div>
                        <p className="text-xs font-bold text-blue-700 mb-1">BANK</p>
                        <p className="font-bold text-blue-900">{walletSummary.bankName}</p>
                      </div>
                    )}
                    {walletSummary.bankBranch && (
                      <div>
                        <p className="text-xs font-bold text-blue-700 mb-1">BRANCH</p>
                        <p className="font-bold text-blue-900">{walletSummary.bankBranch}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawal Form */}
          {showWithdrawalForm && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Request Withdrawal</h2>
              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount (Rs.)</label>
                  <input
                    type="number"
                    name="amount"
                    value={withdrawalForm.amount}
                    onChange={handleWithdrawalChange}
                    required
                    step="0.01"
                    min="0"
                    max={walletSummary.availableBalance}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Available: {formatCurrency(walletSummary.availableBalance)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={withdrawalForm.bankName}
                      onChange={handleWithdrawalChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="Bank of Ceylon"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Branch</label>
                    <input
                      type="text"
                      name="bankBranch"
                      value={withdrawalForm.bankBranch}
                      onChange={handleWithdrawalChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="Colombo Branch"
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
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                    placeholder="MediStream Platform"
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
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Code</label>
                    <input
                      type="text"
                      name="bankCode"
                      value={withdrawalForm.bankCode}
                      onChange={handleWithdrawalChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="BOCSLKLA"
                    />
                  </div>
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
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    Request Withdrawal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending Withdrawals */}
          {pendingWithdrawals.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Pending Withdrawal Approvals</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Requestor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Requested Date</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingWithdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{withdrawal.referenceCode}</td>
                        <td className="p-4 font-bold text-emerald-600">{formatCurrency(withdrawal.amount)}</td>
                        <td className="p-4 text-sm text-gray-700">{withdrawal.requestedByRole}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                            <Clock size={12} className="inline mr-1" />
                            {withdrawal.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{formatDate(withdrawal.requestedAt)}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleApproveWithdrawal(withdrawal.id)}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95"
                          >
                            <CheckCircle size={14} className="inline mr-1" />
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
