console.log("[Server] 🚀 BOOTING UP...");
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import admin from 'firebase-admin';
import { SVTScraper } from './scraper.js';
import { db } from './db.js';
import { FacebookScraper } from './facebookScraper.js';
import { syncFacebookGroups } from './sync_groups.js';
import { recommendGroups, createPublishRequest, approvePublishRequest } from './publishEngine.js';
import { getPublicJob, trackAndRedirect } from './landingController.js';
import { generateJobContent } from './contentEngine.js';
import { findMatchesForRequirement, checkNewCandidateAgainstRequirements } from './matchingEngine.js';

const app = express();
const PORT = 3001;
const svtScraper = new SVTScraper();
const fbScraper = new FacebookScraper();

app.use(cors());
app.use(express.json());

// Serve static assets from public folder
app.use(express.static('public'));
app.use('/screenshots', express.static('screenshots'));

// Basic Root Route
app.get('/', (_req, res) => {
    res.send('1solution jobs Intelligent HR System - API v1 is active.');
});

// SVT Status
app.get('/api/svt-status', async (_req, res) => {
    try {
        const doc = await db.collection('settings').doc('svt_session_cookies').get();
        const connected = doc.exists && doc.data()?.connected === true;
        const active = (SVTScraper as any).isRunning || false;
        res.json({ connected, active });
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

// Facebook Page Settings
app.get('/api/settings/facebook', async (_req, res) => {
    try {
        const doc = await db.collection('settings').doc('facebook').get();
        res.json({ success: true, settings: doc.exists ? doc.data() : {} });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/settings/facebook', async (req, res) => {
    const { page_id, page_name } = req.body;
    try {
        await db.collection('settings').doc('facebook').set({
            page_id,
            page_name,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Telegram Status
app.get('/api/telegram-status', async (_req, res) => {
    try {
        const doc = await db.collection('settings').doc('telegram').get();
        const connected = doc.exists && !!doc.data()?.bot_token && !!doc.data()?.chat_id;
        res.json({ connected });
    } catch (error) {
        res.json({ connected: false });
    }
});

// Telegram Settings
app.get('/api/settings/telegram', async (_req, res) => {
    try {
        const doc = await db.collection('settings').doc('telegram').get();
        res.json({ success: true, settings: doc.exists ? doc.data() : {} });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/settings/telegram', async (req, res) => {
    const { bot_token, chat_id } = req.body;
    try {
        await db.collection('settings').doc('telegram').set({
            bot_token,
            chat_id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// SVT Login
app.post('/api/svt-login', async (_req, res) => {
    try {
        const result = await svtScraper.runInteractiveLogin();
        res.json({ success: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Facebook Interactive Login
app.post('/api/facebook-login', async (_req, res) => {
    try {
        const result = await fbScraper.runInteractiveLogin();
        res.json({ success: true, result });
    } catch (error: any) {
        console.error("Facebook login error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sync Facebook Groups
app.post('/api/sync-groups', async (_req, res) => {
    try {
        const result = await syncFacebookGroups();
        res.json(result);
    } catch (error: any) {
        console.error("Group sync error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Pull Endpoint (Trigger Layer 2.2)
app.get('/api/pull-jobs', async (req, res) => {
    const fullSweep = req.query.fullSweep === 'true';

    // Start the process but don't 'await' it to prevent UI timeout
    svtScraper.scrapeJobs(fullSweep).catch(err => console.error("Background Scrape Failed:", err));

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

app.post('/api/publish', async (req, res) => {
    const { jobId, groupIds, content, platforms } = req.body;
    try {
        const result = await createPublishRequest(
            jobId,
            groupIds || [],
            content,
            platforms || ['facebook', 'telegram']
        );

        if (result.success && result.requestId) {
            console.log(`[Server] 🚀 Auto-approving publish request ${result.requestId} for immediate distribution...`);
            // Trigger approval but don't strictly await it if it's too slow, 
            // OR await it to show success in modal. Let's await for better UX.
            const pubResult = await approvePublishRequest(result.requestId, 'System (Auto-Confirmed)');
            res.json(pubResult);
        } else {
            res.status(500).json({ success: false, error: 'Failed to create publish request' });
        }
    } catch (error: any) {
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
        const snapshot = await db.collection('jobs').orderBy('created_at', 'desc').get();
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
        const jobsSnapshot = await db.collection('jobs').get();
        const activeJobs = jobsSnapshot.size;

        const candidatesSnapshot = await db.collection('candidates').get();
        const candidates = candidatesSnapshot.size;

        // Count jobs that have at least one generated post
        const viralPosts = jobsSnapshot.docs.filter(doc => doc.data().viral_post || doc.data().professional_post).length;

        // Count full data jobs
        const fullDataJobs = jobsSnapshot.docs.filter(doc => doc.data().is_full_scrape === true || (doc.data().description_clean && doc.data().description_clean.length > 500)).length;

        // Count pending publications
        const pendingSnapshot = await db.collection('publish_requests').where('status', '==', 'pending_approval').get();
        const pendingPublications = pendingSnapshot.size;

        res.json({
            success: true,
            stats: {
                activeJobs,
                candidates,
                viralPosts,
                conversionRate: "3.2%",
                fullDataJobs,
                pendingPublications
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// Public Job Data (for Landing Page)
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

// Automation: Pull 100 jobs every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    console.log("[Automation] Triggering Scheduled Scrape...");
    try {
        await svtScraper.scrapeJobs();
    } catch (e) {
        console.error("[Automation] Scheduled Scrape Failed:", e);
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
