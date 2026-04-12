import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  SendHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAllCompletedTransactions,
  getPendingPayouts,
  getTransactionMetrics,
  markDoctorPayoutCompleted,
  batchMarkDoctorPayoutsCompleted,
} from '../api/paymentApi';

const AdminTransactionMonitor = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Overview tab state
  const [metrics, setMetrics] = useState(null);

  // Transactions tab state
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());

  // Payouts tab state
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [processingPayouts, setProcessingPayouts] = useState(new Set());

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (activeTab === 'overview') {
        const metricsData = await getTransactionMetrics(token);
        setMetrics(metricsData);
      } else if (activeTab === 'transactions') {
        const transactionsData = await getAllCompletedTransactions(token);
        setTransactions(transactionsData);
        setFilteredTransactions(transactionsData);
      } else if (activeTab === 'payouts') {
        const payoutsData = await getPendingPayouts(token);
        setPendingPayouts(payoutsData);
        setFilteredPayouts(payoutsData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeTab]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, token, activeTab]);;

  // Search and filter transactions
  useEffect(() => {
    const filtered = transactions.filter((tx) => {
      const query = searchQuery.toLowerCase();
      return (
        tx.id?.toString().includes(query) ||
        tx.appointmentId?.toString().includes(query) ||
        tx.doctorId?.toString().includes(query) ||
        tx.patientId?.toString().includes(query)
      );
    });
    setFilteredTransactions(filtered);
  }, [searchQuery, transactions]);

  // Search and filter payouts
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = pendingPayouts.filter((payout) => {
      return (
        payout.id?.toString().includes(query) ||
        payout.doctorId?.toString().includes(query) ||
        payout.appointmentId?.toString().includes(query)
      );
    });
    setFilteredPayouts(filtered);
  }, [searchQuery, pendingPayouts]);

  const handleSelectTransaction = (id) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAllTransactions = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  const handleMarkPayoutCompleted = async (paymentId) => {
    setProcessingPayouts((prev) => new Set([...prev, paymentId]));
    try {
      await markDoctorPayoutCompleted(token, paymentId);
      setPendingPayouts((prev) => prev.filter((p) => p.id !== paymentId));
      setFilteredPayouts((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err) {
      console.error('Error marking payout:', err);
      setError('Failed to mark payout as completed.');
    } finally {
      setProcessingPayouts((prev) => {
        const next = new Set(prev);
        next.delete(paymentId);
        return next;
      });
    }
  };

  const handleBatchMarkPayoutsCompleted = async () => {
    if (selectedTransactions.size === 0) return;
    setIsLoading(true);
    try {
      const paymentIds = Array.from(selectedTransactions);
      await batchMarkDoctorPayoutsCompleted(token, paymentIds);
      setPendingPayouts((prev) => prev.filter((p) => !selectedTransactions.has(p.id)));
      setFilteredPayouts((prev) => prev.filter((p) => !selectedTransactions.has(p.id)));
      setSelectedTransactions(new Set());
    } catch (err) {
      console.error('Error in batch marking payouts:', err);
      setError('Failed to process batch payouts.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rs. 0.00';
    return `Rs. ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==================== RENDER SECTIONS ====================

  const renderOverview = () => {
    if (isLoading || !metrics) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Transactions */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalTransactions}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <Users className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Gross Revenue */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Gross Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(metrics.totalGrossRevenue)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <TrendingUp className="text-green-600" size={28} />
              </div>
            </div>
          </div>

          {/* Platform Revenue */}
          <div className="bg-linear-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wide">Platform Revenue</p>
                <p className="text-2xl font-bold text-white mt-2">{formatCurrency(metrics.platformRevenue)}</p>
                <p className="text-xs text-indigo-200 mt-1">15% Take Rate</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <DollarSign className="text-white" size={28} />
              </div>
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-semibold uppercase tracking-wide">Pending Payouts</p>
                <p className="text-2xl font-bold text-white mt-2">{formatCurrency(metrics.pendingDoctorPayouts)}</p>
                <p className="text-xs text-amber-100 mt-1">To Doctors</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <Clock className="text-white" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-semibold text-gray-700">Completed Transactions:</span>
              <span className="text-lg font-bold text-gray-900">{metrics.completedTransactions}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="font-semibold text-green-700">Average Transaction Amount:</span>
              <span className="text-lg font-bold text-green-900">{formatCurrency(metrics.averageTransactionAmount)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
              <span className="font-semibold text-indigo-700">Platform Revenue (15%):</span>
              <span className="text-lg font-bold text-indigo-900">{formatCurrency(metrics.platformRevenue)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <span className="font-semibold text-orange-700">Total Doctor Payouts (85%):</span>
              <span className="text-lg font-bold text-orange-900">
                {formatCurrency(
                  metrics.totalGrossRevenue && metrics.platformRevenue
                    ? parseFloat(metrics.totalGrossRevenue) - parseFloat(metrics.platformRevenue)
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-6">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by ID, appointment, doctor, or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outlineone focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Gross Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Platform Fee (15%)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Doctor Earnings (85%)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Doctor ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">#{tx.id}</td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-semibold text-sm">
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm">
                          {formatCurrency(tx.platformFee)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg font-semibold text-sm">
                          {formatCurrency(tx.doctorEarnings)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">Dr-{tx.doctorId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tx.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPayouts = () => {
    return (
      <div className="space-y-4">
        {/* Batch Action Bar */}
        {selectedTransactions.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-indigo-600" size={20} />
              <span className="font-semibold text-indigo-900">
                {selectedTransactions.size} payout{selectedTransactions.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={handleBatchMarkPayoutsCompleted}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="inline animate-spin mr-2" size={16} /> : <SendHorizontal className="inline mr-2" size={16} />}
              Process Selected
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-6">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search pending payouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto text-green-500 mb-3" size={48} />
              <p className="text-gray-600 font-semibold">All payouts processed!</p>
              <p className="text-gray-500 text-sm">No pending doctor payouts at this time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.size === filteredPayouts.length && filteredPayouts.length > 0}
                        onChange={handleSelectAllTransactions}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Doctor Earnings
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Doctor ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Appointment ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Completed Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(payout.id)}
                          onChange={() => handleSelectTransaction(payout.id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">#{payout.id}</td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg font-bold text-sm">
                          {formatCurrency(payout.doctorEarnings)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">Dr-{payout.doctorId}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">#{payout.appointmentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(payout.completedAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleMarkPayoutCompleted(payout.id)}
                          disabled={processingPayouts.has(payout.id) || isLoading}
                          className="px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {processingPayouts.has(payout.id) ? (
                            <Loader2 className="inline animate-spin mr-1" size={12} />
                          ) : (
                            <SendHorizontal className="inline mr-1" size={12} />
                          )}
                          Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white borders border-gray-200 rounded-xl shadow-lg p-1 flex gap-1">
        {[
          { id: 'overview', label: 'Overview', icon: DollarSign },
          { id: 'transactions', label: 'All Transactions', icon: TrendingUp },
          { id: 'payouts', label: 'Doctor Payouts', icon: SendHorizontal },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setSelectedTransactions(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'payouts' && renderPayouts()}
      </div>
    </div>
  );
};

export default AdminTransactionMonitor;
