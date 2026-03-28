import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMedicalReports, uploadMedicalReport, downloadReportSecurely } from '../api/patientApi';
import { FileText, Upload, Download, Loader2 } from 'lucide-react';

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
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md mt-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="mr-3 text-indigo-600" /> My Medical Reports
            </h2>

            {/* Upload Section */}
            <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 mb-8">
                <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-4">
                    <input 
                        type="file" 
                        id="file-upload"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <button 
                        type="submit" 
                        disabled={!selectedFile || isUploading}
                        className="w-full sm:w-auto flex items-center justify-center px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                    >
                        {isUploading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Upload className="mr-2" size={20} />}
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </form>
                {message && (
                    <p className={`mt-4 text-sm font-medium ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* List Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Past Uploads</h3>
                {isLoading ? (
                    <p className="text-gray-500">Loading your reports...</p>
                ) : reports.length === 0 ? (
                    <p className="text-gray-500 italic">No reports uploaded yet. Select a file above to get started.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {reports.map((report) => (
                            <li key={report.id} className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">{report.originalFileName}</span>
                                    <span className="text-xs text-gray-500">
                                        Uploaded: {new Date(report.uploadDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleDownload(report.storedFileName, report.originalFileName)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors flex items-center"
                                    title="Download Securely"
                                >
                                    <Download size={20} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MedicalReports;