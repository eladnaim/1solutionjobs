import React, { useEffect, useState } from 'react';
import { Send, CheckCircle, Clock, AlertTriangle, Facebook, Send as TelegramIcon, User } from 'lucide-react';

interface PublishRequest {
    id: string;
    job_title: string;
    job_company: string;
    content: string;
    status: 'pending_approval' | 'published' | 'failed';
    created_at: any;
    platforms: string[];
    results?: any;
}

export function PublicationsList() {
    const [requests, setRequests] = useState<PublishRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/publish-requests');
            const data = await res.json();
            if (data.success) setRequests(data.requests);
        } catch (e) {
            console.error("Failed to load publications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/publish-requests/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approvedBy: 'Recruiter' })
            });
            const data = await res.json();
            if (data.success) {
                alert('הפרסום בוצע בהצלחה! 🚀');
                fetchRequests();
            } else {
                alert('שגיאה בפרסום: ' + data.message);
            }
        } catch (e) {
            alert('שגיאת תקשורת בפרסום.');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">טוען בקשות פרסום...</div>;

    const pending = requests.filter(r => r.status === 'pending_approval');
    const history = requests.filter(r => r.status !== 'pending_approval');

    return (
        <div className="space-y-6">
            {/* Pending Approvals */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                            <Clock className="text-blue-600" size={24} />
                            ממתין לאישור הפצה ({pending.length})
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">פוסטים שנוצרו על ידי ה-AI ומחכים לאוקיי שלך</p>
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {pending.map(req => (
                        <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-lg text-slate-900">{req.job_title}</h4>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{req.job_company}</span>
                                    </div>
                                    <div className="bg-slate-100/50 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-line border border-slate-200/50 leading-relaxed font-mono">
                                        {req.content}
                                    </div>
                                    <div className="flex gap-2">
                                        {req.platforms.map(p => (
                                            <span key={p} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
                                                {p === 'facebook' ? <Facebook size={12} className="text-blue-600" /> : <TelegramIcon size={12} className="text-sky-500" />}
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 min-w-[140px]">
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        disabled={processing === req.id}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {processing === req.id ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Send size={18} />}
                                        אשר והפץ
                                    </button>
                                    <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-xl text-sm font-medium transition-all">
                                        ביטול בקשה
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pending.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            אין בקשות פרסום הממתינות לאישור.
                        </div>
                    )}
                </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">היסטוריית פרסומים</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-4 font-medium">משרה</th>
                                <th className="p-4 font-medium">סטטוס</th>
                                <th className="p-4 font-medium">תאריך</th>
                                <th className="p-4 font-medium">ערוצים</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 group">
                                    <td className="p-4 font-medium text-slate-700">
                                        {req.job_title}
                                        <div className="text-[10px] text-slate-400 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            ID: {req.id}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${req.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {req.status === 'published' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                                {req.status === 'published' ? 'פורסם' : 'נכשל'}
                                            </span>
                                            {/* Detailed Breakdown */}
                                            {req.results && (
                                                <div className="text-[10px] space-y-1 mt-1">
                                                    {req.results.facebook_page && (
                                                        <div className={`flex items-center gap-1 ${req.results.facebook_page.success ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            <Facebook size={10} />
                                                            Page: {req.results.facebook_page.success ? 'OK' : 'Fail'}
                                                        </div>
                                                    )}
                                                    {req.results.facebook_groups && (
                                                        <div className={`flex items-center gap-1 ${req.results.facebook_groups.success ? 'text-emerald-600' : 'text-orange-500'}`}>
                                                            <Facebook size={10} />
                                                            Groups: {req.results.facebook_groups.count || 0}
                                                        </div>
                                                    )}
                                                    {req.results.telegram && (
                                                        <div className={`flex items-center gap-1 ${req.results.telegram.success ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            <TelegramIcon size={10} />
                                                            TG: {req.results.telegram.success ? 'OK' : req.results.telegram.error || 'Fail'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-400 text-xs">
                                        {req.created_at?.seconds ? new Date(req.created_at.seconds * 1000).toLocaleString('he-IL') : 'היום'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1">
                                            {req.platforms.map(p => (
                                                <div key={p} title={p} className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                                    {p === 'facebook' ? <Facebook size={14} /> : <TelegramIcon size={14} />}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
