import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Briefcase, Settings, Link as LinkIcon, Download, CheckCircle, AlertCircle, Play, Sparkles, Facebook, Linkedin, Send, Globe, Award } from 'lucide-react';
import { JobsList } from './JobsList';
import { HotRequirements } from './HotRequirements';
import { CandidatesList } from './CandidatesList';
import { Settings as SettingsComponent } from './Settings';
import { PublicationsList } from './PublicationsList';

interface DashboardProps {
    isConnected: boolean;
    isFacebookConnected?: boolean;
    facebookPageName?: string;
    facebookPageId?: string;
    isLinkedInConnected?: boolean;
    isInstagramConnected?: boolean;
    isTelegramConnected?: boolean;
    onConnect: () => void;
    onConnectFacebook?: () => void;
    onPull: (fullSweep?: boolean) => void;
    isPulling: boolean;
}

export function Dashboard({
    isConnected,
    isFacebookConnected,
    facebookPageName,
    facebookPageId,
    isLinkedInConnected,
    isInstagramConnected,
    isTelegramConnected,
    onConnect,
    onConnectFacebook,
    onPull,
    isPulling
}: DashboardProps) {
    const [stats, setStats] = useState({ activeJobs: 0, candidates: 0, viralPosts: 0, conversionRate: "0%", fullDataJobs: 0, pendingPublications: 0 });
    const [activeView, setActiveView] = useState<'overview' | 'jobs' | 'candidates' | 'hot-req' | 'publications' | 'settings'>('overview');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                if (data.success) {
                    setStats(data.stats);
                }
            } catch (e) {
                console.error("Failed to load stats");
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, [isPulling]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Sidebar / Navigation */}
            <aside className="fixed right-0 top-0 h-full w-64 bg-slate-900 text-white shadow-xl z-20 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-800 flex flex-col items-center">
                    <div className="bg-white p-2 rounded-xl mb-2">
                        <img src="/logo.png" alt="1solution jobs Logo" className="h-10 w-auto object-contain" />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">Intelligent HR</p>
                    <div className="mt-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Alpha Version 1.0</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setActiveView('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <LayoutDashboard size={20} />
                        <span>לוח בקרה</span>
                    </button>
                    <button onClick={() => setActiveView('jobs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'jobs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Briefcase size={20} />
                        <span>משרות</span>
                    </button>
                    <button onClick={() => setActiveView('candidates')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'candidates' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Users size={20} />
                        <span>מועמדים</span>
                    </button>
                    <button onClick={() => setActiveView('hot-req')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'hot-req' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Play size={20} />
                        <span>דרישות חמות</span>
                    </button>
                    <button onClick={() => setActiveView('publications')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeView === 'publications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <div className="flex items-center gap-3">
                            <Send size={20} />
                            <span>פרסומים (אישור)</span>
                        </div>
                        {stats.pendingPublications > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                {stats.pendingPublications}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setActiveView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Settings size={20} />
                        <span>הגדרות וחיבורים</span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-slate-700 my-4"></div>

                    {/* Landing Pages */}
                    <div className="px-2 mb-2">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">דפי נחיתה ושיווק</p>
                    </div>
                    <a
                        href="/?soldiers=true"
                        target="_blank"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800 hover:text-blue-400"
                    >
                        <Users size={20} />
                        <span>חיילים משוחררים</span>
                    </a>
                    <a
                        href="/veterans?veterans=true"
                        target="_blank"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
                    >
                        <Users size={20} />
                        <span>מסלול פורשים</span>
                    </a>
                    <a
                        href="/veterans?ref=1solution_tzevet"
                        target="_blank"
                        className="w-full flex items-center gap-3 px-4 py-4 mt-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl transition-all text-indigo-400 hover:bg-indigo-600/20 group"
                    >
                        <Award size={20} className="group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col">
                            <span className="font-bold text-xs">דף שותפות (רונית - צוות)</span>
                            <span className="text-[9px] opacity-60">1solution & Tzevet</span>
                        </div>
                    </a>

                    {/* Quick Access Links */}
                    <div className="px-2 mt-8 mb-2">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">קישורים שימושיים</p>
                    </div>

                    <div className="space-y-1">
                        <a
                            href="/"
                            target="_blank"
                            className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <Globe size={16} className="text-blue-400" />
                                <span className="text-sm">קישור למערכת</span>
                            </div>
                            <LinkIcon size={12} className="opacity-0 group-hover:opacity-100" />
                        </a>

                        {facebookPageId && (
                            <a
                                href={`https://facebook.com/${facebookPageId}`}
                                target="_blank"
                                className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Facebook size={16} className="text-[#1877F2]" />
                                    <span className="text-sm">דף פייסבוק</span>
                                </div>
                                <LinkIcon size={12} className="opacity-0 group-hover:opacity-100" />
                            </a>
                        )}
                    </div>
                </nav>

                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-medium text-slate-400">
                            {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                        </span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:mr-64 transition-all">
                {/* Top Header with LED Indicators */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-10 p-6 flex justify-between items-center shadow-sm">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {activeView === 'overview' && 'לוח בקרה ראשי'}
                            {activeView === 'jobs' && 'ניהול משרות'}
                            {activeView === 'candidates' && 'מועמדים'}
                            {activeView === 'hot-req' && 'דרישות חמות'}
                        </h2>
                        <div className="flex gap-4 mt-1 items-center">
                            {/* Premium Indicators Mesh */}
                            <div className="flex -space-x-2 mr-4">
                                <div title="SVT Engine" className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all ${isConnected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <LinkIcon size={14} />
                                </div>
                                <div
                                    onClick={onConnectFacebook}
                                    title={isFacebookConnected ? `Facebook: ${facebookPageName}` : "חבר פייסבוק"}
                                    className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-110 active:scale-95 ${isFacebookConnected ? 'bg-[#1877F2] text-white' : 'bg-slate-200 text-slate-400'}`}
                                >
                                    <Facebook size={14} />
                                </div>
                                <div title="LinkedIn Service" className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all ${isLinkedInConnected ? 'bg-[#0A66C2] text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <Linkedin size={14} />
                                </div>
                                <div title="Telegram Service" className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all ${isTelegramConnected ? 'bg-[#26A5E4] text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <Send size={14} />
                                </div>
                            </div>

                            {/* NEW: Sync Groups Button */}
                            <button
                                onClick={async () => {
                                    if (confirm('לפתוח דפדפן ולסנכרן את הקבוצות שלך מהפייסבוק?')) {
                                        try {
                                            alert('מתחיל סנכרון... דפדפן ייפתח בקרוב.');
                                            const res = await fetch('/api/sync-groups', { method: 'POST' });
                                            const data = await res.json();
                                            if (data.success) alert(`סנכרון הושלם! ${data.count} קבוצות נוספו/עודכנו.`);
                                            else alert('שגיאה בסנכרון.');
                                        } catch (e) { alert('שגיאת תקשורת.'); }
                                    }
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                                title="סנכרן קבוצות פייסבוק מהפרופיל שלי"
                            >
                                <Globe size={14} />
                            </button>

                            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`}></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SVT CORE</span>
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FIREBASE</span>
                            </div>

                            {isPulling && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 animate-bounce">
                                    <Download size={12} className="text-white" />
                                    <span className="text-[10px] font-bold text-white uppercase italic">Syncing...</span>
                                </div>
                            )}

                            {!isFacebookConnected && (
                                <button
                                    onClick={onConnectFacebook}
                                    className="flex items-center gap-2 bg-[#1877F2] text-white px-4 py-1.5 rounded-xl hover:bg-[#166fe5] transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100"
                                >
                                    <Facebook size={12} />
                                    <span>Connect FB</span>
                                </button>
                            )}

                            {isFacebookConnected && facebookPageName && (
                                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
                                    <Facebook size={12} className="text-[#1877F2]" />
                                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{facebookPageName}</span>
                                    {facebookPageId && (
                                        <a
                                            href={`https://facebook.com/${facebookPageId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 bg-white rounded-lg shadow-sm hover:text-blue-600 transition-colors"
                                            title="פתח דף פייסבוק"
                                        >
                                            <Globe size={10} />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {isConnected && (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => onPull(false)}
                                    disabled={isPulling}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all active:scale-95 ${isPulling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Download size={18} />
                                    <span>{isPulling ? 'מושך...' : 'משוך חדשות'}</span>
                                </button>
                                <button
                                    onClick={() => onPull(true)}
                                    disabled={isPulling}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 transition-all active:scale-95 font-bold ${isPulling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="סנכרון עומק לכל המשרות שאין להן תיאור מלא"
                                >
                                    <Sparkles size={18} className="animate-pulse" />
                                    <span>סנכרון עומק מלא 🔥</span>
                                </button>
                            </div>
                        )}

                        {!isConnected && (
                            <button
                                onClick={() => setActiveView('settings')}
                                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-xl hover:bg-slate-900 transition-all"
                            >
                                <Settings size={18} />
                                <span>הגדר חיבורים</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-8">
                    {activeView === 'overview' && (
                        <>
                            {/* KPI Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
                                <StatCard
                                    label="משרות פעילות"
                                    value={stats.activeJobs.toString()}
                                    subtext="מסונכרן בזמן אמת"
                                    icon={<Briefcase className="text-white" />}
                                    color="bg-slate-800"
                                    onClick={() => setActiveView('jobs')}
                                />
                                <StatCard
                                    label="דאטה מלא ✨"
                                    value={(stats as any).fullDataJobs?.toString() || "0"}
                                    subtext="משיכה מעמיקה הושלמה"
                                    icon={<Sparkles className="text-white animate-pulse" />}
                                    color="bg-blue-600"
                                    onClick={() => setActiveView('jobs')}
                                />
                                <StatCard
                                    label="מועמדים השבוע"
                                    value={stats.candidates.toString()}
                                    subtext="טרנד ללא שינוי"
                                    icon={<Users className="text-white" />}
                                    color="bg-indigo-600"
                                    onClick={() => setActiveView('candidates')}
                                />
                                <StatCard
                                    label="פוסטים ויראליים"
                                    value={stats.viralPosts.toString()}
                                    subtext="מיוצר ע״י Gemini"
                                    icon={<Play className="text-white" />}
                                    color="bg-purple-600"
                                    onClick={() => setActiveView('jobs')}
                                />
                                <StatCard
                                    label="יחס המרה"
                                    value={stats.conversionRate}
                                    subtext="קליקים לדף נחיתה"
                                    icon={<CheckCircle className="text-white" />}
                                    color="bg-emerald-600"
                                    onClick={() => setActiveView('overview')}
                                />
                            </div>

                            {/* Recent Activity Placeholder */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-96 flex flex-col items-center justify-center text-slate-400">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <LayoutDashboard size={32} className="text-slate-300" />
                                </div>
                                <p className="text-lg font-medium text-slate-600">מערכת הליבה פעילה</p>
                                <p className="text-sm mt-1">נתונים חדשים יופיעו כאן בזמן אמת.</p>
                            </div>
                        </>
                    )}

                    {activeView === 'jobs' && (
                        <JobsList onViewPublications={() => setActiveView('publications')} />
                    )}

                    {activeView === 'candidates' && <CandidatesList />}

                    {activeView === 'hot-req' && <HotRequirements />}

                    {activeView === 'publications' && <PublicationsList />}

                    {activeView === 'settings' && (
                        <SettingsComponent
                            isFacebookConnected={isFacebookConnected}
                            facebookPageName={facebookPageName}
                            isLinkedInConnected={isLinkedInConnected}
                            isInstagramConnected={isInstagramConnected}
                            isTelegramConnected={isTelegramConnected}
                            onConnectSVT={onConnect}
                            onConnectFacebook={onConnectFacebook}
                            onConnectLinkedIn={() => alert('חיבור לינקדאין בקרוב...')}
                            onConnectInstagram={() => alert('חיבור אינסטגרם בקרוב...')}
                            onConnectTelegram={() => alert('חיבור טלגרם בקרוב...')}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

// Subcomponents helper
function StatCard({ label, value, subtext, icon, color, onClick }: { label: string, value: string, subtext: string, icon: React.ReactNode, color: string, onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
            <div className={`absolute top-0 right-0 w-2 h-full ${color}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl shadow-lg shadow-blue-100 ${color}`}>{icon}</div>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
            <div className="text-slate-500 text-sm font-medium">{label}</div>
            <div className="text-slate-400 text-xs mt-2">{subtext}</div>
        </div>
    );
}
