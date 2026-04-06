import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationTable from './NotificationTable';
import NotificationForm from './NotificationForm';

const API_BASE_URL = 'http://localhost:8085/api/notifications';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}`);
      setNotifications(res.data);
      calculateStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      sent: data.filter(n => n.status === 'SENT').length,
      failed: data.filter(n => n.status === 'FAILED').length,
      pending: data.filter(n => n.status === 'PENDING').length
    });
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      fetchNotifications();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/email/${search}`);
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (status) => {
    setFilter(status);
    if (!status) {
      fetchNotifications();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/status/${status}`);
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/${id}/retry`);
      alert('✅ Retry initiated');
      fetchNotifications();
    } catch (err) {
      alert('❌ Retry failed');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this notification?')) {
      try {
        await axios.delete(`${API_BASE_URL}/${id}`);
        alert('🗑️ Deleted');
        fetchNotifications();
      } catch (err) {
        alert('❌ Delete failed');
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const statCards = [
    { label: 'Total', value: stats.total, icon: '📊', color: '#0f766e' },
    { label: 'Delivered', value: stats.sent, icon: '✅', color: '#10b981' },
    { label: 'Failed', value: stats.failed, icon: '❌', color: '#ef4444' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: '#f59e0b' }
  ];

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.title}>
                <span style={styles.titleIcon}>🏥</span>
                HealthNotify
              </h1>
              <p style={styles.subtitle}>Patient Communication Dashboard</p>
            </div>
            <button style={styles.newBtn} onClick={() => setShowForm(true)}>
              <span style={styles.newIcon}>+</span> New Message
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          {statCards.map((stat, i) => (
            <div key={i} style={styles.statCard}>
              <div style={styles.statIcon}>{stat.icon}</div>
              <div>
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by email..."
              style={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button style={styles.searchBtn} onClick={handleSearch}>Search</button>
          </div>

          <div style={styles.filters}>
            {['', 'SENT', 'FAILED', 'PENDING'].map((status) => (
              <button
                key={status || 'all'}
                style={{
                  ...styles.filterBtn,
                  background: filter === status ? '#0f766e' : '#f1f5f9',
                  color: filter === status ? 'white' : '#475569'
                }}
                onClick={() => handleFilter(status)}
              >
                {status === '' ? 'All' : status === 'SENT' ? '✅ Sent' : status === 'FAILED' ? '❌ Failed' : '⏳ Pending'}
              </button>
            ))}
          </div>

          <button style={styles.refreshBtn} onClick={fetchNotifications}>
            🔄 Refresh
          </button>
        </div>

        {/* Table */}
        <NotificationTable
          notifications={notifications}
          loading={loading}
          onRetry={handleRetry}
          onDelete={handleDelete}
        />

        {/* Modal */}
        {showForm && (
          <div style={styles.modal} onClick={() => setShowForm(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
              <NotificationForm
                onSuccess={() => {
                  setShowForm(false);
                  fetchNotifications();
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #ccfbf1 0%, #f0fdf4 100%)',
    padding: '24px'
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    padding: '32px 40px'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  titleIcon: {
    fontSize: '32px'
  },
  subtitle: {
    margin: '8px 0 0',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '14px'
  },
  newBtn: {
    padding: '12px 24px',
    background: 'white',
    color: '#0f766e',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s'
  },
  newIcon: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    padding: '24px 32px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  statCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '28px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px'
  },
  controls: {
    padding: '20px 32px',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0'
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f8fafc',
    borderRadius: '10px',
    padding: '4px 4px 4px 12px',
    border: '1px solid #e2e8f0'
  },
  searchIcon: {
    fontSize: '14px'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '10px 0',
    fontSize: '14px',
    outline: 'none'
  },
  searchBtn: {
    padding: '8px 16px',
    background: '#0f766e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  filters: {
    display: 'flex',
    gap: '8px'
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  refreshBtn: {
    padding: '8px 16px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    width: '90%',
    maxWidth: '520px',
    maxHeight: '85vh',
    overflowY: 'auto',
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: '#f1f5f9',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default Notifications;




