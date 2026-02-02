import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, CheckCircle, Clock, Trash2, ExternalLink, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Candidate {
    id: string;
    full_name: string;
    phone: string;
    role_type: string;
    status: string;
    type?: string;
    created_at: any;
    last_contact_date?: any;
    military_unit?: string;
    experience?: string;
    assigned_team?: string;
    referrer?: string;
    district?: string;
}

export function CandidatesList() {
    // ... existing state ...
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await fetch('/api/candidates');
            const data = await res.json();
            if (data.success) {
                setCandidates(data.candidates);
            }
        } catch (e) {
            console.error("Failed to fetch candidates");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckAvailability = async (id: string, phone: string, name: string) => {
        // 1. Open WhatsApp
        const message = `היי ${name}, מה שלומך? אני בודק זמינות לגבי מספר משרות חדשות שפתחנו ב-1solution jobs. האם אתה עדיין מחפש עבודה?`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');

        // 2. Update DB
        try {
            await fetch(`/api/candidates/${id}/check-availability`, { method: 'POST' });
            fetchCandidates();
        } catch (e) {
            console.error("Failed to update availability");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-right" dir="rtl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800">ניהול מועמדים ולידים</h2>
                <div className="flex gap-2">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {candidates.length} מועמדים
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-500 text-sm">
                        <tr>
                            <th className="p-4 font-medium">שם המועמד</th>
                            <th className="p-4 font-medium">תחום / ניסיון</th>
                            <th className="p-4 font-medium">מקור / צוות</th>
                            <th className="p-4 font-medium">סטטוס</th>
                            <th className="p-4 font-medium">קשר אחרון</th>
                            <th className="p-4 font-medium text-left">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {candidates.map((c) => (
                            <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={c.id}
                                className="hover:bg-slate-50/50 transition-colors"
                            >
                                <td className="p-4">
                                    <div className="font-semibold text-slate-800">{c.full_name}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                        <Phone size={12} />
                                        {c.phone}
                                    </div>
                                    {c.type === 'soldier' && (
                                        <span className="mt-1 inline-block text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                            חייל/ת משוחרר/ת
                                        </span>
                                    )}
                                    {c.type === 'veteran' && (
                                        <span className="mt-1 inline-block text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 mr-1">
                                            פורש/ת צה״ל
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="text-sm text-slate-600 font-medium">{c.role_type}</div>
                                    <div className="text-xs text-slate-400 truncate max-w-[150px]">{c.military_unit || c.experience || '-'}</div>
                                </td>
                                <td className="p-4">
                                    {c.assigned_team ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
                                                {c.assigned_team}
                                            </span>
                                            {c.referrer && <span className="text-[10px] text-slate-400">מאת: {c.referrer}</span>}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400">אורגני</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                                        }`}>
                                        {c.status === 'active' ? 'אקטיבי' : 'רדום'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock size={12} />
                                        {c.last_contact_date && c.last_contact_date._seconds
                                            ? new Date(c.last_contact_date._seconds * 1000).toLocaleDateString('he-IL')
                                            : 'מעולם לא'}
                                    </div>
                                </td>
                                <td className="p-4 text-left">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleCheckAvailability(c.id, c.phone, c.full_name)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                                            title="בדוק זמינות בוואטסאפ"
                                        >
                                            <MessageCircle size={16} />
                                            בדיקת זמינות
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                {candidates.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        אין כרגע מועמדים במערכת.
                    </div>
                )}
            </div>
        </div>
    );
}
