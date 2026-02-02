import React, { useState } from 'react';
import { Shield, Send, CheckCircle, Briefcase, Award, Link as LinkIcon, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export function VeteransFunnel() {
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        role_type: '',
        expected_salary: '',
        experience: '',
        military_background: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [waUrl, setWaUrl] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Capture tracking from URL
        const params = new URLSearchParams(window.location.search);
        const referrer = params.get('ref') || params.get('team') || 'organic';
        const isRonitRef = referrer === 'ronit' || referrer === '1solution_tzevet' || window.location.search.includes('1solution');

        try {
            const res = await fetch('/api/candidates/veterans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    source: 'veterans_funnel',
                    referrer: referrer,
                    assigned_team: isRonitRef ? '1solution & צוות מחוז דרום' : 'כללי',
                    district: isRonitRef ? 'south' : 'general'
                })
            });
            const data = await res.json();
            if (res.ok) {
                setWaUrl(data.whatsappUrl);
                setIsSuccess(true);
            } else {
                alert('חלה שגיאה בשליחת הטופס. אנא נסה שוב.');
            }
        } catch (e) {
            alert('שגיאת תקשורת.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6 text-right" dir="rtl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl rounded-3xl p-10 text-center border border-emerald-500/30 shadow-2xl"
                >
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} className="text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">תודה על פנייתך!</h2>
                    <p className="text-slate-300 mb-8 leading-relaxed">
                        הפרטים שלך נקלטו במערכת 1solution jobs. הצוות שלנו יסרוק את המשרות המתאימות ביותר עבורך ויחזור אליך בהקדם.
                    </p>

                    <div className="space-y-4">
                        <a
                            href={waUrl}
                            className="flex items-center justify-center gap-3 w-full py-5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-black transition-all shadow-xl shadow-emerald-900/40 transform hover:scale-[1.02]"
                        >
                            <span className="text-lg">המשך לשיחה בוואטסאפ</span>
                        </a>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-2xl font-bold transition-all"
                        >
                            חזרה לדף הבית
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-right flex flex-col" dir="rtl">
            {/* Header */}
            <header className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                        <Award className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">1solution jobs</h1>
                        <p className="text-xs text-blue-400 font-medium tracking-widest uppercase">Veteran Match</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 bg-slate-800/80 rounded-full text-xs font-semibold text-slate-300 border border-slate-700">
                        מסלול פורשים (מערכת אלפא)
                    </div>
                    <button
                        onClick={() => {
                            const url = window.location.href;
                            navigator.clipboard.writeText(url);
                            alert('הקישור הועתק! שתף עם חיילים משוחררים');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-lg"
                        title="שתף דף זה"
                    >
                        <LinkIcon size={16} />
                        <span className="text-sm font-medium">שתף</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="max-w-2xl w-full">
                    {(window.location.search.includes('ref=ronit') || window.location.search.includes('1solution')) && (
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="mb-8 p-6 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-start gap-5 text-white shadow-2xl backdrop-blur-md"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-white/20">ר</div>
                            <div>
                                <p className="font-bold text-xl mb-1">שלום, אני רונית מארגון "צוות" מחוז דרום</p>
                                <p className="text-blue-100 text-sm leading-relaxed">
                                    אני שמחה לבשר על שיתוף פעולה עם פלטפורמת <span className="font-bold text-white">1solution & Tzevet</span> כדי למצוא עבורכם את המשרות החמות ביותר בשוק האזרחי.
                                    <br />
                                    מאחלת לכם המון בהצלחה בהמשך המסע האזרחי!
                                </p>
                            </div>
                        </motion.div>
                    )}

                    <div className="mb-10 text-center">
                        <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
                            הקריירה האזרחית שלך מתחילה כאן
                        </h2>
                        <p className="text-lg text-slate-300">
                            אנחנו מתמחים בחיבור בין הניסיון הצבאי שלך להזדמנויות המובילות בשוק האזרחי.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 pr-1">שם מלא</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="ישראל ישראלי"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 pr-1">טלפון נייד</label>
                                <input
                                    required
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="050-1234567"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 pr-1 flex items-center gap-2">
                                    <Briefcase size={14} />
                                    תחום עיסוק מבוקש
                                </label>
                                <select
                                    required
                                    value={formData.role_type}
                                    onChange={e => setFormData({ ...formData, role_type: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="" disabled>בחר תחום...</option>
                                    <option value="tech">טכנולוגיה / סייבר</option>
                                    <option value="ops">תפעול / לוגיסטיקה</option>
                                    <option value="security">אבטחה / ניהול הגנה</option>
                                    <option value="management">ניהול / הנהלה</option>
                                    <option value="sales">מכירות / שירות</option>
                                    <option value="other">אחר</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 pr-1">שנות ניסיון</label>
                                <input
                                    type="text"
                                    value={formData.experience}
                                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                    placeholder="לדוג': 5 שנים"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 pr-1">רקע צבאי ותפקידים</label>
                            <textarea
                                value={formData.military_background}
                                onChange={e => setFormData({ ...formData, military_background: e.target.value })}
                                rows={3}
                                placeholder="לדוג': קצין בחיל האוויר, ניהול צוותים, ניסיון בתפעול..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                            ></textarea>
                        </div>

                        {/* CV Upload Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 pr-1 flex items-center gap-2">
                                <Upload size={14} className="text-blue-400" />
                                העלאת קורות חיים (חובה לבניית פרופיל)
                            </label>
                            <div className="relative group">
                                <input
                                    required
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setFormData({ ...formData, notes: `קובץ קו"ח: ${file.name}` });
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full bg-slate-900 border-2 border-dashed border-slate-700 group-hover:border-blue-500/50 rounded-xl px-4 py-6 text-center transition-all flex flex-col items-center gap-2">
                                    <Upload size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                    <span className="text-slate-400 text-sm group-hover:text-slate-300">
                                        {formData.notes.includes('קובץ קו"ח:') ? formData.notes.split(': ')[1] : 'לחץ להעלאת קובץ (PDF, Word)'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 text-lg"
                            >
                                {isSubmitting ? 'שולח...' : (
                                    <>
                                        המשיכו למציאת המשרה
                                        <Send size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-blue-500" />
                            סודיות מוחלטת
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-blue-500" />
                            חיבור ישיר למגייסים
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-blue-500" />
                            ליווי אישי
                        </div>
                    </div>
                </div>
            </main>

            <footer className="p-8 text-center text-slate-600 text-xs border-t border-slate-800">
                © {new Date().getFullYear()} 1solution jobs System Labs. כל הזכויות שמורות.
            </footer>
        </div>
    );
}
