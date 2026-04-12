import { useMemo, useState } from 'react';
import { AlertTriangle, Bot, HeartPulse, LoaderCircle, ShieldAlert, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyzeSymptoms } from '../api/symptomCheckerApi';

const INITIAL_FORM = {
  symptoms: '',
  age: '',
  gender: '',
  medicalHistory: '',
};

export default function PatientSymptomChecker() {
  const { token } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const urgencyColor = useMemo(() => {
    if (!result?.urgencyLevel) return 'bg-slate-100 text-slate-700';
    if (result.urgencyLevel === 'HIGH') return 'bg-rose-100 text-rose-700';
    if (result.urgencyLevel === 'MODERATE') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }, [result]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.symptoms.trim()) {
      setError('Please describe your symptoms first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        symptoms: form.symptoms.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender.trim() || null,
        medicalHistory: form.medicalHistory.trim() || null,
      };

      const data = await analyzeSymptoms(token, payload);
      setResult(data);
    } catch (submitError) {
      setResult(null);
      setError(submitError.message || 'Unable to analyze symptoms right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-linear-to-b from-blue-50 via-white to-indigo-50">
      <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="absolute top-32 -right-20 h-72 w-72 rounded-full bg-indigo-300/15 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="animate-[fadeIn_0.5s_ease-out] rounded-3xl border border-indigo-200 bg-linear-to-r from-blue-700 via-indigo-700 to-cyan-700 p-6 text-white shadow-xl shadow-indigo-500/25 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={14} /> AI Symptom Checker
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Describe Symptoms, Get Early Guidance</h1>
              <p className="mt-2 max-w-2xl text-indigo-50 opacity-95">
                This tool gives preliminary suggestions and recommended specialties for faster next steps, not a confirmed diagnosis.
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-medium">
              <p className="inline-flex items-center gap-2"><ShieldAlert size={16} /> For guidance only, seek urgent care when needed</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { title: 'Step 1', text: 'Enter your current symptoms clearly.', icon: HeartPulse },
            { title: 'Step 2', text: 'Add optional context for better relevance.', icon: Bot },
            { title: 'Step 3', text: 'Review urgency and specialist suggestions.', icon: Stethoscope },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                style={{ animation: `fadeIn 0.5s ease-out ${index * 120}ms both` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{step.title}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Icon size={16} className="text-blue-600" /> {step.text}
                </p>
              </article>
            );
          })}
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Tell us what you feel</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="symptoms" className="mb-1 block text-sm font-semibold text-slate-700">Symptoms *</label>
                <textarea
                  id="symptoms"
                  name="symptoms"
                  value={form.symptoms}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Example: Fever for 2 days, sore throat, dry cough and mild chest discomfort"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  maxLength={2000}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="age" className="mb-1 block text-sm font-semibold text-slate-700">Age (optional)</label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    max="130"
                    value={form.age}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="mb-1 block text-sm font-semibold text-slate-700">Gender (optional)</label>
                  <input
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    maxLength={32}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="medicalHistory" className="mb-1 block text-sm font-semibold text-slate-700">Medical history (optional)</label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  value={form.medicalHistory}
                  onChange={handleChange}
                  rows={3}
                  maxLength={2000}
                  placeholder="Example: Asthma, diabetes, currently taking blood pressure medication"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                <AlertTriangle size={16} /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Analyzing Symptoms...' : 'Analyze Symptoms'}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Preliminary Insights</h2>

            {!result && !loading && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Submit your symptoms to see urgency level, suggestions, and recommended specialties.
              </div>
            )}

            {loading && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
                <LoaderCircle className="animate-spin" size={18} /> AI is preparing your preliminary guidance...
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Urgency</p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${urgencyColor}`}>
                    {result.urgencyLevel}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested next actions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {(result.preliminarySuggestions || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended specialties</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(result.recommendedDoctorSpecialties || []).map((specialty) => (
                      <span key={specialty} className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
                  {result.disclaimer}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
