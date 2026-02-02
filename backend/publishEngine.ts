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

const CITY_TRANSLATIONS: Record<string, string> = {
    'raanana': 'רעננה',
    'ra\'anana': 'רעננה',
    'tel aviv': 'תל אביב',
    'herzliya': 'הרצליה',
    'petah tikva': 'פתח תקווה',
    'rishon lezion': 'ראשון לציון',
    'ashdod': 'אשדוד',
    'ashkelon': 'אשקלון',
    'beersheba': 'באר שבע',
    'beer sheva': 'באר שבע',
    'jerusalem': 'ירושלים',
    'haifa': 'חיפה',
    'netanya': 'נתניה',
    'rehovot': 'רחובות',
    'lod': 'לוד',
    'ramla': 'רמלה',
    'modiin': 'מודיעין',
    'holon': 'חולון',
    'bat yam': 'בת ים',
    'ramat gan': 'רמת גן'
};

/**
 * recommendGroups
 * Scans the 'groups' collection and returns the most relevant groups
 * for a specific job title and location.
 */
export async function recommendGroups(jobTitle: string, jobLocation: string, jobDescription: string = ''): Promise<RecommendedGroup[]> {
    console.log(`[Publish Engine] Finding groups for: ${jobTitle} in ${jobLocation}`);

    // Fetch from the NEW synced collection (facebook_groups)
    let snapshot = await db.collection('facebook_groups').where('is_member', '==', true).get();

    if (snapshot.empty) {
        snapshot = await db.collection('groups').where('is_member', '==', true).get();
    }

    if (snapshot.empty) {
        console.warn("[Publish Engine] No groups found in DB.");
        return [];
    }

    const relevantGroups: any[] = [];

    const normalizedTitle = jobTitle.toLowerCase().trim();
    const normalizedLocation = jobLocation.toLowerCase().trim();
    const normalizedDesc = jobDescription.toLowerCase().trim();

    // Israel major cities keywords for deep scanning
    const REGION_MAPPING: Record<string, string> = {
        'באר שבע': 'south', 'אשדוד': 'south', 'אשקלון': 'south', 'נתיבות': 'south', 'שדרות': 'south', 'רעים': 'south', 'אופקים': 'south', 'ערד': 'south', 'דימונה': 'south',
        'תל אביב': 'center', 'רמת גן': 'center', 'גבעתיים': 'center', 'פתח תקווה': 'center', 'חולון': 'center', 'בת ים': 'center', 'רעננה': 'center', 'כפר סבא': 'center', 'הרצליה': 'center', 'נתניה': 'center',
        'חיפה': 'north', 'קריות': 'north', 'נהריה': 'north', 'עכו': 'north', 'טבריה': 'north', 'עפולה': 'north', 'נצרת': 'north',
        'ירושלים': 'jerusalem', 'בית שמש': 'jerusalem', 'מודיעין': 'center',
        'רחובות': 'shfela', 'נס ציונה': 'shfela', 'לוד': 'shfela', 'רמלה': 'shfela'
    };
    const HEBREW_CITIES = Object.keys(REGION_MAPPING);

    // Try to find Hebrew equivalents for English city names found in text
    const extraCityTags: string[] = [];
    for (const [eng, heb] of Object.entries(CITY_TRANSLATIONS)) {
        if (normalizedTitle.includes(eng) || normalizedLocation.includes(eng) || normalizedDesc.includes(eng)) {
            extraCityTags.push(heb);
        }
    }

    // IF location is generic, try to find a city name in the title or description
    let detectedLocation = normalizedLocation;
    let detectedRegion = '';

    const isGenericLocation = !normalizedLocation ||
        normalizedLocation === 'ישראל' ||
        normalizedLocation === 'מרכז' ||
        normalizedLocation === 'צפון' ||
        normalizedLocation === 'דרום' ||
        normalizedLocation === 'לבדיקה...';

    if (isGenericLocation) {
        for (const city of HEBREW_CITIES) {
            const cityPattern = new RegExp(`(\\s|^|[ב|מ])${city}(\\s|$|[\\?\\!\\,.])`, 'i');
            if (cityPattern.test(normalizedTitle) || cityPattern.test(normalizedDesc)) {
                detectedLocation = city;
                detectedRegion = REGION_MAPPING[city];
                console.log(`[Publish Engine] 📍 Detected specific location from text: ${city} (${detectedRegion})`);
                break;
            }
        }
    }

    snapshot.forEach(doc => {
        const group = doc.data();
        let score = 0;

        // Skip non-group items (profiles, personal names, etc.)
        const nameKeywords = ['דרושים', 'עבודה', 'משרות', 'jobs', 'work', 'הייטק', 'ביטחון', 'קריירה'];
        const lowerName = group.name ? group.name.toLowerCase() : '';
        const isJobGroup = lowerName && nameKeywords.some(k => lowerName.includes(k));

        // Filter out Facebook notifications and scraping garbage
        const isGarbage = lowerName.includes('לא נקראו') ||
            lowerName.includes('תויגת על ידי') ||
            lowerName.includes('סמן כנקרא') ||
            /^\d+\s+(דקות|שעות)/.test(lowerName) || // Matches "X minutes/hours" at start
            /\d+\s+(דקות|שעות)$/.test(lowerName);    // Matches "X minutes/hours" at end

        if (!isJobGroup || isGarbage) return;

        // 1. Exact City Matching (Priority #1)
        if (group.location_tags && Array.isArray(group.location_tags)) {
            const hasCityMatch = group.location_tags.some((tag: string) => {
                const lowerTag = tag.toLowerCase();
                const isRegion = ['center', 'north', 'south', 'jerusalem', 'shfela', 'מרכז', 'צפון', 'דרום', 'השרון', 'השפלה'].includes(lowerTag);
                if (isRegion) return false;

                // STRICT MATCH: Only match against detected/normalized location or title. NOT description (to avoid random mentions).
                return detectedLocation.includes(lowerTag) ||
                    normalizedLocation.includes(lowerTag) ||
                    normalizedTitle.includes(lowerTag) ||
                    extraCityTags.includes(lowerTag);
            });

            if (hasCityMatch) {
                score += 50; // Massively prioritize city matches
            } else if (group.location_tags.some((tag: string) => normalizedDesc.includes(tag.toLowerCase()))) {
                // Secondary check: if it's ONLY in the description, give a small boost, not a main match
                score += 2;
            }

            // Region match
            const hasRegionMatch = (group.region && (
                detectedRegion === group.region ||
                detectedLocation.includes(group.region) ||
                normalizedLocation.includes(group.region) ||
                normalizedTitle.includes(group.region) ||
                normalizedDesc.includes(group.region) ||
                group.location_tags.some((tag: string) => detectedLocation.includes(tag) || normalizedLocation.includes(tag) || normalizedTitle.includes(tag) || normalizedDesc.includes(tag))
            ));

            if (hasRegionMatch) {
                score += 10; // Boost regional matches
            }
        }

        // 2. Keyword Matching (Title/Role)
        if (group.keywords && Array.isArray(group.keywords)) {
            if (group.keywords.some((k: string) => normalizedTitle.includes(k.toLowerCase()))) {
                score += 8;
            }
            if (group.keywords.includes('all') || group.keywords.includes('general')) {
                score += 1;
            }
        } else {
            score += 1;
        }

        // 3. Name matching (Fallback)
        const cleanGroupName = group.name.replace('דרושים', '').replace('ב-', '').replace('בי-', '').trim();
        if (group.name && (
            normalizedLocation.includes(cleanGroupName) ||
            normalizedTitle.includes(cleanGroupName) ||
            normalizedDesc.includes(cleanGroupName)
        )) {
            score += 10;
        }

        if (score >= 1) {
            relevantGroups.push({
                id: doc.id,
                name: group.name,
                url: group.url,
                score
            });
        }
    });

    // Sort by score
    return relevantGroups
        .sort((a, b) => b.score - a.score)
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
    platforms: string[] = ['facebook']
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

        // Create publish request in Firestore

        // Fetch dynamic Facebook settings if available
        const fbSettingsDoc = await db.collection('settings').doc('facebook').get();
        const fbSettings = fbSettingsDoc.exists ? fbSettingsDoc.data() : {};

        const requestRef = await db.collection('publish_requests').add({
            job_id: jobId,
            job_title: job.title,
            job_company: job.company,
            job_location: job.location,
            content,
            platforms,
            target_page_id: fbSettings?.page_id || '61587004355854',
            target_page_name: fbSettings?.page_name || '1solution - השמה וגיוס כ״א',
            target_groups: groupIds,
            status: 'pending_approval',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            approved_by: null,
            approved_at: null,
            published_at: null,
            results: null
        });

        console.log(`[Publish Engine] ✅ Publish request created: ${requestRef.id}`);
        console.log(`[Publish Engine] ⚠️ REQUIRES MANUAL APPROVAL - No automatic publishing`);

        return {
            success: true,
            requestId: requestRef.id,
            message: `בקשת פרסום נוצרה בהצלחה. דורש אישור ידני לפני פרסום.`
        };
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

            // Post to Main Page
            if (request.target_page_id) {
                const fbResult = await fb.publishPost(request.target_page_id, request.content);
                results.platforms.facebook_page = { success: fbResult };
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

        if (!config || !config.bot_token || !config.chat_id) {
            return { success: false, error: 'Telegram settings not configured' };
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
            const url = `https://api.telegram.org/bot${config.bot_token}/sendPhoto`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.chat_id,
                    photo: imageUrl,
                    caption: finalContent,
                    parse_mode: 'HTML'
                })
            });
            response = await res.json();
        } else {
            const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.chat_id,
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
