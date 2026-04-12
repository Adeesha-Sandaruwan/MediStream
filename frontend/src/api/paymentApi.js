import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:8087/api/v1/payments';

/**
 * Initiate a payment for an appointment
 * Creates a Stripe Payment Intent and returns client secret
 */
export const initiatePayment = async (token, paymentData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/initiate`, paymentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error initiating payment:', error);
    throw error;
  }
};

/**
 * Get payment details by appointment ID
 */
export const getPaymentByAppointment = async (token, appointmentId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/appointment/${appointmentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw error;
  }
};

/**
 * Get all payments for a patient
 */
export const getPatientPayments = async (token, patientId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching patient payments:', error);
    throw error;
  }
};

/**
 * Complete a payment (called after successful Stripe confirmation)
 */
export const completePayment = async (token, stripePaymentIntentId, paymentMethodLastFour, paymentMethodType) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/${stripePaymentIntentId}/complete`,
      {},
      {
        params: {
          paymentMethodLastFour,
          paymentMethodType,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error completing payment:', error);
    throw error;
  }
};

/**
 * Refund a payment
 */
export const refundPayment = async (token, paymentId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/${paymentId}/refund`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get all completed transactions (Admin Dashboard)
 */
export const getAllCompletedTransactions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/transactions/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching completed transactions:', error);
    throw error;
  }
};

/**
 * Get all pending doctor payouts
 */
export const getPendingPayouts = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/payouts/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching pending payouts:', error);
    throw error;
  }
};

/**
 * Get all transactions for a specific doctor
 */
export const getDoctorTransactions = async (token, doctorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/doctor/${doctorId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching doctor transactions:', error);
    throw error;
  }
};

/**
 * Get transaction metrics and summary
 */
export const getTransactionMetrics = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/metrics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction metrics:', error);
    throw error;
  }
};

/**
 * Mark a single doctor payout as completed
 */
export const markDoctorPayoutCompleted = async (token, paymentId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/payouts/${paymentId}/mark-completed`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error marking doctor payout as completed:', error);
    throw error;
  }
};

/**
 * Mark multiple doctor payouts as completed (Batch Operation)
 */
export const batchMarkDoctorPayoutsCompleted = async (token, paymentIds) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/payouts/batch-mark-completed`, paymentIds, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in batch marking doctor payouts:', error);
    throw error;
  }
};


