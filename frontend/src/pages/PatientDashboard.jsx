import React from 'react';
import { Link } from 'react-router-dom';
import {
    User,
    FileText,
    Calendar,
    Video,
    Pill,
    UserRound,
    ChevronRight,
    Sparkles,
    Activity,
    ShieldCheck,
} from 'lucide-react';

const PatientDashboard = () => {
    const cards = [
        {
            title: 'Medical Profile',
            description: 'Update your personal details, blood group, allergies, and emergency contacts.',
            action: 'Manage Profile',
            to: '/profile',
            icon: User,
            iconWrap: 'bg-sky-100 text-sky-700',
            button: 'bg-sky-600 hover:bg-sky-700',
        },
        {
            title: 'Find a Specialist',
            description: 'Browse verified medical professionals and specialists based on your needs.',
            action: 'Browse Directory',
            to: '/patient-doctors',
            icon: UserRound,
            iconWrap: 'bg-cyan-100 text-cyan-700',
            button: 'bg-cyan-600 hover:bg-cyan-700',
        },
        {
            title: 'Medical Reports',
            description: 'Upload and manage your lab reports and medical documents securely.',
            action: 'View Reports',
            to: '/reports',
            icon: FileText,
            iconWrap: 'bg-indigo-100 text-indigo-700',
            button: 'bg-indigo-600 hover:bg-indigo-700',
        },
        {
            title: 'Digital Prescriptions',
            description: 'View and download your digital prescriptions issued by your doctors.',
            action: 'View Prescriptions',
            to: '/patient-prescriptions',
            icon: Pill,
            iconWrap: 'bg-amber-100 text-amber-700',
            button: 'bg-amber-600 hover:bg-amber-700',
        },
        {
            title: 'Appointments',
            description: 'Check booked appointments and quickly continue pending payment actions.',
            action: 'View Appointments',
            to: '/patient-appointments',
            icon: Calendar,
            iconWrap: 'bg-emerald-100 text-emerald-700',
            button: 'bg-emerald-600 hover:bg-emerald-700',
        },
        {
            title: 'Telemedicine',
            description: 'Join secure live video consultations with your doctor from anywhere.',
            action: 'Open Telemedicine',
            to: '/telemedicine',
            icon: Video,
            iconWrap: 'bg-teal-100 text-teal-700',
            button: 'bg-teal-600 hover:bg-teal-700',
        },
    ];

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-radial-[at_10%_20%] from-cyan-100 via-white to-emerald-50" />
            <div className="absolute -z-10 -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
            <div className="absolute -z-10 top-40 -left-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                <section className="mb-8 rounded-3xl border border-cyan-100 bg-linear-to-r from-cyan-600 to-emerald-600 p-6 sm:p-8 text-white shadow-xl shadow-cyan-500/20">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
                                PATIENT PORTAL
                            </p>
                            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Your Health, Organized in One Place</h1>
                            <p className="mt-3 max-w-2xl text-cyan-50">
                                Manage visits, prescriptions, telemedicine, and medical records with a faster and cleaner experience.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
                            <div className="rounded-xl border border-white/20 bg-white/15 p-4">
                                <p className="text-xs text-cyan-100">Appointments</p>
                                <p className="mt-1 text-xl font-bold">Track Status</p>
                            </div>
                            <div className="rounded-xl border border-white/20 bg-white/15 p-4">
                                <p className="text-xs text-cyan-100">Telemedicine</p>
                                <p className="mt-1 text-xl font-bold">Instant Access</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Care Journey</p>
                        <p className="mt-2 text-xl font-bold text-slate-800 inline-flex items-center gap-2">
                            <Activity size={18} className="text-cyan-600" /> Active Monitoring
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Records</p>
                        <p className="mt-2 text-xl font-bold text-slate-800 inline-flex items-center gap-2">
                            <FileText size={18} className="text-indigo-600" /> Digitally Managed
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Security</p>
                        <p className="mt-2 text-xl font-bold text-slate-800 inline-flex items-center gap-2">
                            <ShieldCheck size={18} className="text-emerald-600" /> Protected Access
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {cards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <article
                                    key={card.title}
                                    className="group rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className={`p-3 rounded-xl ${card.iconWrap}`}>
                                            <Icon size={22} />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Module</span>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
                                    <p className="mt-2 text-slate-600 min-h-12">{card.description}</p>

                                    <Link
                                        to={card.to}
                                        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${card.button}`}
                                    >
                                        {card.action}
                                        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PatientDashboard;