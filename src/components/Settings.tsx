import React, { useState, useEffect } from 'react';
import { Facebook, Linkedin, Instagram, Send as TelegramIcon, ShieldCheck, Globe, Bell, Save, Trash2, Link as LinkIcon, Check, AlertTriangle } from 'lucide-react';

interface SettingsProps {
    isFacebookConnected?: boolean;
    facebookPageName?: string;
    isLinkedInConnected?: boolean;
    isInstagramConnected?: boolean;
    isTelegramConnected?: boolean;
    onConnectSVT: () => void;
    onConnectFacebook: () => void;
    onConnectLinkedIn: () => void;
    onConnectInstagram: () => void;
    onConnectTelegram: () => void;
}

export function Settings({
    isFacebookConnected,
    facebookPageName,
    isLinkedInConnected,
    isInstagramConnected,
    isTelegramConnected,
    onConnectSVT,
    onConnectFacebook,
    onConnectLinkedIn,
    onConnectInstagram,
    onConnectTelegram
}: SettingsProps) {
    const [activeTab, setActiveTab] = useState<'social' | 'system' | 'notifications'>('social');
    const [fbPageId, setFbPageId] = useState('');
    const [fbPageName, setFbPageName] = useState('');
    const [fbAccessToken, setFbAccessToken] = useState('');
    const [tgBotToken, setTgBotToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [isSavingFB, setIsSavingFB] = useState(false);
    const [isSavingTG, setIsSavingTG] = useState(false);
    const [isTestingTG, setIsTestingTG] = useState(false);
    const [tgTestResult, setTgTestResult] = useState<{ success: boolean, message: string } | null>(null);

    useEffect(() => {
        // Load existing FB settings
        fetch('/api/settings/facebook')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    setFbPageId(data.settings.page_id || '');
                    setFbPageName(data.settings.page_name || '');
                    setFbAccessToken(data.settings.access_token || '');
                }
            });

        // Load existing TG settings
        fetch('/api/settings/telegram')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    setTgBotToken(data.settings.bot_token || '');
                    setTgChatId(data.settings.chat_id || '');
                }
            });
    }, []);

    const handleTestTelegram = async () => {
        if (!tgBotToken) return alert('נא להזין Token תחילה');
        setIsTestingTG(true);
        setTgTestResult(null);
        try {
            const res = await fetch('/api/telegram-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_token: tgBotToken })
            });
            const data = await res.json();
            if (data.success) {
                setTgTestResult({ success: true, message: `הבוט זוהה בהצלחה: ${data.bot.first_name}` });
            } else {
                setTgTestResult({ success: false, message: `שגיאה: ${data.error}` });
            }
        } catch (e) {
            setTgTestResult({ success: false, message: 'שגיאת תקשורת' });
        } finally {
            setIsTestingTG(false);
        }
    };

    const handleSaveTelegram = async () => {
        setIsSavingTG(true);
        try {
            const res = await fetch('/api/settings/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_token: tgBotToken, chat_id: tgChatId })
            });
            const data = await res.json();
            if (data.success) {
                alert('הגדרות הטלגרם נשמרו בהצלחה!');
            }
        } catch (e) {
            alert('שגיאה בשמירת הגדרות טלגרם.');
        } finally {
            setIsSavingTG(false);
        }
    };

    const handleSaveFacebook = async () => {
        setIsSavingFB(true);
        try {
            const res = await fetch('/api/settings/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page_id: fbPageId, page_name: fbPageName, access_token: fbAccessToken })
            });
            const data = await res.json();
            if (data.success) {
                alert('הגדרות הפייסבוק נשמרו בהצלחה!');
            }
        } catch (e) {
            alert('שגיאה בשמירת ההגדרות.');
        } finally {
            setIsSavingFB(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">הדרות מערכת</h2>
                    <p className="text-slate-500 mt-1">נהל חיבורים, הרשאות והגדרות הפצה</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('social')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'social' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    חיבורי מדיה
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    חיבורי ליבה
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'notifications' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    התראות
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-6">
                    {activeTab === 'social' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Globe className="text-blue-500" size={24} />
                                    רשתות חברתיות
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">חבר את החשבונות העסקיים שלך להפצה אוטומטית</p>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Facebook */}
                                <div className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#1877F2] text-white rounded-xl shadow-lg shadow-blue-100">
                                                <Facebook size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Facebook Business</h4>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-slate-500">דף עסקי וקבוצות מטורגטות</p>
                                                    {isFacebookConnected && facebookPageName && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                                            מחובר ל: {facebookPageName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onConnectFacebook}
                                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isFacebookConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-[#1877F2] text-white hover:bg-[#166fe5] shadow-lg shadow-blue-100'}`}
                                        >
                                            {isFacebookConnected ? 'מחובר ✅' : 'חבר חשבון'}
                                        </button>
                                    </div>

                                    {/* Page Settings Form */}
                                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">מזהה דף עסקי (Page ID)</label>
                                            <input
                                                type="text"
                                                value={fbPageId}
                                                onChange={e => setFbPageId(e.target.value)}
                                                placeholder="לדוגמה: 61587004355854"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">שם הדף המדויק</label>
                                            <input
                                                type="text"
                                                value={fbPageName}
                                                onChange={e => setFbPageName(e.target.value)}
                                                placeholder="1solution - השמה וגיוס"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Graph API Access Token (מזהה גישה קבוע)</label>
                                            <input
                                                type="password"
                                                value={fbAccessToken}
                                                onChange={e => setFbAccessToken(e.target.value)}
                                                placeholder="EAA..."
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                                * חובה לפרסום אוטומטי יציב. ניתן להשיג דרך Meta for Developers.
                                            </p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className="text-[10px] text-slate-400 italic mb-2">💡 טיפ: תוכל למצוא את ה-Page ID בלשונית "אודות" (About) בדף העסקי שלך בפייסבוק.</p>
                                            <button
                                                onClick={handleSaveFacebook}
                                                disabled={isSavingFB}
                                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                                            >
                                                {isSavingFB ? <div className="animate-spin w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full" /> : <Save size={12} />}
                                                עדכן הגדרות דף פייסבוק
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* LinkedIn */}
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors opacity-80">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-[#0A66C2] text-white rounded-xl shadow-lg shadow-blue-100">
                                            <Linkedin size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">LinkedIn Career</h4>
                                            <p className="text-xs text-slate-500">פרסום בדף החברה ופרופיל אישי</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onConnectLinkedIn}
                                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isLinkedInConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg shadow-slate-200'}`}
                                    >
                                        {isLinkedInConnected ? 'מחובר ✅' : 'חבר חשבון'}
                                    </button>
                                </div>

                                {/* Instagram */}
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors opacity-80">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-xl shadow-lg shadow-pink-100">
                                            <Instagram size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">Instagram Jobs</h4>
                                            <p className="text-xs text-slate-500">פרסום ויזואלי ב-Feed ו-Stories</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onConnectInstagram}
                                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isInstagramConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg shadow-slate-200'}`}
                                    >
                                        {isInstagramConnected ? 'מחובר ✅' : 'חבר חשבון'}
                                    </button>
                                </div>

                                {/* Telegram */}
                                <div className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#26A5E4] text-white rounded-xl shadow-lg shadow-blue-100">
                                                <TelegramIcon size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Telegram Channel</h4>
                                                <p className="text-xs text-slate-500">הפצה מיידית לערוץ דרושים</p>
                                            </div>
                                        </div>
                                        <div
                                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isTelegramConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-200 text-slate-400'}`}
                                        >
                                            {isTelegramConnected ? 'מחובר ✅' : 'לא מוגדר'}
                                        </div>
                                    </div>

                                    {/* Telegram Settings Form */}
                                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Bot Token (מ-BotFather)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    value={tgBotToken}
                                                    onChange={e => setTgBotToken(e.target.value)}
                                                    placeholder="לדוגמה: 123456789:ABCdef..."
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                                <button
                                                    onClick={handleTestTelegram}
                                                    disabled={isTestingTG || !tgBotToken}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                >
                                                    {isTestingTG ? 'בודק...' : 'בדוק חיבור'}
                                                </button>
                                            </div>
                                            {tgTestResult && (
                                                <div className={`mt-1 text-[10px] font-bold flex items-center gap-1 ${tgTestResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {tgTestResult.success ? <Check size={10} /> : <AlertTriangle size={10} />}
                                                    {tgTestResult.message}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Chat ID או שם ערוץ (@channel)</label>
                                            <input
                                                type="text"
                                                value={tgChatId}
                                                onChange={e => setTgChatId(e.target.value)}
                                                placeholder="@my_channel_name"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleSaveTelegram}
                                                disabled={isSavingTG}
                                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                                            >
                                                {isSavingTG ? <div className="animate-spin w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full" /> : <Save size={12} />}
                                                עדכן הגדרות טלגרם
                                            </button>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className="text-[10px] text-slate-400 italic">💡 טיפ: צור בוט חדש ב-@BotFather, קבל Token, והוסף את הבוט כמנהל בערוץ שלך.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                                    <ShieldCheck className="text-emerald-500" size={24} />
                                    חיבורי ליבה ונתונים
                                </h3>
                                <p className="text-sm text-slate-500">הגדרות גישה למערכות המקור ולבסיס הנתונים</p>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
                                            <LinkIcon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">SVT CORE API</h4>
                                            <p className="text-xs text-slate-500">סנכרון משרות ונתוני לקוחות</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onConnectSVT}
                                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                    >
                                        רענן חיבור
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    Status: Optimal Connection
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <h4 className="text-lg font-bold mb-4 relative z-10">אבטחת מידע</h4>
                        <p className="text-sm text-slate-400 relative z-10 leading-relaxed">
                            כל החיבורים מבוצעים באמצעות הצפנת SSL/TLS.
                            פרטי הגישה (Tokens) נשמרים בסביבה מבודדת ומאובטחת ב-Google Cloud.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-blue-400 text-xs font-bold relative z-10">
                            <ShieldCheck size={16} />
                            מערכת מאובטחת
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100">
                        <h4 className="text-lg font-bold text-blue-900 mb-2 font-bold mb-4">טיפ מומחה 💡</h4>
                        <p className="text-sm text-blue-800 leading-relaxed font-medium">
                            חיבור של יותר משתי רשתות חברתיות יחד מגדיל את הסיכוי לחשיפת המשרה ב-400% כבר בשעה הראשונה!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
