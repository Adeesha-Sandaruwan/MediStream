import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8085/api/notifications';

const NotificationForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    recipientEmail: '',
    subject: '',
    content: '',
    type: 'EMAIL',
    sendNow: true,
    priority: 'MEDIUM',
    scheduledTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState(0);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.recipientEmail) {
      newErrors.recipientEmail = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.recipientEmail)) {
      newErrors.recipientEmail = 'Please enter a valid email address';
    }
    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.content) {
      newErrors.content = 'Message content is required';
    } else if (formData.content.length < 10) {
      newErrors.content = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        scheduledTime: formData.sendNow ? null : formData.scheduledTime
      };
      const response = await axios.post(`${API_BASE_URL}/send`, payload);
      
      if (formData.sendNow) {
        alert(`✅ Notification sent successfully to ${formData.recipientEmail}!`);
      } else {
        alert(`📅 Notification scheduled for ${new Date(formData.scheduledTime).toLocaleString()}`);
      }
      
      setFormData({
        recipientEmail: '',
        subject: '',
        content: '',
        type: 'EMAIL',
        sendNow: true,
        priority: 'MEDIUM',
        scheduledTime: ''
      });
      setCharCount(0);
      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('❌ Failed to send notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    const newValue = inputType === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: newValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    if (name === 'content') {
      setCharCount(value.length);
    }
  };

  const notificationTypes = [
    { value: 'EMAIL', label: '📧 Email', color: '#0891b2' },
    { value: 'SMS', label: '📱 SMS', color: '#059669' },
    { value: 'PUSH', label: '🔔 Push', color: '#dc2626' },
    { value: 'APPOINTMENT_REMINDER', label: '📅 Appointment', color: '#7c3aed' },
    { value: 'MEDICATION_ALERT', label: '💊 Medication', color: '#ea580c' },
    { value: 'LAB_RESULT', label: '🔬 Lab Result', color: '#0d9488' },
    { value: 'BILLING', label: '💰 Billing', color: '#0284c7' }
  ];

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formHeader}>
        <div style={styles.headerIcon}>✉️</div>
        <div>
          <h3 style={styles.headerTitle}>Compose New Message</h3>
          <p style={styles.headerSubtitle}>Send important updates to patients</p>
        </div>
      </div>

      <div style={styles.typeGrid}>
        {notificationTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => handleChange({ target: { name: 'type', value: type.value } })}
            style={{
              ...styles.typeChip,
              background: formData.type === type.value ? type.color : '#f1f5f9',
              color: formData.type === type.value ? 'white' : '#475569',
              borderColor: formData.type === type.value ? type.color : '#e2e8f0'
            }}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          Recipient <span style={styles.required}>*</span>
        </label>
        <div style={styles.inputGroup}>
          <span style={styles.inputIcon}>👤</span>
          <input
            type="email"
            name="recipientEmail"
            placeholder="patient@example.com"
            style={styles.input}
            value={formData.recipientEmail}
            onChange={handleChange}
          />
        </div>
        {errors.recipientEmail && <div style={styles.error}>{errors.recipientEmail}</div>}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          Subject <span style={styles.required}>*</span>
        </label>
        <input
          type="text"
          name="subject"
          placeholder="e.g., Upcoming Appointment Reminder"
          style={styles.input}
          value={formData.subject}
          onChange={handleChange}
        />
        {errors.subject && <div style={styles.error}>{errors.subject}</div>}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          Message <span style={styles.required}>*</span>
        </label>
        <div style={styles.toolbar}>
          {['Bold', 'Italic', 'Link', 'List'].map((tool) => (
            <button key={tool} type="button" style={styles.toolBtn}>
              {tool}
            </button>
          ))}
        </div>
        <textarea
          name="content"
          placeholder="Write your message here..."
          style={styles.textarea}
          value={formData.content}
          onChange={handleChange}
          rows={5}
        />
        <div style={styles.counter}>
          {charCount} characters {charCount < 10 && <span style={{ color: '#ef4444' }}>(min 10)</span>}
        </div>
        {errors.content && <div style={styles.error}>{errors.content}</div>}
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Priority</label>
          <div style={styles.priorityGroup}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
              <label key={priority} style={styles.radioLabel}>
                <input
                  type="radio"
                  name="priority"
                  value={priority}
                  checked={formData.priority === priority}
                  onChange={handleChange}
                  style={styles.radio}
                />
                <span style={{
                  ...styles.priorityBadge,
                  background: priority === 'LOW' ? '#10b981' : 
                             priority === 'MEDIUM' ? '#3b82f6' :
                             priority === 'HIGH' ? '#f59e0b' : '#ef4444',
                  opacity: formData.priority === priority ? 1 : 0.4
                }}>
                  {priority}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Schedule</label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="sendNow"
              checked={formData.sendNow}
              onChange={handleChange}
              style={styles.checkbox}
            />
            Send immediately
          </label>
          {!formData.sendNow && (
            <input
              type="datetime-local"
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              style={{ ...styles.input, marginTop: '8px' }}
            />
          )}
        </div>
      </div>

      {formData.content && (
        <div style={styles.preview}>
          <div style={styles.previewTitle}>Preview</div>
          <div style={styles.previewContent}>
            <strong>{formData.subject || 'No Subject'}</strong>
            <p style={{ marginTop: '8px', color: '#64748b' }}>
              {formData.content.substring(0, 120)}
              {formData.content.length > 120 && '...'}
            </p>
          </div>
        </div>
      )}

      <div style={styles.actions}>
        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? '⏳ Sending...' : (formData.sendNow ? '📤 Send Now' : '📅 Schedule')}
        </button>
        {onCancel && (
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0'
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a'
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b'
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '8px'
  },
  typeChip: {
    padding: '8px 12px',
    border: '1.5px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontWeight: '600',
    color: '#0f172a',
    fontSize: '13px'
  },
  required: {
    color: '#ef4444'
  },
  inputGroup: {
    position: 'relative'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  textarea: {
    padding: '10px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none'
  },
  toolbar: {
    display: 'flex',
    gap: '6px',
    padding: '6px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  toolBtn: {
    padding: '4px 10px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500'
  },
  counter: {
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'right'
  },
  error: {
    color: '#ef4444',
    fontSize: '11px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  priorityGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  radio: {
    cursor: 'pointer'
  },
  priorityBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  checkbox: {
    cursor: 'pointer'
  },
  preview: {
    background: '#f8fafc',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  previewTitle: {
    padding: '10px 12px',
    background: '#e2e8f0',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  previewContent: {
    padding: '12px',
    fontSize: '13px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default NotificationForm;