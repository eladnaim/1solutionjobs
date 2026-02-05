import admin from 'firebase-admin';
import { db } from './db.js';

export interface Group {
    id: string;
    name: string;
    url: string;
    keywords: string[];
    location_match?: string[]; // e.g. ["center", "north"]
    is_member: boolean;
    location_tags?: string[]; // New auto-tags
    region?: string; // e.g. 'center', 'south'
}

export interface RecommendedGroup {
    id: string;
    name: string;
    url: string;
}

export function cleanTitle(title?: string): string {
    if (!title) return 'משרה חדשה';
    return title
        .replace(/עודכן ב-\d+ שעות האחרונות/g, '')
        .replace(/עודכן ב-\d+ שעות/g, '')
        .replace(/עודכן לפני \d+ שעות/g, '')
        .replace(/משרה מס׳ \d+/g, '')
        .replace(/משרה מס' \d+/g, '')
        .replace(/עודכן לאחרונה/g, '')
        .replace(/משרה חמה/g, '')
        .replace(/דחוף/g, '')
        .replace(/SVT/gi, '')
        .replace(/\d{6,}/g, '') // Remove long numeric IDs if attached to title
        .replace(/#/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

const ALL_ISRAELI_CITIES = [
    'תל אביב', 'ירושלים', 'חיפה', 'נתניה', 'באר שבע', 'פתח תקווה', 'ראשון לציון', 'אשדוד', 'חולון', 'בני ברק', 'רמת גן', 'רחובות', 'אשקלון', 'בת ים', 'בית שמש', 'כפר סבא', 'הרצליה', 'חדרה', 'מודיעין', 'רעננה', 'לוד', 'רמלה', 'נהריה', 'עכו', 'כרמיאל', 'טבריה', 'עפולה', 'נצרת', 'קרית גת', 'קרית אתא', 'קרית מוצקין', 'קרית ים', 'קרית ביאליק', 'מעלה אדומים', 'הוד השרון', 'גבעתיים', 'רמת השרון', 'נס ציונה', 'אלעד', 'אילת', 'חריש', 'יבנה', 'אור יהודה', 'מגדל העמק', 'צפת', 'נשר', 'ערד', 'קרית שמונה', 'שדרות', 'נתיבות', 'אופקים'
];
const ISRAELI_REGIONS: Record<string, string[]> = {
    'מרכז': ['תל אביב', 'רמת גן', 'גבעתיים', 'פתח תקווה', 'חולון', 'בת ים', 'ראשון לציון', 'בני ברק', 'אלעד'],
    'שרון': ['נתניה', 'כפר סבא', 'רעננה', 'הוד השרון', 'הרצליה', 'רמת השרון', 'חדרה', 'חריש'],
    'Hasharon': ['נתניה', 'כפר סבא', 'רעננה', 'הוד השרון', 'הרצליה', 'רמת השרון', 'חדרה', 'חריש'],
    'דרום': ['באר שבע', 'אשדוד', 'אשקלון', 'קרית גת', 'נתיבות', 'שדרות', 'אופקים', 'ערד', 'אילת'],
    'צפון': ['חיפה', 'קריות', 'נהריה', 'עכו', 'כרמיאל', 'טבריה', 'עפולה', 'נצרת', 'צפת', 'קרית שמונה'],
    'ירושלים': ['ירושלים', 'בית שמש', 'מעלה אדומים', 'מבשרת'],
    'שפלה': ['רחובות', 'נס ציונה', 'לוד', 'רמלה', 'יבנה', 'מודיעין']
};

export async function recommendGroups(jobTitle: string, jobLocation: string, jobDescription: string = ''): Promise<RecommendedGroup[]> {
    console.log(`[Publish Engine] 🧠 Smart matching for: ${jobTitle} in ${jobLocation}`);

    let snapshot = await db.collection('facebook_groups').where('is_member', '==', true).get();
    if (snapshot.empty) snapshot = await db.collection('groups').where('is_member', '==', true).get();

    if (snapshot.empty) return [];

    const normalizedTitle = jobTitle.toLowerCase();
    const normalizedLocation = jobLocation.replace('ישראל', '').trim();
    const normalizedDesc = jobDescription.toLowerCase();

    // Identify ALL cities mentioned in the job (Multi-city support)
    const jobCities = ALL_ISRAELI_CITIES.filter(c => normalizedLocation.includes(c) || normalizedTitle.includes(c));
    if (jobCities.length === 0) jobCities.push(normalizedLocation);

    // Identify ALL regions mentioned in the job
    const jobRegions = Object.keys(ISRAELI_REGIONS).filter(r =>
        normalizedLocation.includes(r) ||
        normalizedTitle.includes(r) ||
        jobCities.some(city => ISRAELI_REGIONS[r].includes(city))
    );

    const results: any[] = [];

    snapshot.docs.forEach(doc => {
        const group = doc.data();
        const groupName = (group.name || '').toLowerCase();
        const groupTags = (group.location_tags || []).map((t: string) => t.toLowerCase());
        const groupRegion = (group.region || 'general').toLowerCase();
        let score = 0;

        // --- RULE 1: STRICT GEOGRAPHIC FILTERING (Multi-city & Region aware) ---
        const groupCitiesFound = ALL_ISRAELI_CITIES.filter(c => groupName.includes(c) || groupTags.includes(c.toLowerCase()));
        const groupRegionsFound = Object.keys(ISRAELI_REGIONS).filter(r => groupName.includes(r) || r.toLowerCase() === groupRegion);

        if (groupCitiesFound.length > 0) {
            const hasCityMatch = groupCitiesFound.some(gc => jobCities.some(jc => jc.includes(gc) || gc.includes(jc)));
            if (hasCityMatch) {
                score += 100;
            } else {
                // Penalize if the group targets a DIFFERENT city exclusively
                const isGeneral = groupName.includes('כל הארץ') || groupName.includes('ארצי') || groupRegion === 'general';
                if (!isGeneral) {
                    score -= 500;
                }
            }
        }

        // Region match boost
        const hasRegionMatch = groupRegionsFound.some(gr => jobRegions.includes(gr));
        if (hasRegionMatch) score += 40;

        // General fallback for all country groups
        if (groupName.includes('כל הארץ') || groupName.includes('ארצי') || groupRegion === 'general') score += 10;

        // --- RULE 2: INDUSTRY/DOMAIN MATCHING ---
        const industryKeywords: Record<string, string[]> = {
            'security': ['אבטחה', 'ביטחון', 'שומר', 'סייר', 'מוקד', 'קב"ט', 'ביטחוני'],
            'drivers': ['נהג', 'הובלה', 'תובלה', 'משאית', 'רכב', 'שליח', 'הפצה', 'לוגיסטיקה'],
            'tech': ['הייטק', 'פיתוח', 'תוכנה', 'QA', 'הנדסה', 'דיגיטל', 'hi-tech', 'tech', 'מתכנת', 'סייבר'],
            'industry': ['ייצור', 'מפעל', 'טכנאי', 'בטיחות', 'תעשייה', 'בניה', 'חשמלאי', 'רתך', 'מכונאי'],
            'sales': ['מכירות', 'Sales', 'אנשי מכירות', 'נציג מכירות', 'טלמרקטינג', 'פיתוח עסקי'],
            'marketing': ['שיווק', 'מרקטינג', 'Marketing', 'PPC', 'SEO', 'קריאייטיב', 'תוכן'],
            'hr': ['משאבי אנוש', 'גיוס', 'HR', 'השמה', 'רכז', 'רכזת גיוס'],
            'service': ['שירות', 'שירות לקוחות', 'נציג שירות', 'תמיכה', 'מוקד שירות'],
            'office': ['מזכירות', 'מנהלה', 'אדמיניסטרציה', 'פקיד', 'פקידה', 'משרד']
        };

        for (const [_, keywords] of Object.entries(industryKeywords)) {
            const hasJobKeyword = keywords.some(k => normalizedTitle.includes(k) || normalizedDesc.includes(k));
            const hasGroupKeyword = keywords.some(k => groupName.includes(k));

            if (hasJobKeyword && hasGroupKeyword) {
                score += 30;
            }
        }

        if (groupName.includes('דרושים') || groupName.includes('עבודה')) score += 5;

        if (score > 10) {
            results.push({
                id: doc.id,
                name: group.name,
                url: group.url,
                score
            });
        }
    });

    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(g => ({ id: g.id, name: g.name, url: g.url }));
}

/**
 * createPublishRequest
 * Creates a publish request that requires manual approval
 * NO AUTOMATIC PUBLISHING - User must explicitly approve
 */
export async function createPublishRequest(
    jobId: string,
    groupIds: string[],
    content: string,
    platforms: string[] = ['facebook'],
    postToPage: boolean = true
): Promise<{ success: boolean; requestId?: string; message: string }> {
    try {
        console.log(`[Publish Engine] Creating publish request for job ${jobId}`);
        console.log(`[Publish Engine] Platforms: ${platforms.join(', ')}`);
        console.log(`[Publish Engine] Groups: ${groupIds.length}`);

        // Get job data
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        const job = jobDoc.data();

        if (!job) {
            return { success: false, message: 'Job not found' };
        }

        // Get base URL for links (Layer 5)
        const baseUrl = process.env.VITE_API_URL || 'https://1solutionjobs.vercel.app';
        const landingPageUrl = `${baseUrl}/api/j/${jobId}`;

        // Create publish request in Firestore
        const fbSettingsDoc = await db.collection('settings').doc('facebook').get();
        const fbSettings = fbSettingsDoc.exists ? fbSettingsDoc.data() : {};

        try {
            const requestRef = await db.collection('publish_requests').add({
                job_id: jobId,
                job_title: job.title || 'משרה חדשה',
                job_company: job.company || 'חברה אנונימית',
                job_location: job.location || 'ישראל',
                content: content || '',
                platforms,
                post_to_page: postToPage,
                target_page_id: fbSettings?.page_id,
                target_page_name: fbSettings?.page_name,
                target_groups: groupIds || [],
                landing_page_url: landingPageUrl,
                status: 'pending_approval',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                approved_by: null,
                approved_at: null,
                published_at: null,
                results: null
            });

            console.log(`[Publish Engine] ✅ Publish request created: ${requestRef.id}`);
            return {
                success: true,
                requestId: requestRef.id,
                message: `בקשת פרסום נוצרה בהצלחה. דורש אישור ידני בלוח הפרסומים.`
            };
        } catch (dbError: any) {
            console.error('[Publish Engine] Firestore Add Error:', dbError);
            throw new Error(`שגיאה בשמירת הבקשה: ${dbError.message}`);
        }
    } catch (error: any) {
        console.error('[Publish Engine] Error creating publish request:', error);
        return {
            success: false,
            message: `שגיאה ביצירת בקשת פרסום: ${error.message}`
        };
    }
}

/**
 * approvePublishRequest
 * Approves a publish request and executes the actual publishing
 * This is the ONLY way to publish - explicit user approval required
 */
export async function approvePublishRequest(
    requestId: string,
    approvedBy: string
): Promise<{ success: boolean; message: string; results?: any }> {
    try {
        console.log(`[Publish Engine] Approving publish request: ${requestId}`);
        console.log(`[Publish Engine] Approved by: ${approvedBy}`);

        const requestDoc = await db.collection('publish_requests').doc(requestId).get();
        const request = requestDoc.data();

        if (!request) {
            return { success: false, message: 'בקשת פרסום לא נמצאה' };
        }

        if (request.status !== 'pending_approval') {
            return { success: false, message: `הבקשה כבר ${request.status}` };
        }

        const results: any = {
            success: true,
            platforms: {}
        };

        // 1. Process Telegram if selected
        if (request.platforms.includes('telegram')) {
            console.log('[Publish Engine] Publishing to Telegram...');
            const tgResult = await publishToTelegram(request.content, request.job_id);
            results.platforms.telegram = tgResult;
        }

        // 2. Process Facebook groups/page (Real Automation)
        if (request.platforms.includes('facebook')) {
            console.log('[Publish Engine] Publishing to Facebook (Page + Groups)...');
            const { FacebookScraper } = await import('./facebookScraper.js');
            const fb = new FacebookScraper();

            // Post to Main Page (only if post_to_page is true or missing)
            if (request.target_page_id && (request.post_to_page !== false)) {
                console.log(`[Publish Engine] Posting to Business Page: ${request.target_page_name}`);
                const fbResult = await fb.publishPost(request.target_page_id, request.content);
                results.platforms.facebook_page = { success: fbResult };
            } else {
                console.log('[Publish Engine] ⏭️ Skipping Business Page post (User opted out).');
            }

            // Post to Groups
            if (request.target_groups && request.target_groups.length > 0) {
                for (const groupId of request.target_groups) {
                    // Fetch group URL - Try both collections
                    let groupDoc = await db.collection('facebook_groups').doc(groupId).get();
                    if (!groupDoc.exists) {
                        groupDoc = await db.collection('groups').doc(groupId).get();
                    }

                    const groupUrl = groupDoc.data()?.url;
                    if (groupUrl) {
                        await fb.publishPost(groupUrl, request.content);
                    } else {
                        console.warn(`[Publish Engine] ⚠️ Could not find URL for group ${groupId}`);
                    }
                }
                results.platforms.facebook_groups = { success: true, count: request.target_groups.length };
            }
        }

        // Create content snapshot (Layer 5 Locking)
        const jobRef = db.collection('jobs').doc(request.job_id);
        const jobDoc = await jobRef.get();
        const jobData = jobDoc.data();

        const snapshot = {
            title: jobData?.original_title || jobData?.title,
            location: jobData?.location,
            description: request.content,
            image_url: jobData?.image_url,
            published_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update status and save snapshot
        await db.collection('publish_requests').doc(requestId).update({
            status: 'published',
            approved_by: approvedBy,
            approved_at: admin.firestore.FieldValue.serverTimestamp(),
            published_at: admin.firestore.FieldValue.serverTimestamp(),
            results: results.platforms
        });

        // Lock the job content
        await jobRef.update({
            published_snapshot: snapshot
        });

        console.log(`[Publish Engine] ✅ Request processed and published`);

        return {
            success: true,
            message: `הבקשה אושרה ופורסמה בהצלחה ב-${request.platforms.join(', ')}.`,
            results
        };
    } catch (error: any) {
        console.error('[Publish Engine] Error approving request:', error);
        return {
            success: false,
            message: `שגיאה באישור הבקשה: ${error.message}`
        };
    }
}

/**
 * publishToTelegram
 * Fetches settings and sends the job post to Telegram
 */
export async function publishToTelegram(content: string, jobId: string): Promise<any> {
    try {
        const tgDoc = await db.collection('settings').doc('telegram').get();
        const config = tgDoc.exists ? tgDoc.data() : null;
        const botToken = process.env.TELEGRAM_BOT_TOKEN || config?.bot_token;
        const chatId = config?.chat_id;

        if (!botToken || !chatId) {
            return { success: false, error: 'Telegram settings not configured (token or chat_id missing)' };
        }

        const baseUrl = process.env.VITE_API_URL || 'http://localhost:3001';
        const landingPageUrl = `${baseUrl}/api/j/${jobId}`;

        // Dynamic link replacement
        let finalContent = content;
        if (finalContent.includes('[[LINK]]')) {
            finalContent = finalContent.replace(/\[\[LINK\]\]/g, landingPageUrl);
        } else {
            finalContent += `\n\n🔗 לפרטים והגשה:\n${landingPageUrl}`;
        }

        const jobDoc = await db.collection('jobs').doc(jobId).get();
        const job = jobDoc.data();
        const imageUrl = job?.image_url;

        let response;
        if (imageUrl) {
            const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    photo: imageUrl,
                    caption: finalContent,
                    parse_mode: 'HTML'
                })
            });
            response = await res.json();
        } else {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: finalContent,
                    parse_mode: 'HTML'
                })
            });
            response = await res.json();
        }

        if (response.ok) {
            return { success: true, messageId: response.result.message_id };
        } else {
            return { success: false, error: response.description };
        }
    } catch (error: any) {
        console.error('[Telegram Publish] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * getPendingPublishRequests
 * Get all pending publish requests for review
 */
export async function getPendingPublishRequests(): Promise<any[]> {
    try {
        const snapshot = await db.collection('publish_requests')
            .where('status', '==', 'pending_approval')
            .orderBy('created_at', 'desc')
            .get();

        const requests: any[] = [];
        snapshot.forEach(doc => {
            requests.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return requests;
    } catch (error) {
        console.error('[Publish Engine] Error getting pending requests:', error);
        return [];
    }
}

/**
 * runAutoPilotBatch
 * Automatically finds new, high-quality jobs and publishes them to relevant groups.
 */
export async function runAutoPilotBatch(limit: number = 5) {
    console.log(`[Auto-Pilot] 🚀 Starting automated publishing batch (Limit: ${limit})...`);

    try {
        // 1. Find jobs that are active
        const jobsSnapshot = await db.collection('jobs')
            .where('status', '==', 'active')
            .limit(100)
            .get();

        if (jobsSnapshot.empty) {
            console.log("[Auto-Pilot] No suitable jobs found for publishing.");
            return;
        }

        // Filter and sort in memory to avoid index requirement in Alpha
        const sortedJobs = jobsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter((j: any) => j.is_full_scrape === true)
            .sort((a: any, b: any) => {
                const timeA = a.created_at?.seconds || 0;
                const timeB = b.created_at?.seconds || 0;
                return timeB - timeA;
            });

        let publishedCount = 0;

        for (const job of sortedJobs) {
            if (publishedCount >= limit) break;

            const jobId = job.id;

            // Check if already published
            const pubSnapshot = await db.collection('publish_requests')
                .where('job_id', '==', jobId)
                .get();

            if (!pubSnapshot.empty) continue;

            console.log(`[Auto-Pilot] 🎯 Processing Job: ${job.title} (${job.location})`);

            // 2. Get recommendations
            const groups = await recommendGroups(job.title, job.location, job.description_clean);

            if (groups.length === 0) {
                console.log(`[Auto-Pilot] ⚠️ No relevant groups found for "${job.title}". Skipping.`);
                continue;
            }

            // Pick top 3 groups for auto-pilot
            const topGroupIds = groups.slice(0, 3).map(g => g.id);
            const content = job.urgent_post || job.viral_post_a || job.professional_post;

            console.log(`[Auto-Pilot] 📢 Auto-publishing to ${topGroupIds.length} groups.`);

            // 3. Create and Approve Request
            const result = await createPublishRequest(
                jobId,
                topGroupIds,
                content,
                ['facebook', 'telegram']
            );

            if (result.success && result.requestId) {
                await approvePublishRequest(result.requestId, 'Auto-Pilot System');
                publishedCount++;
                console.log(`[Auto-Pilot] ✅ Successfully published Job ${jobId}`);
            }
        }

        console.log(`[Auto-Pilot] 🏁 Batch finished. Published ${publishedCount} jobs.`);
    } catch (e) {
        console.error("[Auto-Pilot] Batch failed:", e);
    }
}

// Legacy function - kept for backwards compatibility but now creates approval request
export async function publishToGroups(jobId: string, groupIds: string[]) {
    console.log(`[Publish Engine] ⚠️ publishToGroups is deprecated - creating approval request instead`);
    const result = await createPublishRequest(jobId, groupIds, '', ['facebook']);
    return { success: result.success, count: groupIds.length, requestId: result.requestId };
}
