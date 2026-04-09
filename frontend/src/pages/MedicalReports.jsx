import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMedicalReports, uploadMedicalReport, downloadReportSecurely } from '../api/patientApi';
import { FileText, Upload, Download, Loader2, ShieldCheck, CalendarDays, Sparkles } from 'lucide-react';

const MedicalReports = () => {
    const { token } = useAuth();
    const [reports, setReports] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchReports();
    }, [token]);

    const fetchReports = async () => {
        if (!token) return;
        try {
            const data = await getMedicalReports(token);
            setReports(data);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setMessage(''); // Clear any previous errors
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setMessage('Please select a file first.');
            return;
        }

        setIsUploading(true);
        setMessage('');

        try {
            await uploadMedicalReport(token, selectedFile);
            setMessage('Report uploaded successfully!');
            setSelectedFile(null); // Clear the input
            document.getElementById('file-upload').value = ''; // Reset the HTML input
            fetchReports(); // Refresh the list to show the new file
        } catch (error) {
            console.error("Upload failed:", error);
            setMessage('Failed to upload. Make sure the file is under 10MB.');
        } finally {
            setIsUploading(false);
        }
    };
    const handleDownload = async (fileName, originalName) => {
        try {
            // We are now passing originalName to the API!
            await downloadReportSecurely(token, fileName, originalName); 
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download the file.");
        }
    };

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-radial-[at_20%_10%] from-indigo-100 via-white to-cyan-50" />
            <div className="absolute -z-10 -top-16 right-0 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />

            <div className="max-w-5xl mx-auto px-4 py-10">
                <section className="rounded-3xl border border-indigo-100 bg-linear-to-r from-indigo-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl shadow-indigo-400/20 mb-8">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
                         HEALTH RECORD CENTER
                    </p>
                    <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">My Medical Reports</h1>
                    <p className="mt-2 text-indigo-50 max-w-2xl">
                        Upload and store important medical reports securely. Access your records anytime from one place.
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5 sm:p-6 mb-8">
                    <div className="flex items-center gap-2 text-slate-700 mb-4">
                        <Upload size={18} className="text-indigo-600" />
                        <h2 className="font-bold text-lg">Upload New Report</h2>
                    </div>

                    <form onSubmit={handleUpload} className="flex flex-col md:flex-row md:items-center gap-4">
                        <input
                            type="file"
                            id="file-upload"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        <button
                            type="submit"
                            disabled={!selectedFile || isUploading}
                            className="inline-flex w-full md:w-auto items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:bg-slate-400"
                        >
                            {isUploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload className="mr-2" size={18} />}
                            {isUploading ? 'Uploading...' : 'Upload Report'}
                        </button>
                    </form>

                    {selectedFile && (
                        <p className="mt-3 text-sm text-slate-600">Selected: <span className="font-semibold">{selectedFile.name}</span></p>
                    )}

                    {message && (
                        <p className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${message.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {message}
                        </p>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-slate-800">Past Uploads</h3>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 inline-flex items-center gap-1">
                            <ShieldCheck size={14} className="text-emerald-600" /> Secure Access
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="animate-spin" size={18} /> Loading your reports...
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <FileText className="mx-auto text-slate-400 mb-3" size={28} />
                            <p className="text-slate-600 font-medium">No reports uploaded yet.</p>
                            <p className="text-sm text-slate-500 mt-1">Select a file above to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => (
                                <div key={report.id} className="rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-slate-800 break-all">{report.originalFileName}</p>
                                            <p className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1">
                                                <CalendarDays size={14} /> Uploaded: {new Date(report.uploadDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(report.storedFileName, report.originalFileName)}
                                            className="inline-flex items-center gap-2 rounded-lg bg-white border border-indigo-200 px-4 py-2 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
                                            title="Download Securely"
                                        >
                                            <Download size={16} /> Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MedicalReports;