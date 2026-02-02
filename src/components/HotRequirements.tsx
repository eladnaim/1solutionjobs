import React, { useState } from 'react';
import { Search, Plus, MapPin, Briefcase, Building, Save, UserCheck, Phone } from 'lucide-react';

interface Requirement {
    id?: string;
    company: string;
    role: string;
    location: string;
    description: string;
}

interface Candidate {
    id: string;
    name: string;
    title: string;
    location: string;
    matchScore: number;
    matchReason: string;
}

export function HotRequirements() {
    const [activeReq, setActiveReq] = useState<Requirement | null>(null);
    const [results, setResults] = useState<Candidate[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Requirement>({
        company: '',
        role: '',
        location: '',
        description: ''
    });

    const handleSearch = async () => {
        setIsSearching(true);
        setResults([]);
        try {
            const res = await fetch('/api/requirements/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setResults(data.matches);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Input Form */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Plus size={20} /></div>
                        הגדרת דרישה חדשה
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">שם החברה (דיסקרטי)</label>
                            <div className="relative">
                                <Building size={18} className="absolute top-3 right-3 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                                    placeholder="שם הלקוח..."
                                    value={formData.company}
                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד מבוקש</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute top-3 right-3 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                                    placeholder="לדוגמה: מפתח פול סטאק..."
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">מיקום</label>
                            <div className="relative">
                                <MapPin size={18} className="absolute top-3 right-3 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                                    placeholder="אזור המרכז, היברידי..."
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">דרישות נוספות (לקוח)</label>
                            <textarea
                                className="w-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 h-32 resize-none"
                                placeholder="שפות תכנות, ניסיון ניהולי, השכלה..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>

                        <button
                            onClick={handleSearch}
                            disabled={!formData.role || isSearching}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 text-white ${!formData.role ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                        >
                            {isSearching ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Search size={20} />}
                            {isSearching ? 'סורק מועמדים...' : 'שמור וחפש התאמות'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <UserCheck className="text-emerald-500" />
                    מועמדים בולטים שנמצאו ({results.length})
                </h3>

                {results.length === 0 && !isSearching ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                        <Search size={48} className="mx-auto mb-4 text-slate-200" />
                        <p>הגדר דרישה ובצע חיפוש כדי לראות תוצאות.</p>
                        <p className="text-sm mt-1">המנוע יסרוק את כל המאגר הקיים.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {results.map(candidate => (
                            <div key={candidate.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-300 transition-colors group">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${candidate.matchScore > 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                        {candidate.matchScore}%
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800">{candidate.name}</h4>
                                        <div className="text-sm text-slate-500 flex items-center gap-2">
                                            <span>{candidate.title}</span>
                                            <span>•</span>
                                            <span>{candidate.location}</span>
                                        </div>
                                        <div className="mt-2 text-xs bg-slate-50 px-3 py-1.5 rounded-lg inline-block text-slate-600 border border-slate-100">
                                            <span className="font-semibold">סיבת התאמה:</span> {candidate.matchReason}
                                        </div>
                                    </div>
                                </div>

                                <button className="p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <Phone size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
