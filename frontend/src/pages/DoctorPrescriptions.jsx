import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardPlus, Video, Pill, CalendarDays, UserRound, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { getMyPrescriptions, issuePrescription } from '../api/doctorApi';

const initialPrescriptionState = {
  patientEmail: '',
  appointmentId: '',
  diagnosis: '',
  medications: '',
  advice: '',
  doctorSignature: '',
  followUpDate: '',
};

export default function DoctorPrescriptions() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [prescriptionForm, setPrescriptionForm] = useState(initialPrescriptionState);
  const [prescriptions, setPrescriptions] = useState([]);

  const loadPrescriptions = useCallback(async () => {
    setError('');
    try {
      setPrescriptions(await getMyPrescriptions(token));
    } catch (err) {
      setError(err.message || 'Failed to fetch prescriptions');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadPrescriptions();
    }
  }, [loadPrescriptions, token]);

  const handleIssuePrescription = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const created = await issuePrescription(token, {
        ...prescriptionForm,
        appointmentId: prescriptionForm.appointmentId ? Number(prescriptionForm.appointmentId) : null,
      });
      setPrescriptions((prev) => [created, ...prev]);
      setPrescriptionForm(initialPrescriptionState);
      setSuccess('Prescription issued and auto-saved to patient history.');
    } catch (err) {
      setError(err.message || 'Failed to issue prescription');
    }
  };

  const handleDownloadPrescriptionPdf = (item) => {
    const doc = new jsPDF();
    const issuedDate = item.issuedAt ? new Date(item.issuedAt).toLocaleString() : 'N/A';
    const lines = [
      'Digital Prescription',
      '',
      `Doctor: ${item.doctorEmail || 'N/A'}`,
      `Patient: ${item.patientEmail || 'N/A'}`,
      `Issued At: ${issuedDate}`,
      `Appointment ID: ${item.appointmentId || 'N/A'}`,
      `Follow-up Date: ${item.followUpDate || 'N/A'}`,
      '',
      `Diagnosis: ${item.diagnosis || ''}`,
      '',
      'Medications:',
      item.medications || '',
      '',
      'Advice:',
      item.advice || 'No additional advice provided.',
      '',
      `Digital Signature: ${item.doctorSignature || item.doctorEmail || 'N/A'}`,
    ];

    let y = 20;
    lines.forEach((line, index) => {
      const fontSize = index === 0 ? 16 : 11;
      doc.setFontSize(fontSize);
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, 15, y);
      y += split.length * 6;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    });

    const safePatient = (item.patientEmail || 'patient').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`prescription_${safePatient}_${item.id || 'record'}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-gray-600">Loading prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/doctor-dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
            &larr; Back to Doctor Dashboard
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mt-2 tracking-tight">Digital Prescriptions</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white p-6 shadow-md">
        <h2 className="text-xl font-bold">Prescription Workspace</h2>
        <p className="text-violet-100 text-sm mt-1">Create secure digital prescriptions and keep treatment records organized.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/doctor-profile" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Profile</Link>
          <Link to="/doctor-availability" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Availability</Link>
          <Link to="/doctor-appointments" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Appointments</Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">{success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 xl:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Issue New Prescription</h2>
          <form onSubmit={handleIssuePrescription} className="space-y-3">
            <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Patient email" value={prescriptionForm.patientEmail} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientEmail: e.target.value })} required />
            <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Appointment ID (optional)" value={prescriptionForm.appointmentId} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, appointmentId: e.target.value })} />
            <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Diagnosis" value={prescriptionForm.diagnosis} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })} required />
            <textarea className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" rows="3" placeholder="Medications" value={prescriptionForm.medications} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medications: e.target.value })} required />
            <textarea className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" rows="3" placeholder="Advice" value={prescriptionForm.advice} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, advice: e.target.value })} />
            <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Digital signature (e.g., Dr. John Doe, MBBS)" value={prescriptionForm.doctorSignature} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorSignature: e.target.value })} required />
            <input type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" value={prescriptionForm.followUpDate} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, followUpDate: e.target.value })} />
            <button type="submit" className="w-full inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
              <ClipboardPlus className="mr-2" size={16} /> Issue Prescription
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 xl:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Issued Prescriptions</h2>
          <div className="space-y-3">
            {prescriptions.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-violet-50 border-b border-violet-100 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-violet-900 font-semibold flex items-center text-sm">
                    <UserRound className="mr-2" size={14} />
                    {item.patientEmail}
                  </div>
                  <div className="text-xs text-violet-700 font-semibold uppercase tracking-wide flex items-center">
                    <CalendarDays className="mr-1" size={12} />
                    {new Date(item.issuedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Diagnosis</p>
                  <p className="font-semibold text-gray-900 flex items-start">
                    <Pill className="mr-2 mt-0.5 text-violet-600 shrink-0" size={16} />
                    {item.diagnosis}
                  </p>

                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Digital Signature: </span>
                    <span className="italic">{item.doctorSignature || item.doctorEmail}</span>
                  </p>

                  <div className="mt-4">
                    <button
                      onClick={() => handleDownloadPrescriptionPdf(item)}
                      className="inline-flex items-center px-3 py-2 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 font-semibold text-sm transition-colors"
                    >
                      <Download className="mr-2" size={14} /> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {prescriptions.length === 0 && (
              <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                No prescriptions issued yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
