import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyPrescriptionsAsPatient } from '../api/patientApi';
import { Link } from 'react-router-dom';
import { Loader2, Pill, User, Calendar, Activity, AlertCircle, ClipboardCheck, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

const PatientPrescriptions = () => {
    const { token } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPrescriptions();
    }, [token]);

    const fetchPrescriptions = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getMyPrescriptionsAsPatient(token);
            // Sort by most recent first
            const sortedData = data.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
            setPrescriptions(sortedData);
        } catch (err) {
            console.error(err);
            setError('Could not connect to the Doctor Service to retrieve prescriptions.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPrescriptionPdf = (rx) => {
        const doc = new jsPDF();
        const issuedDate = rx.issuedAt ? new Date(rx.issuedAt).toLocaleString() : 'N/A';
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFillColor(245, 158, 11);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(17);
        doc.setFont('helvetica', 'bold');
        doc.text('Digital Prescription', 14, 18);

        doc.setFontSize(10);
        doc.text('MediStream Patient Copy', pageWidth - 54, 18);

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        doc.setFillColor(255, 247, 237);
        doc.roundedRect(12, 34, pageWidth - 24, 35, 3, 3, 'F');
        doc.text(`Doctor: ${rx.doctorEmail || 'N/A'}`, 16, 44);
        doc.text(`Patient: ${rx.patientEmail || 'N/A'}`, 16, 52);
        doc.text(`Issued At: ${issuedDate}`, 16, 60);
        doc.text(`Appointment ID: ${rx.appointmentId || 'N/A'}`, pageWidth / 2, 44);
        doc.text(`Follow-up Date: ${rx.followUpDate || 'N/A'}`, pageWidth / 2, 52);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.text('Diagnosis', 14, 83);
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        const diagnosisText = doc.splitTextToSize(rx.diagnosis || 'N/A', pageWidth - 28);
        doc.text(diagnosisText, 14, 91);

        let y = 100 + diagnosisText.length * 5;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(12, y, pageWidth - 24, 52, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('Medications', 16, y + 10);
        doc.setTextColor(5, 150, 105);
        doc.text("Doctor Advice", pageWidth / 2 + 4, y + 10);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);
        const meds = doc.splitTextToSize(rx.medications || 'N/A', (pageWidth - 40) / 2);
        const advice = doc.splitTextToSize(rx.advice || 'No additional advice provided.', (pageWidth - 40) / 2);
        doc.text(meds, 16, y + 18);
        doc.text(advice, pageWidth / 2 + 4, y + 18);

        y += 64;

        doc.setDrawColor(209, 213, 219);
        doc.line(14, y, pageWidth - 14, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('Doctor Signature', 14, y);

        if (rx.doctorSignatureImage) {
            try {
                doc.addImage(rx.doctorSignatureImage, 'PNG', 14, y + 3, 56, 22);
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

        const safePatient = (rx.patientEmail || 'patient').replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`prescription_${safePatient}_${rx.id || 'record'}.pdf`);
    };

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-radial-[at_20%_10%] from-amber-100 via-white to-indigo-50" />
            <div className="absolute -z-10 top-16 -left-10 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />

            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="mb-6">
                    <Link to="/patient-dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
                        &larr; Back to Dashboard
                    </Link>
                </div>

                <section className="rounded-3xl border border-amber-100 bg-linear-to-r from-amber-500 to-orange-500 p-6 sm:p-8 text-white shadow-xl shadow-amber-300/30 mb-8">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
                     DIGITAL PRESCRIPTION VAULT
                    </p>
                    <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">My Prescriptions</h1>
                    <p className="mt-2 text-amber-50 max-w-2xl">Review diagnosis details, medication plans, and doctor guidance in one clean timeline.</p>
                </section>

                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 mb-6 shadow-sm inline-flex items-center gap-2 text-slate-700 text-sm font-semibold">
                    <ClipboardCheck size={16} className="text-emerald-600" />
                    Prescriptions are sorted by most recent issue date
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                        <AlertCircle className="mr-2 shrink-0" size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-20 text-gray-500">
                        <Loader2 className="animate-spin mb-4" size={48} />
                        <p className="font-medium">Retrieving medical records...</p>
                    </div>
                ) : prescriptions.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Pill className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Prescriptions Found</h3>
                        <p className="text-gray-500">You do not have any digital prescriptions on file at this time.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {prescriptions.map((rx) => (
                            <div key={rx.id} className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                                <div className="bg-linear-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center text-amber-900 font-bold">
                                        <Calendar className="mr-2" size={18} />
                                        Issued: {new Date(rx.issuedAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center text-slate-600 text-sm font-medium">
                                        <User className="mr-1" size={16} /> {rx.doctorEmail}
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div>
                                        <h4 className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            <Activity className="mr-2" size={16} /> Diagnosis
                                        </h4>
                                        <p className="text-lg font-bold text-slate-900">{rx.diagnosis}</p>
                                        <p className="text-sm text-slate-600 mt-2">
                                            <span className="font-bold text-slate-700">Doctor Signature: </span>
                                            <span className="italic">{rx.doctorSignature || rx.doctorEmail}</span>
                                        </p>
                                        {rx.doctorSignatureImage && (
                                            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-2 w-fit">
                                                <img src={rx.doctorSignatureImage} alt="Doctor signature" className="h-12 object-contain" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Medications</h4>
                                            <p className="text-slate-800 whitespace-pre-line leading-relaxed">{rx.medications}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Doctor's Advice</h4>
                                            <p className="text-slate-800 whitespace-pre-line leading-relaxed">{rx.advice || 'No additional advice provided.'}</p>
                                        </div>
                                    </div>

                                    {rx.followUpDate && (
                                        <div className="pt-4 border-t border-slate-100 text-sm">
                                            <span className="font-bold text-slate-700">Follow-up Recommended: </span>
                                            <span className="text-amber-600 font-bold">{new Date(rx.followUpDate).toLocaleDateString()}</span>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadPrescriptionPdf(rx)}
                                            className="inline-flex items-center rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200"
                                        >
                                            <Download className="mr-2" size={15} /> Download PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientPrescriptions;