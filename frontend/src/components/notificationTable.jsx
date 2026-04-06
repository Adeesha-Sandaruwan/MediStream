import React, { useState } from 'react';

const NotificationTable = ({ notifications, loading, onRetry, onDelete }) => {
  const [expandedId, setExpandedId] = useState(null);

  const getStatusStyle = (status) => {
    const styles = {
      SENT: { icon: '✅', text: 'Delivered', bg: '#d1fae5', color: '#065f46' },
      FAILED: { icon: '❌', text: 'Failed', bg: '#fee2e2', color: '#991b1b' },
      PENDING: { icon: '⏳', text: 'Pending', bg: '#fed7aa', color: '#92400e' }
    };
    return styles[status] || { icon: '📧', text: status, bg: '#f1f5f9', color: '#475569' };
  };

  const formatRelativeTime = (date) => {
    if (!date) return '—';
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.spinner}></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📭</div>
        <h4 style={styles.emptyTitle}>No notifications yet</h4>
        <p style={styles.emptyText}>Click "New Notification" to get started</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.count}>📊 {notifications.length} notifications</span>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tr}>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Recipient</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Priority</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((item) => {
              const status = getStatusStyle(item.status);
              const isExpanded = expandedId === item.id;
              
              return (
                <React.Fragment key={item.id}>
                  <tr style={styles.tr} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: status.bg, color: status.color }}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.email}>
                        <span>📧</span>
                        <span style={{ wordBreak: 'break-all' }}>{item.recipientEmail}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.subject} title={item.subject}>
                        {item.subject || '—'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.priority,
                        background: item.priority === 'URGENT' ? '#fee2e2' :
                                   item.priority === 'HIGH' ? '#fed7aa' :
                                   item.priority === 'MEDIUM' ? '#dbeafe' : '#d1fae5',
                        color: item.priority === 'URGENT' ? '#991b1b' :
                               item.priority === 'HIGH' ? '#92400e' :
                               item.priority === 'MEDIUM' ? '#1e40af' : '#065f46'
                      }}>
                        {item.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span title={item.sentAt ? new Date(item.sentAt).toLocaleString() : ''}>
                        {formatRelativeTime(item.sentAt)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {item.status === 'FAILED' && (
                          <button style={styles.retry} onClick={(e) => { e.stopPropagation(); onRetry(item.id); }}>
                            🔄 Retry
                          </button>
                        )}
                        <button style={styles.delete} onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                          🗑️ Delete
                        </button>
                        <button style={styles.expand}>{isExpanded ? '▲' : '▼'}</button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan="6" style={styles.expanded}>
                        <div>
                          <strong>📝 Message:</strong>
                          <div style={styles.message}>{item.content}</div>
                        </div>
                        <div style={styles.details}>
                          <div><strong>ID:</strong> #{item.id}</div>
                          <div><strong>Type:</strong> {item.type}</div>
                          <div><strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    margin: '0 24px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0'
  },
  count: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#0f766e'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#0f172a',
    borderBottom: '1px solid #f1f5f9'
  },
  tr: {
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600'
  },
  email: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  subject: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  priority: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  },
  actions: {
    display: 'flex',
    gap: '6px'
  },
  retry: {
    padding: '4px 10px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  delete: {
    padding: '4px 10px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  expand: {
    padding: '4px 8px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px'
  },
  expanded: {
    padding: '20px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  message: {
    marginTop: '8px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    lineHeight: '1.5'
  },
  details: {
    display: 'flex',
    gap: '24px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#64748b'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a'
  },
  emptyText: {
    margin: 0,
    fontSize: '13px'
  },
  spinner: {
    width: '32px',
    height: '32px',
    margin: '0 auto 16px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0f766e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default NotificationTable;