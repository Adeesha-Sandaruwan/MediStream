import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initiatePayment, completePayment } from '../api/paymentApi';
import './PaymentModal.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_your_stripe_public_key_here');

/**
 * Payment Form Component
 * Handles the Stripe payment form
 */
function PaymentFormComponent({ clientSecret, appointmentId, onSuccess, onError, onSubmit }, ref) {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  // Stripe succeeded but backend sync failed — keep modal open so user can see details
  const [syncError, setSyncError] = useState(null); // { message, paymentIntentId }
  const [capturedPaymentIntent, setCapturedPaymentIntent] = useState(null);

  // Expose submit function to parent
  React.useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    isProcessing,
  }));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Stripe is not loaded');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSyncError(null);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation?appointmentId=${appointmentId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        onError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        // Extract payment method details
        const paymentMethodLastFour = paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 || '****';
        const paymentMethodType = 'card';

        // Notify backend of successful payment
        try {
          await completePayment(token, paymentIntent.id, paymentMethodLastFour, paymentMethodType);
          // Both Stripe + backend succeeded
          setSuccessMessage('Payment completed successfully!');
          onSuccess(paymentIntent);
        } catch (err) {
          console.error('Backend sync failed after Stripe success:', err);
          const errMsg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Server did not acknowledge the payment.';
          // Show a visible warning — do NOT silently call onSuccess
          setSyncError({ message: errMsg, paymentIntentId: paymentIntent.id });
          setCapturedPaymentIntent(paymentIntent);
        }
      } else if (paymentIntent.status === 'processing') {
        setSuccessMessage('Payment is processing. You will receive a confirmation email shortly.');
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setErrorMessage('An error occurred: ' + err.message);
      onError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form className="payment-form">
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <XCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-800">Payment Failed</p>
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
          <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}

      {/* ── Sync-error banner: Stripe charged the card but backend failed to record it ── */}
      {syncError && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg mb-4">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800">Payment Charged — Server Sync Failed</p>
            <p className="text-amber-700 text-sm mt-1">
              Your card was successfully charged by Stripe, but our server could not record the
              payment. <strong>Please copy your payment reference below</strong> and contact
              support if your appointment is not confirmed shortly.
            </p>
            {/* Selectable reference ID for easy copying */}
            <div className="mt-2 px-3 py-2 bg-amber-100 rounded border border-amber-200 font-mono text-xs text-amber-900 break-all select-all cursor-text">
              {syncError.paymentIntentId}
            </div>
            <p className="text-amber-600 text-xs mt-1 italic">
              Server error: {syncError.message}
            </p>
            <button
              type="button"
              onClick={() => onSuccess(capturedPaymentIntent, { syncError: true })}
              className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              I Understand, Close
            </button>
          </div>
        </div>
      )}

      {/* Hide the form controls once sync-error is shown so the user can't double-charge */}
      {!syncError && (
        <>
          <div className="payment-element-card">
            <div className="payment-element-card__header">
              <h3 className="payment-element-card__title">Payment details</h3>
              <p className="payment-element-card__subtitle">Enter your card details to complete the consultation payment securely.</p>
            </div>
            <PaymentElement
              options={{
                layout: 'accordion',
                defaultValues: {
                  billingDetails: {
                    name: '',
                    email: '',
                  },
                },
              }}
            />
          </div>

          <p className="text-sm text-gray-500 text-center mt-4 mb-4">
            Your payment is securely processed by Stripe. Your card information is never stored on our servers.
          </p>
        </>
      )}
    </form>
  );
}

const PaymentFormComponentRef = React.forwardRef(PaymentFormComponent);

/**
 * Payment Modal Component
 * Opens a modal dialog with payment form
 */
export default function PaymentModal({
  isOpen,
  onClose,
  appointmentId,
  amount,
  doctorName,
  doctorId,
  patientId,
  onSuccess
}) {
  const { token } = useAuth();
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = React.useRef(null);

  useEffect(() => {
    if (!isOpen || !appointmentId) return;

    const initializePayment = async () => {
      setIsLoading(true);
      setError('');

      try {
        const parsedPatientId = Number(patientId);
        const parsedDoctorId = Number(doctorId);

        if (!Number.isFinite(parsedPatientId) || parsedPatientId <= 0) {
          throw new Error('Unable to determine patient ID for payment. Please refresh and try again.');
        }
        if (!Number.isFinite(parsedDoctorId) || parsedDoctorId <= 0) {
          throw new Error('Unable to determine doctor ID for payment. Please refresh and try again.');
        }

        // Get consultation fee - use amount passed in or from appointment
        const paymentAmount = amount || 5000; // Default amount

        const paymentResponse = await initiatePayment(token, {
          appointmentId: parseInt(appointmentId),
          patientId: parsedPatientId,
          doctorId: parsedDoctorId,
          amount: parseFloat(paymentAmount),
          currency: 'LKR', // Default to LKR for Sri Lanka
          description: `Consultation with Dr. ${doctorName}`,
          returnUrl: `${window.location.origin}/patient-appointments`,
        });

        setClientSecret(paymentResponse.stripeClientSecret);
      } catch (err) {
        console.error('Error initializing payment:', err);
        const responseData = err?.response?.data;
        let backendMessage = '';

        if (typeof responseData === 'string') {
          backendMessage = responseData;
        } else if (responseData && typeof responseData === 'object') {
          backendMessage = responseData.message || responseData.error || '';
          if (!backendMessage) {
            backendMessage = JSON.stringify(responseData);
          }
        }

        const message = backendMessage || err?.message || 'Failed to initialize payment. Please try again.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [isOpen, appointmentId, amount, doctorName, doctorId, patientId, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-2 sm:px-3 backdrop-blur-sm">
      <div className="payment-modal-panel bg-white rounded-2xl shadow-2xl w-[98vw] sm:w-[96vw] md:w-full md:max-w-4xl xl:max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-8 sm:px-12 py-6 border-b border-indigo-200 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Payment</h2>
            <p className="text-indigo-100 text-base mt-1">Secure payment with Stripe</p>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-100 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Main Content: Two Column Layout */}
        <div className="flex flex-col lg:flex-row max-h-[calc(95vh-180px)] overflow-hidden">
          {/* Left Side: Card Details */}
          <div className="lg:w-2/5 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 border-r border-indigo-200 p-8 sm:p-12 overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Appointment Details</h3>

            {/* Doctor Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-indigo-100">
              <span className="text-indigo-600 text-xs uppercase tracking-widest font-bold">Doctor</span>
              <p className="text-3xl font-bold text-gray-900 mt-2">Dr. {doctorName}</p>
              <p className="text-gray-600 mt-2">Consultation Service</p>
            </div>

            {/* Amount Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-green-100">
              <span className="text-green-600 text-xs uppercase tracking-widest font-bold">Consultation Fee</span>
              <p className="text-4xl font-bold text-green-600 mt-3">LKR {parseFloat(amount || 5000).toFixed(2)}</p>
              <p className="text-gray-600 text-sm mt-2">One-time payment for consultation</p>
            </div>

            {/* Security Info */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
              <span className="text-blue-600 text-xs uppercase tracking-widest font-bold">Security</span>
              <p className="text-gray-700 mt-3 text-sm leading-relaxed">
                ✓ Secure payment processing with Stripe
              </p>
              <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                ✓ Your card information is never stored
              </p>
              <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                ✓ PCI-DSS compliant encryption
              </p>
            </div>
          </div>

          {/* Right Side: Payment Form */}
          <div className="lg:w-3/5 bg-white flex flex-col overflow-hidden">
            {/* Scrollable Content Area */}
            <div className="flex-1 p-8 sm:p-12 overflow-y-auto overflow-x-hidden pb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Enter Payment Details</h3>
            {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-indigo-600">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-medium">Setting up payment...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="text-red-600 mb-4" size={40} />
              <p className="text-red-600 font-semibold mb-2">Setup Error</p>
              <p className="text-gray-600 text-center mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#4f46e5',
                    colorBackground: '#ffffff',
                    colorText: '#0f172a',
                    colorDanger: '#dc2626',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '12px',
                    spacingUnit: '6px',
                    fontSizeBase: '16px',
                  },
                  rules: {
                    '.Block': {
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      boxShadow: 'none',
                    },
                    '.Input': {
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      boxShadow: 'none',
                    },
                    '.Input:focus': {
                      borderColor: '#4f46e5',
                      boxShadow: '0 0 0 3px rgba(79,70,229,0.15)',
                    },
                    '.Label': {
                      color: '#334155',
                      fontWeight: '600',
                    },
                    '.Tab': {
                      border: '1px solid #cbd5e1',
                      boxShadow: 'none',
                    },
                    '.Tab--selected': {
                      borderColor: '#4f46e5',
                      backgroundColor: '#eef2ff',
                    },
                  },
                },
              }}
            >
              <PaymentFormComponentRef
                ref={formRef}
                clientSecret={clientSecret}
                appointmentId={appointmentId}
                onSuccess={(paymentIntent, meta) => {
                  onSuccess(paymentIntent, meta);
                  onClose();
                }}
                onError={(errorMsg) => {
                   setError(errorMsg);
                 }}
                 />
             </Elements>
            ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 sm:px-12 py-4 flex flex-col gap-3">
          <button
            onClick={() => formRef.current?.submit()}
            disabled={isLoading || !clientSecret || (formRef.current && formRef.current.isProcessing)}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-bold text-base rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 flex items-center justify-center gap-2 min-h-12"
          >
            <Loader2 className={`${(formRef.current && formRef.current.isProcessing) ? 'animate-spin' : 'hidden'}`} size={18} />
            <span>Complete Payment</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
