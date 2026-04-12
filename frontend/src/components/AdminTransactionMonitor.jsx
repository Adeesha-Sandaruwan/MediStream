import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getGlobalTransactionLedger,
  getTransactionMetrics,
} from '../api/paymentApi';
import { getAllUsers } from '../api/adminApi';
import { getAllPatients } from '../api/patientApi';
import { getAllDoctors } from '../api/doctorApi';

const AdminTransactionMonitor = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Overview tab state
  const [metrics, setMetrics] = useState(null);

  // ==================== GLOBAL TRANSACTION LEDGER LOGIC: STATE ====================
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('LAST_30_DAYS');
  const [patientNameById, setPatientNameById] = useState({});
  const [doctorNameById, setDoctorNameById] = useState({});

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (activeTab === 'overview') {
        const metricsData = await getTransactionMetrics(token);
        setMetrics(metricsData);
      } else if (activeTab === 'transactions') {
        // ==================== GLOBAL TRANSACTION LEDGER LOGIC: DATA FETCH ====================
        const [ledgerData, users, patients, doctors] = await Promise.all([
          getGlobalTransactionLedger(token),
          getAllUsers(token),
          getAllPatients(token),
          getAllDoctors(token),
        ]);

        const patientEmailToName = patients.reduce((acc, profile) => {
          if (profile?.email) {
            const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
            acc[profile.email] = fullName || profile.email;
          }
          return acc;
        }, {});

        const doctorEmailToName = doctors.reduce((acc, profile) => {
          if (profile?.email) {
            const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
            acc[profile.email] = fullName ? `Dr. ${fullName}` : profile.email;
          }
          return acc;
        }, {});

        const patientLookup = {};
        const doctorLookup = {};

        users.forEach((user) => {
          if (user?.role === 'PATIENT') {
            patientLookup[user.id] = patientEmailToName[user.email] || user.email || `Patient #${user.id}`;
          }
          if (user?.role === 'DOCTOR') {
            doctorLookup[user.id] = doctorEmailToName[user.email] || user.email || `Doctor #${user.id}`;
          }
        });

        setPatientNameById(patientLookup);
        setDoctorNameById(doctorLookup);
        setTransactions(ledgerData);
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

  // ==================== GLOBAL TRANSACTION LEDGER LOGIC: HELPERS ====================
  const mapLedgerStatus = (paymentStatus) => {
    if (paymentStatus === 'COMPLETED') return 'SUCCESS';
    return paymentStatus || 'UNKNOWN';
  };

  const getTransactionDate = (tx) => {
    return tx.completedAt || tx.updatedAt || tx.createdAt;
  };

  const isWithinDateRange = (dateValue, range) => {
    if (!dateValue || range === 'ALL_TIME') return true;
    const txDate = new Date(dateValue);
    if (Number.isNaN(txDate.getTime())) return false;

    const now = new Date();
    const daysMap = {
      LAST_7_DAYS: 7,
      LAST_30_DAYS: 30,
      LAST_90_DAYS: 90,
    };
    const selectedDays = daysMap[range];
    if (!selectedDays) return true;

    const threshold = new Date(now);
    threshold.setDate(now.getDate() - selectedDays);
    return txDate >= threshold;
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'SUCCESS') return 'bg-emerald-50 text-emerald-700';
    if (status === 'PENDING') return 'bg-amber-50 text-amber-700';
    if (status === 'REFUNDED') return 'bg-slate-100 text-slate-700';
    if (status === 'FAILED') return 'bg-rose-50 text-rose-700';
    return 'bg-gray-100 text-gray-700';
  };

  // ==================== GLOBAL TRANSACTION LEDGER LOGIC: FILTERING ====================
  useEffect(() => {
    const filtered = transactions.filter((tx) => {
      const ledgerStatus = mapLedgerStatus(tx.paymentStatus);
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        query.length === 0 ||
        tx.id?.toString().toLowerCase().includes(query) ||
        tx.transactionReference?.toLowerCase().includes(query) ||
        tx.stripePaymentIntentId?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'ALL' || ledgerStatus === statusFilter;
      const matchesDateRange = isWithinDateRange(getTransactionDate(tx), dateRangeFilter);

      return matchesSearch && matchesStatus && matchesDateRange;
    });

    setFilteredTransactions(filtered);
  }, [searchQuery, statusFilter, dateRangeFilter, transactions]);

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

          {/* Doctor Earnings */}
          <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-semibold uppercase tracking-wide">Doctor Earnings</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {formatCurrency(
                    metrics.totalGrossRevenue && metrics.platformRevenue
                      ? parseFloat(metrics.totalGrossRevenue) - parseFloat(metrics.platformRevenue)
                      : 0
                  )}
                </p>
                <p className="text-xs text-amber-100 mt-1">85% Share</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <CheckCircle2 className="text-white" size={28} />
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
          {/* ==================== GLOBAL TRANSACTION LEDGER LOGIC: FILTER CONTROLS ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="FAILED">FAILED</option>
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_90_DAYS">Last 90 Days</option>
              <option value="ALL_TIME">All Time</option>
            </select>
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
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Patient Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Doctor Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Gross Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Platform Fee (15%)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(getTransactionDate(tx))}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">#{tx.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {patientNameById[tx.patientId] || `Patient #${tx.patientId}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {doctorNameById[tx.doctorId] || `Doctor #${tx.doctorId}`}
                      </td>
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
                        <span className={`px-3 py-1 rounded-lg font-semibold text-sm ${getStatusBadgeClass(mapLedgerStatus(tx.paymentStatus))}`}>
                          {mapLedgerStatus(tx.paymentStatus)}
                        </span>
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
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // ==================== GLOBAL TRANSACTION LEDGER LOGIC: FILTER RESET ====================
                setSearchQuery('');
                setStatusFilter('ALL');
                setDateRangeFilter('LAST_30_DAYS');
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
      </div>
    </div>
  );
};

export default AdminTransactionMonitor;
