import React, { useEffect, useState } from 'react';
import { Share2, MapPin, CheckCircle, ArrowLeft, Building } from 'lucide-react';

interface LandingPageProps {
    jobId: string;
}

export function LandingPage({ jobId }: LandingPageProps) {
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/j/${jobId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setJob(data.job);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [jobId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                משרה לא נמצאה או הוסרה.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white" dir="rtl">
            {/* Hero Section */}
            <div className="relative h-64 md:h-80 bg-indigo-900 overflow-hidden">
                <img
                    src={job.image_url}
                    alt="Office"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 to-transparent"></div>

                <div className="relative h-full container mx-auto px-6 flex flex-col justify-end pb-8 text-white">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm w-fit mb-4">
                        <Building size={14} />
                        <span>1solution jobs Exclusive</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-2">{job.title}</h1>
                    <div className="flex items-center gap-4 text-indigo-100 text-lg">
                        <span className="flex items-center gap-1"><MapPin size={18} /> {job.location}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-8">
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 border-r-4 border-indigo-500 pr-3">תיאור המשרה</h3>
                            <div className="prose prose-lg text-gray-600 leading-relaxed whitespace-pre-line">
                                {job.description}
                            </div>
                        </section>

                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                            <h4 className="font-bold text-indigo-900 mb-2">למה כדאי להגיש מועמדות דרכנו?</h4>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2">
                                    <CheckCircle size={20} className="text-indigo-600 mt-0.5" />
                                    <span className="text-indigo-800">טיפול אישי ומהיר (תוך 24 שעות)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle size={20} className="text-indigo-600 mt-0.5" />
                                    <span className="text-indigo-800">הכנה לראיון על ידי מומחים</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle size={20} className="text-indigo-600 mt-0.5" />
                                    <span className="text-indigo-800">גישה למשרות שלא מתפרסמות בחוץ</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Sticky Sidebar Action */}
                    <div className="relative">
                        <div className="sticky top-10 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
                            <div className="text-center mb-6">
                                <span className="text-gray-500 text-sm">פורסם על ידי</span>
                                <div className="font-bold text-xl text-gray-900">1solution jobs</div>
                            </div>

                            <a
                                href={`/api/j/${jobId}/apply`}
                                className="block w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 mb-3"
                            >
                                בדוק התאמה עכשיו
                            </a>

                            <button className="flex items-center justify-center gap-2 w-full py-3 bg-gray-50 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors">
                                <Share2 size={18} />
                                שתף משרה לחבר
                            </button>

                            <p className="text-xs text-center text-gray-400 mt-4">
                                בלחיצה אתה מסכים לתנאי השימוש. אין צורך להירשם לאתר.
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            <footer className="border-t border-gray-100 mt-12 py-8 bg-gray-50">
                <div className="container mx-auto px-6 text-center text-gray-400 text-sm">
                    &copy; 2024 1solution jobs Agencies. כל הזכויות שמורות.
                </div>
            </footer>
        </div>
    );
}
