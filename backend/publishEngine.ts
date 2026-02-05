import admin from 'firebase-admin';
import { db } from './db.js';
import { GeoEngine } from './geoEngine.js'; // Import the new Brain
import { SocialMediaPublisher } from './socialMediaPublisher.js';

// Global instance to reuse config loading
const publisher = new SocialMediaPublisher();

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

export async function recommendGroups(jobTitle: string, jobLocation: string, jobDescription: string = ''): Promise<RecommendedGroup[]> {
    console.log(`[Publish Engine] 🧠 Smart matching 2.0 (GeoEngine) for: ${jobTitle} in ${jobLocation}`);

    let snapshot = await db.collection('facebook_groups').where('is_member', '==', true).get();
    if (snapshot.empty) snapshot = await db.collection('groups').where('is_member', '==', true).get();

    if (snapshot.empty) return [];

    const normalizedTitle = jobTitle.toLowerCase();
    const normalizedDesc = jobDescription.toLowerCase();

    const results: any[] = [];

    snapshot.docs.forEach(doc => {
        const group = doc.data();
        const groupName = (group.name || '');
        const groupTags = (group.location_tags || []);
        const groupRegion = (group.region || 'general');

        // --- RULE 1: GEO ENGINE SCORING (The Core Logic) ---
        let score = GeoEngine.getMatchScore(jobLocation, groupName, groupTags, groupRegion);

        // Boost for EXACT city match in group name (Critical for precision)
        // If job is "Tel Aviv" and group name has "Tel Aviv", give massive boost
        if (jobLocation && groupName.includes(jobLocation)) {
            score += 200;
        }

        // Only run industry matching if Geo didn't kill it (score > -500)
        if (score > -500) {
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
                const hasJobKeyword = keywords.some(k => normalizedTitle.includes(k.toLowerCase()) || normalizedDesc.includes(k.toLowerCase()));
                const hasGroupKeyword = keywords.some(k => groupName.toLowerCase().includes(k.toLowerCase()));

                if (hasJobKeyword && hasGroupKeyword) {
                    score += 30;
                }
            }

            if (groupName.includes('דרושים') || groupName.includes('עבודה')) score += 5;
        }

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
        .slice(0, 3) // LIMIT TO TOP 3 GROUPS ONLY (Facebook Limit)
        .map(g => ({ id: g.id, name: g.name, url: g.url }));
}

export async function createPublishRequest(
    jobIdOrData: any,
    groups: RecommendedGroup[],
    content: string = '',
    platforms: string[] = ['facebook', 'telegram'],
    postToPage: boolean = true
): Promise<{ success: boolean, requestId?: string, message?: string }> {

    // 1. Resolve Job Data
    let jobData: any = jobIdOrData;
    let jobId: string;

    if (typeof jobIdOrData === 'string') {
        jobId = jobIdOrData;
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        if (!jobDoc.exists) {
            return { success: false, message: "Job not found in DB" };
        }
        jobData = { id: jobDoc.id, ...jobDoc.data() };
    } else {
        jobId = jobIdOrData.id;
    }

    if (!jobId || !jobData) {
        return { success: false, message: "Invalid Job Data" };
    }

    if (groups.length === 0) {
        console.log("No relevant groups found. Skipping.");
        return { success: false, message: "No relevant groups found" };
    }

    try {
        const publishRef = await db.collection('publish_requests').add({
            job_id: jobId,
            job_title: cleanTitle(jobData.title),
            job_desc: jobData.description || jobData.description_clean,
            job_location: jobData.location,
            job_link: jobData.application_link || jobData.link || '',
            generated_content: content || "",
            target_platforms: platforms,
            post_to_page: postToPage,
            target_groups: groups,
            status: 'pending', // pending -> approved -> published
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[Publish Engine] Created request ${publishRef.id} with ${groups.length} groups.`);
        return { success: true, requestId: publishRef.id };
    } catch (error: any) {
        console.error("Error creating publish request:", error);
        return { success: false, message: error.message };
    }
}

// Function to Approve and Execute Publish (Triggered by Manager via UI)
export async function approvePublishRequest(requestId: string, approvedBy: string = 'System') {
    const docRef = db.collection('publish_requests').doc(requestId);
    const doc = await docRef.get();

    if (!doc.exists) throw new Error("Request not found");

    const data = doc.data();
    if (data?.status !== 'pending') throw new Error("Request already processed");

    // Update status to approved locally first
    await docRef.update({
        status: 'approved',
        approved_by: approvedBy
    });

    console.log(`[Publish Engine] Approved ${requestId} by ${approvedBy}. Starting distribution...`);

    // --- REAL PUBLISHING EXECUTION ---
    try {
        // This will send to Facebook (Page), Telegram, etc. using the unified publisher
        const results = await publisher.approveAndPublish(requestId, approvedBy);

        console.log(`[Publish Engine] ✅ Distribution Complete. Results:`, results);

        // Also Mock post to groups (as we don't have Graph API for Groups usually, only Page)
        // Groups posting requires Puppeteer or specific Group Apps. 
        // For now, we keep the log for groups, but the Page/Telegram happening via Publisher is real.
        if (data?.target_groups) {
            data.target_groups.forEach((group: any) => {
                console.log(`[Publish Engine] (Pending Feature) Auto-Posting to FB Group: ${group.name}`);
            });
        }

    } catch (e: any) {
        console.error(`[Publish Engine] ❌ Distribution Failed Partial/Full:`, e);
        // We don't throw here to avoid crashing the server response, 
        // as the status update happened. We log the error in the doc.
        await docRef.update({
            publishing_error: e.message
        });
    }
}

// Autopilot: Run matching and creation automatically
export async function runAutoPilotBatch(limit: number = 5) {
    console.log(`[Publish Engine] Running Autopilot (Limit: ${limit})...`);
    // 1. Get unprocessed jobs
    // 2. Run recommendGroups
    // 3. Create publish requests
}
