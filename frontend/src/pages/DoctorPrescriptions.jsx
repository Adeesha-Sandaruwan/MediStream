import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  followUpDate: '',
};

export default function DoctorPrescriptions() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [prescriptionForm, setPrescriptionForm] = useState(initialPrescriptionState);
  const [prescriptions, setPrescriptions] = useState([]);

  const linkedAppointmentId = searchParams.get('appointmentId') || '';
  const linkedPatientEmail = searchParams.get('patientEmail') || '';
  const linkedDiagnosis = searchParams.get('diagnosis') || '';
  const isLinkedAppointment = Boolean(linkedAppointmentId);

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

  useEffect(() => {
    if (!linkedAppointmentId && !linkedPatientEmail && !linkedDiagnosis) {
      return;
    }
    setPrescriptionForm((prev) => ({
      ...prev,
      appointmentId: linkedAppointmentId || prev.appointmentId,
      patientEmail: linkedPatientEmail || prev.patientEmail,
      diagnosis: linkedDiagnosis || prev.diagnosis,
    }));
  }, [linkedAppointmentId, linkedPatientEmail, linkedDiagnosis]);

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
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(91, 33, 182);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('Digital Prescription', 14, 18);

    doc.setFontSize(10);
    doc.text('MediStream Doctor Service', pageWidth - 58, 18);

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    doc.setFillColor(245, 243, 255);
    doc.roundedRect(12, 34, pageWidth - 24, 35, 3, 3, 'F');
    doc.text(`Doctor: ${item.doctorEmail || 'N/A'}`, 16, 44);
    doc.text(`Patient: ${item.patientEmail || 'N/A'}`, 16, 52);
    doc.text(`Issued At: ${issuedDate}`, 16, 60);
    doc.text(`Appointment ID: ${item.appointmentId || 'N/A'}`, pageWidth / 2, 44);
    doc.text(`Follow-up Date: ${item.followUpDate || 'N/A'}`, pageWidth / 2, 52);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(76, 29, 149);
    doc.text('Diagnosis', 14, 83);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'normal');
    const diagnosisText = doc.splitTextToSize(item.diagnosis || 'N/A', pageWidth - 28);
    doc.text(diagnosisText, 14, 91);

    let y = 100 + diagnosisText.length * 5;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(12, y, pageWidth - 24, 52, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Medications', 16, y + 10);
    doc.setTextColor(22, 101, 52);
    doc.text('Doctor Advice', pageWidth / 2 + 4, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    const meds = doc.splitTextToSize(item.medications || 'N/A', (pageWidth - 40) / 2);
    const advice = doc.splitTextToSize(item.advice || 'No additional advice provided.', (pageWidth - 40) / 2);
    doc.text(meds, 16, y + 18);
    doc.text(advice, pageWidth / 2 + 4, y + 18);

    y += 64;

    doc.setDrawColor(209, 213, 219);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Digital Signature', 14, y);

    if (item.doctorSignatureImage) {
      try {
        doc.addImage(item.doctorSignatureImage, 'PNG', 14, y + 3, 56, 22);
      } catch {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Signature image unavailable', 14, y + 10);
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('No signature image on file', 14, y + 10);
    }

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
      {linkedAppointmentId && (
        <div className="bg-violet-50 border border-violet-200 text-violet-800 p-4 rounded-xl text-sm">
          Linked appointment detected. Prescription form is prefilled for Appointment #{linkedAppointmentId}.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 xl:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Issue New Prescription</h2>
          <form onSubmit={handleIssuePrescription} className="space-y-3">
            <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Patient email" value={prescriptionForm.patientEmail} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientEmail: e.target.value })} required />
            <input
              className={`w-full px-3 py-2.5 border border-gray-300 rounded-xl outline-none ${isLinkedAppointment ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200'}`}
              placeholder="Appointment ID (optional)"
              value={prescriptionForm.appointmentId}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, appointmentId: e.target.value })}
              readOnly={isLinkedAppointment}
              title={isLinkedAppointment ? 'Linked from appointment and locked' : 'Optional'}
            />
            <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Diagnosis" value={prescriptionForm.diagnosis} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })} required />
            <textarea className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" rows="3" placeholder="Medications" value={prescriptionForm.medications} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medications: e.target.value })} required />
            <textarea className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none" rows="3" placeholder="Advice" value={prescriptionForm.advice} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, advice: e.target.value })} />
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-sm text-violet-800">
              Signature image is mandatory and is pulled from Doctor Profile when issuing prescriptions.
            </div>
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

                  {item.doctorSignatureImage && (
                    <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg p-2 w-fit">
                      <img src={item.doctorSignatureImage} alt="Stored doctor signature" className="h-12 object-contain" />
                    </div>
                  )}

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
