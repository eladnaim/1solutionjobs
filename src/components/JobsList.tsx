import React, { useEffect, useState } from 'react';
import { ExternalLink, Copy, Check, Eye, ChevronLeft } from 'lucide-react';
import { JobDetailModal } from './JobDetailModal';

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    status: string;
    created_at: any;
    viral_post?: string;
    professional_post?: string;
    urgent_post?: string;
    threshold_url?: string;
    description?: string;
    description_clean?: string;
    extraction_method?: string;
    is_full_scrape?: boolean;
}

interface JobsListProps {
    onViewPublications?: () => void;
}

export function JobsList({ onViewPublications }: JobsListProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetch('/api/jobs')
            .then(res => res.json())
            .then(data => {
                if (data.success) setJobs(data.jobs);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filteredJobs = jobs.filter(j =>
        j?.title?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        j?.location?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        j?.company?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        j?.id?.toLowerCase()?.includes(searchTerm.toLowerCase())
    );

    const copyToClipboard = (e: React.MouseEvent, text: string, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">טוען משרות...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-bold text-xl text-gray-800">מאגר משרות פעיל</h3>
                    <p className="text-sm text-gray-500 mt-1">נמצאו {filteredJobs.length} משרות תואמות</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="חפש משרה, עיר או חברה..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="p-4 font-medium">כותרת המשרה</th>
                            <th className="p-4 font-medium">חברה / מיקום</th>
                            <th className="p-4 font-medium">סטטוס</th>
                            <th className="p-4 font-medium">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredJobs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-gray-400">
                                    לא נמצאו משרות תואמות.
                                </td>
                            </tr>
                        ) : filteredJobs.map(job => job && (
                            <tr
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                className="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                            >
                                <td className="p-4">
                                    <div className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                                        {job.title}
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{job.id}</div>
                                </td>
                                <td className="p-4 text-gray-600">
                                    <div>{job.company}</div>
                                    <div className="text-sm text-gray-400">{job.location}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                פעיל
                                            </span>
                                            {(job.is_full_scrape || (job.description_clean && job.description_clean.length >= 500)) ?
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 animate-pulse-subtle border border-blue-200" title={`שיטה: ${job.extraction_method || 'סינכרון מלא'}`}>
                                                    תיאור מלא ✨
                                                </span> :
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                                                    תיאור חלקי
                                                </span>
                                            }
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {job.description_clean ? `${job.description_clean.length} תווים` : 'לא נסרק'}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => copyToClipboard(e, `/api/j/${job.id}`, job.id)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative hover:text-indigo-600"
                                            title="העתק קישור"
                                        >
                                            {copiedId === job.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                        </button>
                                        <ChevronLeft size={18} className="text-gray-300" />
                                    </div>
                                </td>
                            </tr>
                        )
                        )}
                    </tbody>
                </table>
            </div>

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onPublished={onViewPublications}
                />
            )}

            {jobs.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                    עדיין לא נמשכו משרות. לחץ על "משוך משרות" כדי להתחיל.
                </div>
            )}
        </div>
    );
}
