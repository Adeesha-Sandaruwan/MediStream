import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardCheck, Stethoscope, UserRound, Video } from 'lucide-react';

export default function DoctorDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Dashboard</h1>
        <p className="text-gray-600">Navigate quickly to all doctor tools and workflows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
              <UserRound size={24} />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-800">Doctor Profile</h2>
          </div>
          <p className="text-gray-600 mb-6 h-12">Manage your professional details, specialty, and consultation information.</p>
          <Link
            to="/doctor-profile"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Manage Profile
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
              <CalendarClock size={24} />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-800">Availability</h2>
          </div>
          <p className="text-gray-600 mb-6 h-12">Create and maintain your clinic schedule and available consultation slots.</p>
          <Link
            to="/doctor-availability"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Manage Availability
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
              <ClipboardCheck size={24} />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-800">Appointments</h2>
          </div>
          <p className="text-gray-600 mb-6 h-12">Review patient requests and approve or reject appointments confidently.</p>
          <Link
            to="/doctor-appointments"
            className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Review Appointments
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-violet-100 text-violet-700 rounded-lg">
              <Stethoscope size={24} />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-800">Prescriptions</h2>
          </div>
          <p className="text-gray-600 mb-6 h-12">Issue digital prescriptions and track clinical advice for follow-up care.</p>
          <Link
            to="/doctor-prescriptions"
            className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Manage Prescriptions
          </Link>
        </div>

        <div className="md:col-span-2 xl:col-span-2 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-md p-6 border border-emerald-500 text-white">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-white/20 text-white rounded-lg">
              <Video size={24} />
            </div>
            <h2 className="ml-4 text-xl font-semibold">Telemedicine</h2>
          </div>
          <p className="text-emerald-50 mb-6 h-12">Launch secure live consultations and continue care through video sessions.</p>
          <Link
            to="/telemedicine"
            className="block w-full sm:w-auto text-center bg-white text-teal-700 hover:bg-emerald-50 font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Open Telemedicine
          </Link>
        </div>
      </div>
    </div>
  );
}
