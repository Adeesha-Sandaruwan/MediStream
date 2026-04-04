import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ClipboardCheck,
  Stethoscope,
  UserRound,
  Video,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DoctorDashboard() {
  const { verificationStatus } = useAuth();
  const isApproved = verificationStatus === 'APPROVED';

  const features = [
    {
      title: 'Doctor Profile',
      description: 'Manage your credentials, specialties, consultation details, and public profile information.',
      to: '/doctor-profile',
      action: 'Manage Profile',
      icon: UserRound,
      iconClasses: 'bg-blue-100 text-blue-700',
      buttonClasses: 'bg-blue-600 hover:bg-blue-700',
      locked: false,
      cardAccent: 'border-blue-200 ring-1 ring-blue-100',
    },
    {
      title: 'Availability',
      description: 'Publish clinic slots and keep your weekly consultation schedule up to date.',
      to: '/doctor-availability',
      action: 'Manage Availability',
      icon: CalendarClock,
      iconClasses: 'bg-indigo-100 text-indigo-700',
      buttonClasses: 'bg-indigo-600 hover:bg-indigo-700',
      locked: !isApproved,
      cardAccent: 'border-indigo-200',
    },
    {
      title: 'Appointments',
      description: 'Accept or reject patient requests quickly and maintain an efficient booking flow.',
      to: '/doctor-appointments',
      action: 'Review Requests',
      icon: ClipboardCheck,
      iconClasses: 'bg-amber-100 text-amber-700',
      buttonClasses: 'bg-amber-600 hover:bg-amber-700',
      locked: !isApproved,
      cardAccent: 'border-amber-200',
    },
    {
      title: 'Prescriptions',
      description: 'Issue digital prescriptions with diagnosis, medications, advice, and follow-up notes.',
      to: '/doctor-prescriptions',
      action: 'Issue Prescriptions',
      icon: Stethoscope,
      iconClasses: 'bg-violet-100 text-violet-700',
      buttonClasses: 'bg-violet-600 hover:bg-violet-700',
      locked: !isApproved,
      cardAccent: 'border-violet-200',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 text-white p-6 sm:p-8 shadow-lg overflow-hidden relative">
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-10 left-10 w-36 h-36 rounded-full bg-cyan-200/20 blur-2xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles size={14} />
            Clinical Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-4">Doctor Management Service</h1>
          <p className="text-blue-100 mt-3 max-w-2xl">
            Manage your profile, availability, appointment decisions, telemedicine consultations, and digital prescriptions from one place.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">Profile Management</span>
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">Schedule Control</span>
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">Prescription Workflow</span>
          </div>
        </div>
      </div>

      {!isApproved ? (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm flex items-start">
          <AlertCircle className="text-amber-600 mt-1 mr-4 shrink-0" size={28} />
          <div>
            <h3 className="text-lg font-bold text-amber-800">Account Pending Verification</h3>
            <p className="text-amber-700 mt-1">
              Your account is currently under administrative review. Complete your profile with accurate license and qualification details to speed up approval.
            </p>
            <p className="text-amber-700 font-bold mt-2">Clinical tools will unlock after verification.</p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center">
            <CheckCircle2 className="text-emerald-600 mr-3 shrink-0" size={24} />
            <p className="text-emerald-800 font-bold">Your physician account is verified and fully active.</p>
          </div>
          <div className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            <BadgeCheck size={14} />
            Verified
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`bg-white rounded-2xl shadow-sm p-6 border transition-all duration-300 ${item.locked ? 'opacity-60 grayscale cursor-not-allowed border-gray-200' : `hover:shadow-xl ${item.cardAccent}`}`}
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-xl ${item.iconClasses}`}>
                  <Icon size={22} />
                </div>
                <h2 className="ml-3 text-lg font-bold text-gray-800">{item.title}</h2>
              </div>
              <p className="text-gray-600 mb-6 min-h-16 text-sm leading-relaxed">{item.description}</p>

              {item.locked ? (
                <button disabled className="block w-full text-center bg-gray-300 text-gray-500 font-semibold py-2.5 px-4 rounded-xl cursor-not-allowed">
                  Locked
                </button>
              ) : (
                <Link
                  to={item.to}
                  className={`block w-full text-center text-white font-semibold py-2.5 px-4 rounded-xl transition-colors ${item.buttonClasses}`}
                >
                  {item.action}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className={`rounded-2xl shadow-md p-6 border transition-all duration-300 ${!isApproved ? 'bg-gray-100 border-gray-300 opacity-70 grayscale cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500 text-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${!isApproved ? 'bg-gray-300 text-gray-500' : 'bg-white/20 text-white'}`}>
              <Video size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${!isApproved ? 'text-gray-800' : 'text-white'}`}>Telemedicine Sessions</h2>
              <p className={`${!isApproved ? 'text-gray-600' : 'text-emerald-50'} mt-1 text-sm`}>
                Conduct secure video consultations and continue patient care remotely.
              </p>
            </div>
          </div>

          {isApproved ? (
            <Link to="/telemedicine" className="block w-full md:w-auto text-center bg-white text-teal-700 hover:bg-emerald-50 font-bold py-2.5 px-6 rounded-xl transition-colors">
              Open Telemedicine
            </Link>
          ) : (
            <button disabled className="block w-full md:w-auto text-center bg-gray-300 text-gray-500 font-bold py-2.5 px-6 rounded-xl cursor-not-allowed">
              Locked
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
