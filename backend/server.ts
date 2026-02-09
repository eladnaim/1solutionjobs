console.log("[Server] 🚀 BOOTING UP...");
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import admin from 'firebase-admin';
import { db } from './db.js';
import { syncFacebookGroups } from './sync_groups.js';
import { recommendGroups, createPublishRequest, approvePublishRequest, runAutoPilotBatch } from './publishEngine.js';
import { getPublicJob, trackAndRedirect, getTeamSouthGateway } from './landingController.js';
import { generateJobContent } from './contentEngine.js';
import { findMatchesForRequirement, checkNewCandidateAgainstRequirements } from './matchingEngine.js';

// ... imports ...

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve static assets from public folder
app.use(express.static('public'));
app.use('/screenshots', express.static('screenshots'));

// Basic Root Route
app.get('/', (_req, res) => {
    res.send('1solution jobs Intelligent HR System - API v1 is active.');
});

// Gateway Pages
app.get('/team-south', getTeamSouthGateway);

// Job Landing Pages
app.get('/j/:id', getPublicJob);
app.get('/api/j/:id', (req, res) => getPublicJob(req, res));
app.get('/job/:id', (req, res) => getPublicJob(req, res));
app.get('/api/j/:id/apply', trackAndRedirect);

// SVT Status
app.get('/api/svt-status', async (_req, res) => {
    try {
        const doc = await db.collection('settings').doc('svt_session_cookies').get();
        const connected = doc.exists && doc.data()?.connected === true;
        // On Vercel we assume not running actively
        res.json({ connected, active: false });
    } catch (error) {
        res.json({ connected: false, active: false });
    }
});

// Facebook Status
app.get('/api/facebook-status', async (_req, res) => {
    try {
        const doc = await db.collection('settings').doc('facebook_session_cookies').get();
        const settingsDoc = await db.collection('settings').doc('facebook').get();
        const settingsData = settingsDoc.exists ? settingsDoc.data() : {};

        const connected = doc.exists && doc.data()?.connected === true && !!settingsData?.page_id;

        res.json({
            connected,
            page_name: settingsData?.page_name || null,
            page_id: settingsData?.page_id || null
        });
    } catch (error) {
        res.json({ connected: false });
    }
});

// ...

// SVT Login
app.post('/api/svt-login', async (_req, res) => {
    try {
        const scraper = await getSVTScraper();
        const result = await scraper.runInteractiveLogin();
        res.json({ success: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Facebook Interactive Login
app.post('/api/facebook-login', async (_req, res) => {
    try {
        const scraper = await getFBScraper();
        const result = await scraper.runInteractiveLogin();
        res.json({ success: true, result });
    } catch (error: any) {
        console.error("Facebook login error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ...

// Pull Endpoint (Trigger Layer 2.2)
app.get('/api/pull-jobs', async (req, res) => {
    const fullSweep = req.query.fullSweep === 'true';

    // Start the process but don't 'await' it to prevent UI timeout
    getSVTScraper().then(scraper => scraper.scrapeJobs(fullSweep)).catch(err => console.error("Background Scrape Failed:", err));

    res.json({
        success: true,
        message: fullSweep ?
            'החל סנכרון עומק מלא לכל המשרות. התהליך עובד ברקע ויעבור משרה-משרה.' :
            'משיכת משרות חדשות החלה ברקע.'
    });
});

// ...

// ... existing endpoints ...

// --- LAYER 4 ENDPOINTS ---

app.get('/api/recommend-groups', async (req, res) => {
    const { jobId, title, location } = req.query;
    try {
        let description = '';
        if (jobId) {
            const jobDoc = await db.collection('jobs').doc(String(jobId)).get();
            if (jobDoc.exists) {
                description = jobDoc.data()?.description_clean || '';
            }
        }
        const groupIds = await recommendGroups(String(title), String(location), description);
        res.json({ success: true, groupIds });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/facebook-groups', async (req, res) => {
    const { q } = req.query;
    try {
        let query: any = db.collection('facebook_groups').where('is_member', '==', true);
        const snapshot = await query.limit(100).get();

        let groups = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        if (q) {
            const term = String(q).toLowerCase();
            groups = groups.filter((g: any) => g.name.toLowerCase().includes(term));
        }

        res.json({ success: true, groups: groups.slice(0, 20) });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/publish', async (req, res) => {
    const { jobId, groupIds, content, platforms, postToPage } = req.body;
    try {
        const result = await createPublishRequest(
            jobId,
            groupIds || [],
            content,
            platforms || ['facebook', 'telegram'],
            postToPage !== undefined ? postToPage : true
        );

        if (result.success && result.requestId) {
            // On Vercel/Production, we might want to skip auto-approval if it involves Playwright
            // because Chromium might not be available.
            const isVercel = !!process.env.VERCEL;

            if (isVercel && (platforms || []).includes('facebook')) {
                console.log(`[Server] ⏳ Created publish request ${result.requestId}. Skipping auto-approval on Vercel (No Browser).`);
                return res.json({
                    success: true,
                    message: 'בקשת הפרסום נוצרה ונוספה לרשימת ההמתנה. יש לאשר אותה ידנית בשל מגבלות טכניות בשרת.',
                    requestId: result.requestId
                });
            }

            console.log(`[Server] 🚀 Auto-approving publish request ${result.requestId}...`);
            const pubResult = await approvePublishRequest(result.requestId, 'System (Auto-Confirmed)');
            res.json(pubResult);
        } else {
            res.status(400).json({ success: false, error: result.message || 'Failed to create publish request' });
        }
    } catch (error: any) {
        console.error('[Server] Publish Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/publish-requests', async (_req, res) => {
    try {
        const snapshot = await db.collection('publish_requests')
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, requests });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/publish-requests/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { approvedBy } = req.body;
    try {
        const result = await approvePublishRequest(id, approvedBy || 'Admin');
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ...

// ... existing endpoints ...

// --- LAYER 5 ENDPOINTS (Public Funnel) ---

// --- LAYER 6: MATCHING ENGINE (Placeholder) ---

// Telegram Test Connection
app.post('/api/telegram-test', async (req, res) => {
    const { bot_token } = req.body;
    console.log(`[Telegram] 🔍 Testing connection for token: ${bot_token ? bot_token.substring(0, 10) + '...' : 'MISSING'}`);

    try {
        const response = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
        const data = await response.json() as any;

        if (data.ok) {
            const botInfo = data.result;
            console.log(`[Telegram] ✅ Connection SUCCESS: @${botInfo.username}`);
            res.json({ success: true, bot: botInfo });
        } else {
            console.error(`[Telegram] ❌ API reported failure:`, data);
            res.json({ success: false, error: data.description || 'API Error' });
        }
    } catch (error: any) {
        console.error(`[Telegram] 💥 Connection CRASHED:`, error.message);
        res.status(500).json({
            success: false,
            error: `שגיאת תקשורת: ${error.message}. וודא שהטוקן תקין ושאין חסימת רשת בשרת.`
        });
    }
});

// Get Single Job
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const doc = await db.collection('jobs').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ success: false, error: 'Job not found' });
        res.json({ success: true, job: { id: doc.id, ...doc.data() } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch job' });
    }
});

// Get All Jobs (Management View)
app.get('/api/jobs', async (_req, res) => {
    try {
        // Emergency Mode: Simple limit 10 to check if DB is alive
        const snapshot = await db.collection('jobs').limit(10).get();
        const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, jobs });
    } catch (error) {
        console.error("Fetch Jobs Error:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }
});
// --- LEAD NOTIFICATION HELPER ---
async function notifyLeadToRecruiter(candidate: any, matches: any[] = []) {
    try {
        const tgDoc = await db.collection('settings').doc('telegram').get();
        const config = tgDoc.exists ? tgDoc.data() : null;
        if (!config || !config.bot_token || !config.chat_id) return;

        let message = `🚀 <b>ליד חדש הגיע!</b>\n\n`;
        message += `👤 <b>שם:</b> ${candidate.full_name}\n`;
        message += `📞 <b>טלפון:</b> ${candidate.phone}\n`;
        message += `📍 <b>סוג:</b> ${candidate.type === 'soldier' ? 'חייל משוחרר' : 'פורש'}\n`;
        message += `💼 <b>תפקיד:</b> ${candidate.role_type || candidate.current_role}\n`;

        if (candidate.assigned_team) {
            message += `🤝 <b>שויך לצוות:</b> ${candidate.assigned_team}\n`;
        }
        if (candidate.district) {
            message += `🌍 <b>מחוז:</b> ${candidate.district === 'south' ? 'דרום' : candidate.district}\n`;
        }

        if (matches.length > 0) {
            message += `\n🎯 <b>התאמות חמות (AI):</b>\n`;
            matches.forEach(m => {
                message += `- ציון ${m.score}%: ${m.reason}\n`;
            });
        }

        const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chat_id,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.error("Recruiter notification failed:", e);
    }
}

// --- LAYER 7: LEAD MANAGEMENT ---

app.post('/api/candidates/soldiers', async (req, res) => {
    try {
        const candidateData = {
            ...req.body,
            type: 'soldier',
            status: 'active',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_contact_date: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('candidates').add(candidateData);

        // Layer 7: Instant Match & Notification
        const matches = await checkNewCandidateAgainstRequirements(candidateData);
        await notifyLeadToRecruiter(candidateData, matches);

        // Layer 5: WhatsApp Redirection Support
        const whatsappUrl = `https://wa.me/972545555555?text=${encodeURIComponent(`היי, שמי ${req.body.full_name}, הגשתי מועמדות למשרה דרך 1solution jobs. אשמח להתקדם!`)}`;

        res.json({ success: true, id: docRef.id, whatsappUrl });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/candidates/veterans', async (req, res) => {
    try {
        const candidateData = {
            ...req.body,
            type: 'veteran',
            status: 'active',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_contact_date: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('candidates').add(candidateData);

        // Layer 7: Instant Match & Notification
        const matches = await checkNewCandidateAgainstRequirements(candidateData);
        await notifyLeadToRecruiter(candidateData, matches);

        // Layer 5: WhatsApp Redirection Support
        const whatsappUrl = `https://wa.me/972545555555?text=${encodeURIComponent(`היי, שמי ${req.body.full_name}, הגשתי מועמדות (פורש) דרך 1solution jobs. אשמח להתקדם!`)}`;

        res.json({ success: true, id: docRef.id, whatsappUrl });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/candidates', async (_req, res) => {
    try {
        const snapshot = await db.collection('candidates').orderBy('created_at', 'desc').get();
        const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, candidates });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/candidates/:id/check-availability', async (req, res) => {
    try {
        await db.collection('candidates').doc(req.params.id).update({
            last_contact_date: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ...

// --- LAYER 8: PUBLISHING ENGINE ---

import { createPublishRequest, approveAndPublish, recommendGroups } from './publishEngine';

app.post('/api/publish-request', async (req, res) => {
    try {
        console.log(`[Server] Received publish request for Job ${req.body.jobId}`);
        const { jobId, platforms, content, link, image } = req.body;

        // 1. Get Recommendations (Invisible Step)
        // We need groups to publish to facebook properly
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        const jobData = jobDoc.data();
        const groups = await recommendGroups(jobData);

        // 2. Create Request Object
        const requestResult = await createPublishRequest(
            jobId,
            groups,
            content,
            platforms,
            true // postToPage defaults to true
        );

        if (!requestResult.success) {
            throw new Error(requestResult.message);
        }

        // 3. Execute Immediately (For now - later we can use queue)
        // We need to re-fetch the request we just created to pass full object or just pass IDs
        // Simplification: We call approveAndPublish with the ID we just got.

        console.log(`[Server] Approving publish request ${requestResult.requestId}...`);

        // Dynamic import to avoid circular dependencies if any
        const { SocialMediaPublisher } = await import('./socialMediaPublisher');
        const publisher = new SocialMediaPublisher();
        await publisher.loadConfig();

        const publishResult = await publisher.approveAndPublish(requestResult.requestId!, 'System');

        res.json({ success: true, results: publishResult });

    } catch (error: any) {
        console.error("[Server] Publish Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ...

app.post('/api/jobs/:id/regenerate', async (req, res) => {
    try {
        const jobId = req.params.id;
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        const jobData = jobDoc.data();

        if (!jobData) return res.status(404).json({ success: false, error: 'Job not found' });

        // Use the description from the body if provided (manual edit), otherwise use database
        const description = req.body.description || jobData.description_clean || jobData.description || '';

        console.log(`[Server] 🪄 Regenerating content for job: ${jobId} | Custom Desc: ${!!req.body.description}`);

        const aiContent = await generateJobContent({
            original_title: jobData.title,
            description: description,
            location: jobData.location || 'ישראל'
        });

        // Update job with new AI content (Layer 3 A/B Testing Enabled)
        await db.collection('jobs').doc(jobId).update({
            viral_post_a: aiContent.viral_post_a,
            viral_post_b: aiContent.viral_post_b,
            professional_post: aiContent.professional_post,
            urgent_post: aiContent.urgent_post,
            last_content_update: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, aiContent });
    } catch (error: any) {
        console.error("Regeneration Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/stats', async (_req, res) => {
    try {
        const jobsCount = await db.collection('jobs').count().get();
        const activeJobs = jobsCount.data().count;

        const candidatesCount = await db.collection('candidates').count().get();
        const candidates = candidatesCount.data().count;

        // Efficient counting of specific subsets if needed, 
        // but for now let's just use approximate or indexed values
        // For Alpha, we'll keep these simpler or skip if too slow
        const fullDataJobsCount = await db.collection('jobs').where('is_full_scrape', '==', true).count().get();
        const fullDataJobs = fullDataJobsCount.data().count;

        const pendingSnapshot = await db.collection('publish_requests').where('status', '==', 'pending_approval').count().get();
        const pendingPublications = pendingSnapshot.data().count;

        res.json({
            success: true,
            stats: {
                activeJobs,
                candidates,
                viralPosts: fullDataJobs, // Approximation for now
                conversionRate: "3.2%",
                fullDataJobs,
                pendingPublications
            }
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// Public Job Data (for Landing Page) - Clean URL
app.get('/j/:id', (req, res) => getPublicJob(req, res));
app.get('/api/j/:id', (req, res) => getPublicJob(req, res));

// Apply Redirect (Click Tracking)
app.get('/api/j/:id/apply', (req, res) => trackAndRedirect(req, res));


// Seed Initial Groups (Run once)
app.get('/api/seed-groups', async (req, res) => {

    const groups = [
        { name: 'משרות בהייטק - הקבוצה הגדולה', url: 'https://fb.com/groups/hitech', keywords: ['developer', 'software', 'fullstack', 'פיתוח', 'תוכנה'], is_member: true },
        { name: 'דרושים מרכז', url: 'https://fb.com/groups/centerjobs', keywords: ['general', 'all'], location_match: ['tel aviv', 'center', 'רמת גן', 'תל אביב'], is_member: true },
        { name: 'משרות סטודנטים', url: 'https://fb.com/groups/students', keywords: ['student', 'junior', 'סטודנט'], is_member: true },
        { name: 'Marketing Jobs Israel', url: 'https://fb.com/groups/marketingil', keywords: ['marketing', 'social', 'ppc', 'שיווק'], is_member: true }
    ];

    const batch = db.batch();
    groups.forEach(g => {
        const ref = db.collection('groups').doc();
        batch.set(ref, g);
    });

    await batch.commit();
    res.json({ success: true, message: 'Seeded 4 groups.' });
});

// --- LAYER 7: HOT REQUIREMENTS ---

app.post('/api/requirements/match', async (req, res) => {
    try {
        const matches = await findMatchesForRequirement(req.body);
        res.json({ success: true, matches });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Automation: Pull 100 jobs every 30 minutes (Layer 2)
cron.schedule('*/30 * * * *', async () => {
    console.log("[Automation] Triggering Scheduled Scrape...");
    try {
        if (process.env.VERCEL) return; // Skip cron on Vercel
        const scraper = await getSVTScraper();
        await scraper.scrapeJobs();
    } catch (e) {
        console.error("[Automation] Scheduled Scrape Failed:", e);
    }
});

// Automation: Auto-Pilot Publishing every 2 hours (Layer 4)
// This ensures new high-quality jobs reach groups without manual trigger
cron.schedule('0 */2 * * *', async () => {
    console.log("[Automation] Triggering Layer 4 Auto-Pilot...");
    try {
        await runAutoPilotBatch(3); // Process top 3 new jobs
    } catch (e) {
        console.error("[Automation] Auto-Pilot Failed:", e);
    }
});

// Export for Vercel
export default app;

// Only listen if running locally, not on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`[One Solution Core] Server running on http://localhost:${PORT}`);
    });
}
