import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Send, CheckCircle, AlertTriangle, Sparkles, Facebook, FileText, Linkedin, Instagram, Globe, MapPin, Rocket } from 'lucide-react';

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description?: string;
    description_clean?: string;
    status: string;
    created_at: any;
    viral_post?: string;
    viral_post_a?: string;
    viral_post_b?: string;
    professional_post?: string;
    urgent_post?: string;
    threshold_url?: string;
    image_url?: string;
    is_full_scrape?: boolean;
    extraction_method?: string;
}

interface JobDetailModalProps {
    job: Job;
    onClose: () => void;
    onPublished?: () => void;
}

export function JobDetailModal({ job, onClose, onPublished }: JobDetailModalProps) {
    if (!job) return null;

    const [activeTab, setActiveTab] = useState<'content' | 'original'>('content');
    const [publishing, setPublishing] = useState(false);
    const [localViralPost, setLocalViralPost] = useState(job.viral_post_a || job.viral_post || '');
    const [activeVersion, setActiveVersion] = useState<'a' | 'b'>(job.viral_post_b && !job.viral_post_a ? 'b' : 'a');

    // Edit & Preview State
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(job.description_clean || job.description || '');
    const [regenerating, setRegenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Multi-platform selection
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'telegram']);
    const [published, setPublished] = useState(false);
    const [postToPage, setPostToPage] = useState(true);

    // Update local state when prop changes (e.g. if parent refreshes)
    useEffect(() => {
        setDescription(job.description_clean || job.description || '');
    }, [job]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('הועתק ללוח!');
    };

    const [recommendedGroups, setRecommendedGroups] = useState<{ id: string, name: string, url: string }[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

    useEffect(() => {
        // Fetch groups when modal opens or job changes
        if (job) {
            fetch(`/api/recommend-groups?jobId=${job.id}&title=${encodeURIComponent(job.title)}&location=${encodeURIComponent(job.location)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setRecommendedGroups(data.groupIds);
                        // Select all by default
                        setSelectedGroups(data.groupIds.map((g: any) => g.id));
                    }
                });
        }
    }, [job]);

    const toggleGroup = (id: string) => {
        setSelectedGroups(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const handleRegenerateAI = async () => {
        setRegenerating(true);
        try {
            // Send the CURRENT description state (it might have been edited)
            const res = await fetch(`/api/jobs/${job.id}/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description })
            });
            const data = await res.json();
            if (data.success) {
                setLocalViralPost(data.aiContent.viral_post_a || '');
                job.viral_post_a = data.aiContent.viral_post_a;
                job.viral_post_b = data.aiContent.viral_post_b;
                setActiveVersion('a');
                alert('התוכן השיווקי חודש בהצלחה! ✨ (נוצרו 2 גרסאות)');
                setIsEditing(false);
            } else {
                alert('שגיאה בחידוש התוכן: ' + data.error);
            }
        } catch (e) {
            alert('שגיאה בחידוש התוכן.');
        } finally {
            setRegenerating(false);
        }
    };

    const handleConfirmPublish = async () => {
        setPublishing(true);
        try {
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    platforms: selectedPlatforms,
                    groupIds: selectedGroups,
                    postToPage: postToPage,
                    content: activeVersion === 'a' ? (job.viral_post_a || localViralPost) : (job.viral_post_b || localViralPost),
                    image_url: job.image_url
                })
            });
            const data = await res.json();

            if (data.success) {
                setPublished(true);
                setShowPreview(false);
                alert('בקשות הפרסום נוצרו! המתן לאישור סופי בדף הפרסומים.');
                setTimeout(() => {
                    if (onPublished) onPublished();
                    onClose();
                }, 1500);
            } else {
                alert('שגיאה ביצירת בקשת פרסום: ' + data.error);
            }
        } catch (e) {
            alert('שגיאת תקשורת במערכת הפרסום.');
        } finally {
            setPublishing(false);
        }
    };

    const togglePlatform = (p: string) => {
        if (selectedPlatforms.includes(p)) {
            setSelectedPlatforms(selectedPlatforms.filter(x => x !== p));
        } else {
            setSelectedPlatforms([...selectedPlatforms, p]);
        }
    };

    const handlePublishClick = () => {
        setShowPreview(true);
    };

    if (showPreview) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md rtl">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles size={20} className="text-indigo-600" />
                            תצוגה מקדימה ובחירת ערוצי הפצה
                        </h3>
                        <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto max-h-[70vh]">
                        {/* Platform Selector */}
                        <div className="flex gap-2 mb-6 justify-center">
                            {[
                                { id: 'facebook', icon: <Facebook size={16} />, color: '#1877F2', name: 'פייסבוק' },
                                { id: 'linkedin', icon: <Linkedin size={16} />, color: '#0A66C2', name: 'לינקדאין' },
                                { id: 'instagram', icon: <Instagram size={16} />, color: '#E4405F', name: 'אינסטגרם' },
                                { id: 'telegram', icon: <Send size={16} />, color: '#26A5E4', name: 'טלגרם' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => togglePlatform(p.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${selectedPlatforms.includes(p.id) ? 'border-transparent text-white shadow-md' : 'border-gray-200 text-gray-400 bg-white'}`}
                                    style={{ backgroundColor: selectedPlatforms.includes(p.id) ? p.color : undefined }}
                                >
                                    {p.icon}
                                    <span className="text-[10px] font-bold">{p.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Social Post Mockup */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-3 flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                                    <img src="/logo.png" alt="Profile" className="w-8 h-auto object-contain" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-900">1solution - 1solution jobs</div>
                                    <div className="text-[10px] text-gray-500 font-medium">תצוגה מקדימה • 🌎</div>
                                </div>
                            </div>

                            <div className="px-3 pb-3 text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                                {localViralPost}
                            </div>
                            {/* Image Placeholder */}
                            <div className="bg-gray-100 aspect-video relative overflow-hidden border-y border-gray-100">
                                <img
                                    src={job.image_url || `https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80`}
                                    alt="Job Visual"
                                    className="w-full h-full object-cover"
                                />
                                {/* Logo Header on Image */}
                                <div className="absolute top-4 left-4 flex items-center bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-xl">
                                    <img src="/logo.png" alt="1solution Logo" className="h-6 w-auto object-contain" />
                                </div>

                                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="text-white">
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-90 mb-3 bg-indigo-600/80 px-4 py-1 rounded-full backdrop-blur-sm inline-block">We Are Hiring</div>
                                        <div className="text-3xl font-black leading-tight drop-shadow-2xl max-w-sm">
                                            {localViralPost.split('\n')[0].replace('📢', '').replace('🚀', '').trim().substring(0, 60) || job.title}
                                        </div>
                                        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium opacity-80 backdrop-blur-sm">
                                            <span>{job.location === 'לבדיקה...' ? 'רעננה' : (job.location || 'מרכז')}</span>
                                            <span>•</span>
                                            <span>משרה מיידית</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 border-t border-gray-100 flex justify-around opacity-50">
                                <div className="text-gray-500 text-xs flex items-center gap-1 font-medium">👍 לייק</div>
                                <div className="text-gray-500 text-xs flex items-center gap-1 font-medium">💬 תגובה</div>
                                <div className="text-gray-500 text-xs flex items-center gap-1 font-medium">🔗 שיתוף</div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                            <h4 className="text-indigo-900 font-bold text-sm mb-3 flex items-center gap-2">
                                <Rocket size={16} className="text-indigo-600" />
                                סיכום הפצה רב-ערוצית
                            </h4>
                            <div className="space-y-3">
                                {selectedPlatforms.includes('facebook') && (
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-indigo-100/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Facebook size={12} className="text-blue-600" />
                                            <span className="text-[11px] font-bold text-gray-700 uppercase">Facebook Groups</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {recommendedGroups.map(g => (
                                                <span key={g.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{g.name}</span>
                                            ))}
                                            {recommendedGroups.length === 0 && <span className="text-[10px] text-slate-400 italic">מאתר קבוצות רלוונטיות...</span>}
                                        </div>
                                    </div>
                                )}
                                {selectedPlatforms.includes('telegram') && (
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-indigo-100/50">
                                        <div className="flex items-center gap-2">
                                            <Send size={12} className="text-sky-500" />
                                            <span className="text-[11px] font-bold text-gray-700 uppercase">Telegram Channel</span>
                                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-auto">נשמר בהגדרות</span>
                                        </div>
                                    </div>
                                )}
                                {selectedPlatforms.length === 0 && (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 text-center">
                                        נא לבחור לפחות ערוץ הפצה אחד למעלה 👆
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                        <button
                            onClick={() => setShowPreview(false)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            חזור לעריכה
                        </button>
                        <button
                            onClick={handleConfirmPublish}
                            disabled={publishing || selectedPlatforms.length === 0}
                            className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {publishing ? (
                                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                            ) : (
                                <Send size={20} />
                            )}
                            אשר והפץ לכל הערוצים! 🚀
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{job.title}</h2>
                            {job.is_full_scrape && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider shadow-sm animate-pulse-subtle">
                                    Full Data ✅
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-slate-500 text-sm font-medium">
                            <span className="flex items-center gap-1"><Globe size={14} /> {job.company}</span>
                            <span className="opacity-30">•</span>
                            <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                            <span className="opacity-30">•</span>
                            <span className="text-xs font-mono bg-slate-200/50 px-2 py-0.5 rounded text-slate-400">ID: {job.id}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <button
                                onClick={() => togglePlatform('facebook')}
                                className={`p-2 rounded-xl transition-all ${selectedPlatforms.includes('facebook') ? 'bg-[#1877F2] text-white shadow-md scale-110' : 'bg-transparent text-slate-300 hover:text-slate-400'}`}
                                title="פרסם בפייסבוק"
                            >
                                <Facebook size={18} />
                            </button>
                            <button
                                onClick={() => togglePlatform('telegram')}
                                className={`p-2 rounded-xl transition-all ${selectedPlatforms.includes('telegram') ? 'bg-[#26A5E4] text-white shadow-md scale-110' : 'bg-transparent text-slate-300 hover:text-slate-400'}`}
                                title="פרסם בטלגרם"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'content' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Sparkles size={16} />
                        תוכן שיווקי (AI)
                    </button>
                    <button
                        onClick={() => setActiveTab('original')}
                        className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'original' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <FileText size={16} />
                        משרה מקורית
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {/* Viral Post */}
                            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative group">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">פוסט ויראלי (A/B Testing)</h3>
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => {
                                                        setActiveVersion('a');
                                                        setLocalViralPost(job.viral_post_a || '');
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeVersion === 'a' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${activeVersion === 'a' ? 'bg-white' : 'bg-indigo-600'}`} />
                                                    גרסה א׳: מקצועית
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setActiveVersion('b');
                                                        setLocalViralPost(job.viral_post_b || '');
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeVersion === 'b' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${activeVersion === 'b' ? 'bg-white' : 'bg-indigo-600'}`} />
                                                    גרסה ב׳: קלילה
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRegenerateAI}
                                            disabled={regenerating}
                                            className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 border border-indigo-100 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                            title="צור תוכן מחדש עם ה-Deep Description החדש"
                                        >
                                            {regenerating ? (
                                                <div className="animate-spin w-3 h-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full"></div>
                                            ) : <Sparkles size={14} />}
                                            ייצר A/B מחדש
                                        </button>
                                        <button onClick={() => copyToClipboard(job.viral_post || '')} className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                            <Copy size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-line leading-relaxed text-[15px]">
                                    {localViralPost || "ממתין ליצירת תוכן..."}
                                </div>
                            </div>

                            {/* Group Recommendations & Manual Search */}
                            <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mb-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                        <Globe size={16} className="text-indigo-600" />
                                        בחירת קבוצות הפצה (פייסבוק)
                                    </h4>

                                    {/* Business Page Toggle */}
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm mr-auto ml-4">
                                        <input
                                            type="checkbox"
                                            id="post_to_page"
                                            checked={postToPage}
                                            onChange={(e) => setPostToPage(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor="post_to_page" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                                            פרסם גם בדף העסקי הרשמי
                                        </label>
                                    </div>

                                    {/* Manual Search in Modal */}
                                    <div className="relative w-full md:w-64">
                                        <input
                                            type="text"
                                            placeholder="חפש קבוצה נוספת..."
                                            className="w-full px-3 py-1.5 bg-white border border-indigo-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                if (val.length > 2) {
                                                    const res = await fetch(`/api/facebook-groups?q=${encodeURIComponent(val)}`);
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        setRecommendedGroups(prev => {
                                                            const newOnes = data.groups.filter((ng: any) => !prev.some(pg => pg.id === ng.id));
                                                            return [...prev, ...newOnes];
                                                        });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Automated Recommendations */}
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">הצעות המערכת (מבוסס מיקום ותחום)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {recommendedGroups.map(g => {
                                                const isSelected = selectedGroups.includes(g.id);
                                                return (
                                                    <button
                                                        key={g.id}
                                                        onClick={() => toggleGroup(g.id)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-100 text-slate-700 hover:border-indigo-300'}`}
                                                    >
                                                        {isSelected ? <CheckCircle size={12} className="text-white" /> : <Facebook size={12} className="text-blue-600" />}
                                                        <span className="text-xs font-medium">{g.name}</span>
                                                    </button>
                                                );
                                            })}
                                            {recommendedGroups.length === 0 && (
                                                <div className="text-xs text-slate-400 italic py-1">מאתר קבוצות רלוונטיות לפי מיקום ותחום...</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Source Data Preview for Confidence */}
                            {(job.description_clean || job.description) && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <FileText size={10} />
                                        ביסוס נתונים (מקור המשרה)
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-3 italic">
                                        "{job.description_clean || job.description}"
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('original')}
                                        className="text-[10px] text-indigo-600 mt-2 hover:underline font-medium"
                                    >
                                        צפה בתיאור המלא »
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'original' && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900">תיאור המשרה (SVT)</h3>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-indigo-600 font-medium text-sm hover:underline"
                                    >
                                        ערוך טקסט ידנית
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full h-64 p-4 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-sans text-gray-800"
                                        placeholder="הדבק כאן את תיאור המשרה המלא..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => {
                                                setDescription(job.description_clean || job.description || '');
                                                setIsEditing(false);
                                            }}
                                            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                        >
                                            ביטול
                                        </button>
                                        <button
                                            onClick={handleRegenerateAI}
                                            disabled={regenerating}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                        >
                                            {regenerating ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Sparkles size={16} />}
                                            שמור וצור תוכן AI מחדש
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                    {description || "לא נמצא תיאור."}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 bg-white flex flex-col gap-4">
                    <div className="flex justify-between items-center w-full">
                        <a
                            href={`/api/j/${job.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 font-medium hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <ExternalLink size={18} />
                            צפה בדף הנחיתה הציבורי
                        </a>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                                סגור
                            </button>

                            <button
                                onClick={handlePublishClick}
                                disabled={publishing || published}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 text-white ${published ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {publishing ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                        <span>מעבד...</span>
                                    </>
                                ) : published ? (
                                    <>
                                        <CheckCircle size={18} />
                                        <span>נשלח לאישור הפצה!</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>תצוגה מקדימה והפצה רב-ערוצית</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
