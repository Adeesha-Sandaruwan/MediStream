import { Link } from 'react-router-dom';
import './HomePage.css';

const heroImage = 'https://ideogram.ai/assets/image/balanced/response/hHJt0LI4SWalDdQcM_xIUA@2k';

const galleryImages = [
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/fOI4iGCRSaecstSuHIBylA@2k',
        title: 'Telemedicine Connected Care',
        description: 'Secure virtual consultations that keep doctors and patients connected anywhere.'
    },
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/iUV-cUCbScK_2vbUu4PT9Q@2k',
        title: 'Collaborative Teamwork',
        description: 'Integrated care teams coordinate smoothly across appointments and follow-ups.'
    },
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/fMen_sriQPex5W3iICgeaQ@2k',
        title: 'Digital Health Journey',
        description: 'Patients navigate booking, diagnostics, and records in one cloud-native system.'
    },
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/5DkfxZFMSmuWK20BnI3_pA@2k',
        title: 'Smart Clinical Workflow',
        description: 'Clinicians handle appointments, reports, and recommendations with clarity.'
    },
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/AlyFjCg4RyaJjO9z-E4Sqw@2k',
        title: 'Patient-First Experience',
        description: 'A calm and intuitive interface built for confidence during care decisions.'
    },
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/bwAIotxgQHKe-0w1LSU-Ew@2k',
        title: 'Modern Healthcare Ops',
        description: 'Operational insights and communication channels stay synchronized in real time.'
    },
    {
        src: 'https://ideogram.ai/assets/image/balanced/response/iZ-1iGLhQ2W_YyV4VEtmvg@2k',
        title: 'AI-Powered Suggestions',
        description: 'Preliminary symptom insights guide patients before connecting with doctors.'
    }
];

const services = [
    {
        title: 'Doctor Channeling',
        text: 'Find specialists, check availability, and book appointments within minutes.'
    },
    {
        title: 'Video Consultations',
        text: 'Attend encrypted virtual appointments for convenient, high-quality care.'
    },
    {
        title: 'Medical Report Uploads',
        text: 'Store and share lab reports safely with doctors before and after consultations.'
    },
    {
        title: 'AI Symptom Checker',
        text: 'Get preliminary health suggestions to make better-informed next steps.'
    }
];

const valuePillars = [
    {
        title: 'Clinical Trust',
        text: 'Verified practitioner journeys, secure record handling, and role-based access create confidence in every interaction.'
    },
    {
        title: 'Connected Experience',
        text: 'Appointments, telemedicine, reports, notifications, and follow-up actions are unified in one patient-first flow.'
    },
    {
        title: 'Scalable Cloud Foundation',
        text: 'Microservice architecture and containerized deployment patterns support future growth with operational reliability.'
    }
];

const impactStats = [
    { value: '24/7', label: 'Digital Access for Patients' },
    { value: '8', label: 'Integrated Healthcare Services' },
    { value: '1', label: 'Unified Care Journey' }
];

export default function HomePage() {
    return (
        <div className="home-shell">
            <header className="home-header">
                <div className="home-brand">
                    <span className="pulse-dot" aria-hidden="true"></span>
                    <span className="brand-word">MediStream</span>
                </div>

                <nav className="home-nav" aria-label="Homepage sections">
                    <a href="#home">Home</a>
                    <a href="#about">About Us</a>
                    <a href="#services">Services</a>
                    <a href="#contact">Contact Us</a>
                    <Link to="/login">Log In</Link>
                    <Link to="/register">Register</Link>
                </nav>
            </header>

            <main>
                <section id="home" className="hero-zone">
                    <div className="hero-copy">
                        <p className="eyebrow">Cloud-Native Healthcare Platform</p>
                        <h1>
                            Compassionate digital care inspired by modern telemedicine ecosystems
                        </h1>
                        <p>
                            MediStream helps patients book doctor appointments, attend video consultations,
                            upload medical reports, and receive AI-based preliminary health suggestions.
                        </p>
                        <div className="hero-actions">
                            <Link to="/register" className="primary-btn">Get Started</Link>
                            <Link to="/login" className="ghost-btn">Sign In</Link>
                        </div>
                    </div>

                    <div className="hero-media">
                        <img src={heroImage} alt="Compassionate Connection" loading="eager" />
                    </div>
                </section>

                <section id="about" className="about-zone">
                    <div className="about-surface">
                        <div className="about-content">
                            <h2>About MediStream</h2>
                            <p>
                                MediStream is a cloud-native healthcare platform built to modernize the complete
                                care lifecycle. It enables patients to discover doctors, reserve appointments,
                                attend secure video consultations, and manage medical reports from one place.
                            </p>
                            <p>
                                For healthcare teams, MediStream streamlines clinical coordination through role-based
                                dashboards, real-time communication, and workflow continuity across services.
                                AI-assisted preliminary symptom suggestions help patients prepare before meeting
                                professionals, improving consultation quality and speed.
                            </p>
                        </div>

                        <div className="about-metrics">
                            {impactStats.map((item) => (
                                <article key={item.label} className="metric-card">
                                    <h3>{item.value}</h3>
                                    <p>{item.label}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="pillar-grid">
                        {valuePillars.map((pillar) => (
                            <article key={pillar.title} className="pillar-card">
                                <h3>{pillar.title}</h3>
                                <p>{pillar.text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="services" className="services-zone">
                    <h2>Core Services</h2>
                    <div className="service-grid">
                        {services.map((item) => (
                            <article key={item.title} className="service-card">
                                <h3>{item.title}</h3>
                                <p>{item.text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="gallery-zone" aria-label="Healthcare experience gallery">
                    <h2>Healthcare in Action</h2>
                    <p>Visual moments aligned with the MediStream care journey.</p>
                    <div className="gallery-grid">
                        {galleryImages.map((image) => (
                            <figure key={image.src} className="gallery-card">
                                <img src={image.src} alt={image.title} loading="lazy" />
                                <figcaption>
                                    <h3>{image.title}</h3>
                                    <p>{image.description}</p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </section>

                <section id="contact" className="contact-zone">
                    <h2>Contact Us</h2>
                    <p>Need assistance or want to learn more about MediStream?</p>
                    <div className="contact-panel">
                        <div>
                            <h3>Email</h3>
                            <p>support@medistream.health</p>
                        </div>
                        <div>
                            <h3>Phone</h3>
                            <p>+94 11 234 5678</p>
                        </div>
                        <div>
                            <h3>Availability</h3>
                            <p>24/7 for patient support and appointment help.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="home-footer">
                <div className="footer-grid">
                    <div className="footer-brand-block">
                        <div className="home-brand">
                            <span className="pulse-dot" aria-hidden="true"></span>
                            <span className="brand-word">MediStream</span>
                        </div>
                        <p>
                            A modern connected-care platform delivering secure channeling, telemedicine,
                            report workflows, and AI-assisted guidance.
                        </p>
                        <div className="footer-cta-row">
                            <Link to="/register" className="primary-btn">Create Account</Link>
                            <Link to="/login" className="ghost-btn">Member Login</Link>
                        </div>
                    </div>

                    <div className="footer-links">
                        <h3>Explore</h3>
                        <a href="#home">Home</a>
                        <a href="#about">About Us</a>
                        <a href="#services">Services</a>
                        <a href="#contact">Contact Us</a>
                    </div>

                    <div className="footer-links">
                        <h3>Platform</h3>
                        <p>Appointments & Channeling</p>
                        <p>Video Consultation</p>
                        <p>Medical Report Management</p>
                        <p>AI Symptom Suggestions</p>
                    </div>

                    <div className="footer-links">
                        <h3>Reach Us</h3>
                        <p>support@medistream.health</p>
                        <p>+94 11 234 5678</p>
                        <p>Colombo, Sri Lanka</p>
                        <p>Support available 24/7</p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>© 2026 MediStream. Built for connected healthcare delivery.</span>
                    <div className="footer-mini-links">
                        <a href="#about">Privacy</a>
                        <a href="#services">Terms</a>
                        <a href="#contact">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
