import { Request, Response } from 'express';
import { db } from './db.js';
import admin from 'firebase-admin';

/**
 * Get Public Job Details
 * Returns only the necessary info for the public landing page (cleaned, no internal notes).
 */
/**
 * Get Public Job Details
 * Returns a high-fidelity HTML landing page for candidates.
 */
export async function getPublicJob(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        const doc = await db.collection('jobs').doc(id).get();
        if (!doc.exists) {
            return res.status(404).send('<h1>Job not found</h1>');
        }

        const data = doc.data();

        // --- LOCKING MECHANISM (Snapshot Logic) ---
        // If there's a published snapshot, we use it to ensure the "locked" feel.
        // Otherwise we fall back to the live data.
        const snapshot = data?.published_snapshot || {};

        const title = snapshot.title || data?.original_title || data?.title || 'משרה חדשה';
        const location = snapshot.location || data?.location || 'ישראל';
        const description = snapshot.description || data?.viral_post || data?.description || 'אין תיאור זמין.';
        const company = "1solution jobs";
        const imageUrl = snapshot.image_url || data?.image_url || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80";

        // Premium HTML Template
        const html = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title} | ${company}</title>
            
            <!-- SEO & Meta Tags -->
            <meta name="description" content="הזדמנות עבודה חדשה ב-${company}: ${title} ב-${location}. הגש מועמדות עכשיו!">
            <meta property="og:title" content="${title} | ${company}">
            <meta property="og:description" content="מצאנו את המשרה הבאה שלך! בוא לבדוק את הפרטים ולהגיש מועמדות ל- ${title}">
            <meta property="og:image" content="${imageUrl}">
            <meta property="og:site_name" content="${company}">
            <meta property="og:type" content="website">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title} | ${company}">
            <meta name="twitter:image" content="${imageUrl}">

            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Assistant', sans-serif; }
                .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
                .brand-gradient { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); }
            </style>
        </head>
        <body class="bg-slate-50 text-slate-900 leading-relaxed">
            
            <header class="bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 py-4 shadow-sm sticky top-0 z-50">
                <div class="flex items-center gap-3">
                    <img src="/logo.png" class="h-10 w-auto" alt="1solution Logo">
                </div>
                <a href="/api/j/${id}/apply" class="brand-gradient text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:scale-105 transition-all">הגש מועמדות</a>
            </header>

            <main class="max-w-4xl mx-auto px-6 py-12">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                    
                    <div class="md:col-span-2 space-y-8">
                        <div>
                            <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4">${title}</h1>
                            <div class="flex flex-wrap gap-3">
                                <span class="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-100">${location}</span>
                                <span class="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-100">משרה פעילה ✅</span>
                                <span class="bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-100">גיוס מיידי</span>
                            </div>
                        </div>

                        <div class="aspect-[16/9] rounded-[2rem] overflow-hidden shadow-2xl relative border-4 border-white">
                            <img src="${imageUrl}" class="w-full h-full object-cover" alt="Job Image">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-8">
                                <div class="text-white">
                                    <p class="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Hiring Now @ ${company}</p>
                                    <h2 class="text-2xl font-bold">${title}</h2>
                                </div>
                            </div>
                        </div>

                        <div class="prose prose-lg max-w-none text-slate-700 whitespace-pre-line bg-white p-8 md:p-12 rounded-[2rem] border border-slate-100 shadow-sm leading-relaxed">
                            <h3 class="text-2xl font-bold text-slate-900 mb-8 border-b pb-4 border-slate-50 flex items-center gap-3">
                                <span class="w-2 h-8 brand-gradient rounded-full"></span>
                                תיאור המשרה ודרישות
                            </h3>
                            ${description}
                        </div>
                    </div>

                    <div class="md:col-span-1">
                        <div class="sticky top-28 space-y-6">
                            <div class="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 text-center space-y-6">
                                <div class="w-20 h-20 bg-indigo-50 rounded-2xl mx-auto flex items-center justify-center rotate-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="text-xl font-bold text-slate-900">רוצה להצטרף?</h4>
                                    <p class="text-sm text-slate-500 mt-2 leading-relaxed">התהליך מהיר וישיר. השאר פרטים ותתחיל לעבוד!</p>
                                </div>
                                <a href="/api/j/${id}/apply" class="block w-full brand-gradient text-white font-extrabold py-5 rounded-2xl shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all">הגש מועמדות עכשיו! 🚀</a>
                                <p class="text-[10px] text-slate-400 font-medium tracking-tight">הגשה מאובטחת דרך One Solution</p>
                            </div>

                            <div class="bg-slate-900 text-white p-8 rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <h4 class="font-bold flex items-center gap-2 relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                    </svg>
                                    מידע חשוב
                                </h4>
                            <ul class="text-sm text-slate-400 space-y-4 relative">
                                    <li class="flex items-start gap-3">
                                        <span class="text-indigo-400 font-bold">✓</span>
                                        <span>סודיות מוחלטת מובטחת לכל אורך התהליך</span>
                                    </li>
                                    <li class="flex items-start gap-3">
                                        <span class="text-indigo-400 font-bold">✓</span>
                                        <span>פנייה ראשונית מנציגנו תוך 24 שעות</span>
                                    </li>
                                    <li class="flex items-start gap-3">
                                        <span class="text-indigo-400 font-bold">✓</span>
                                        <span>הזדמנויות קידום בארגון דינמי</span>
                                    </li>
                                     <li class="flex items-start gap-3 border-t border-slate-700 pt-3 mt-2">
                                        <span class="text-pink-500 font-bold">♥</span>
                                        <span class="text-slate-300">בניהולה של רונית - מנהלת כ״א ארגון צוות דרום</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <footer class="bg-white border-t border-slate-100 py-12 text-center">
                <div class="flex items-center justify-center gap-2 mb-4">
                    <img src="/logo.png" class="h-6 w-auto" alt="1solution Logo">
                </div>
                <p class="text-[11px] text-slate-400 font-medium tracking-widest uppercase">&copy; 2026 1solution jobs. All rights reserved.</p>
            </footer>

        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error: any) {
        res.status(500).send('<h1>Server Error</h1>');
    }
}

/**
 * Handle Apply Redirect
 * Logs the click and redirects the user to the SVT threshold URL.
 */
export async function trackAndRedirect(req: Request, res: Response) {
    const id = req.params.id as string;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip;
    const referrer = req.query.ref as string || 'direct'; // Affiliate/Partner ID

    try {
        const doc = await db.collection('jobs').doc(id).get();
        if (!doc.exists) {
            return res.status(404).send('Job not found');
        }

        const data = doc.data();
        const targetUrl = data?.application_link || data?.threshold_url || data?.source_link;

        // Log the click (Layer 5 telemetry)
        await db.collection('clicks').add({
            jobId: id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent,
            ip,
            source: referrer
        });

        if (!targetUrl) {
            return res.status(400).send('Target URL missing');
        }

        // Add Query Params (Layer 5 Upgrade)
        const finalUrl = new URL(targetUrl);
        finalUrl.searchParams.append('agent', '774555');
        finalUrl.searchParams.append('source', 'onesolution');

        // Perform the redirect
        res.redirect(finalUrl.toString());

    } catch (error) {
        console.error("Redirect error:", error);
        res.status(500).send("Server Error");
    }
}
/**
 * Team South Gateway Page
 * A branded landing page for Ronit's team (Tzevet South).
 */
export async function getTeamSouthGateway(req: Request, res: Response) {
    const html = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>צוות דרום | 1solution Jobs</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Assistant', sans-serif; }
            .brand-gradient { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); }
        </style>
    </head>
    <body class="bg-white text-slate-900">
        <header class="p-6 flex justify-between items-center border-b border-slate-50">
            <img src="/logo.png" class="h-8 w-auto">
            <span class="text-xs font-bold text-slate-400 tracking-widest uppercase">One Solution × Tzevet South</span>
        </header>

        <main class="max-w-4xl mx-auto px-6 py-20 text-center space-y-12">
            <div class="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 mb-4 animate-bounce">
                בניהולה של רונית - צוות דרום 📍
            </div>
            
            <h1 class="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tight">
                הדרך הבאה שלך <br/> <span class="text-blue-600">מתחילה כאן.</span>
            </h1>
            
            <p class="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                ברוכים הבאים לשער הגיוס הייחודי של 1solution בשיתוף "צוות" (מחוז דרום). 
                מרכז ההשתלבות והקריירה שלך עובר שדרוג דיגיטלי מלא.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
                <a href="/?soldiers=true&ref=team_south" class="group p-10 bg-slate-50 border border-slate-100 rounded-[3rem] hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-slate-100 text-right">
                    <h3 class="text-3xl font-bold mb-4">חיילים משוחררים</h3>
                    <p class="opacity-70 leading-relaxed mb-6">משרות אבטחה, לוגיסטיקה וניהול המותאמות בדיוק לניסיון הצבאי שלך. ליווי אישי ושיבוץ מהיר.</p>
                    <span class="font-bold border-b-2 border-current pb-1 group-hover:border-white">הכנס למשרות חמות ←</span>
                </a>

                <a href="/veterans?ref=team_south" class="group p-10 bg-slate-900 text-white rounded-[3rem] hover:bg-indigo-700 transition-all shadow-2xl text-right">
                    <h3 class="text-3xl font-bold mb-4">פורשים וגמלאים</h3>
                    <p class="text-slate-400 group-hover:text-indigo-100 leading-relaxed mb-6">קריירה שנייה או השלמת הכנסה? מצא משרות איכותיות בפריסה דרומית עם תנאים מעולים.</p>
                    <span class="font-bold border-b-2 border-indigo-400 pb-1">ללוח הפורשים ←</span>
                </a>
            </div>

            <div class="pt-20 border-t border-slate-100">
                <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">השותפים שלנו</h4>
                <div class="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale">
                    <img src="/logo.png" class="h-6">
                    <span class="text-lg font-black italic">TZEVET - SOUTH</span>
                    <span class="text-lg font-black italic">IDF VETERANS</span>
                </div>
            </div>
        </main>

        <footer class="py-12 border-t border-slate-50 text-center text-slate-400 text-xs">
            © 2026 1solution jobs | פותח בגאווה עבור צוות דרום
        </footer>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}
