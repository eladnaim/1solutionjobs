import admin from 'firebase-admin';
import { db } from './db.js';
import { GeoEngine } from './geoEngine.js'; // Import the new Brain

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
        .slice(0, 10)
        .map(g => ({ id: g.id, name: g.name, url: g.url }));
}

export async function createPublishRequest(jobData: any, groups: RecommendedGroup[]) {
    if (groups.length === 0) {
        console.log("No relevant groups found. Skipping.");
        return;
    }

    try {
        const publishRef = await db.collection('publish_requests').add({
            job_id: jobData.id,
            job_title: cleanTitle(jobData.title),
            job_desc: jobData.description,
            job_location: jobData.location,
            job_link: jobData.application_link || jobData.link,
            generated_content: "", // Will be filled by AI later
            target_groups: groups,
            status: 'pending', // pending -> approved -> published
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[Publish Engine] Created request ${publishRef.id} with ${groups.length} groups.`);
    } catch (error) {
        console.error("Error creating publish request:", error);
    }
}

// Function to Approve and Execute Publish (Triggered by Manager via UI)
export async function approveAndPublish(requestId: string) {
    const docRef = db.collection('publish_requests').doc(requestId);
    const doc = await docRef.get();

    if (!doc.exists) throw new Error("Request not found");

    const data = doc.data();
    if (data?.status !== 'pending') throw new Error("Request already processed");

    // Update status
    await docRef.update({ status: 'approved' });

    console.log(`[Publish Engine] Approved ${requestId}. Starting distribution...`);

    // In a real scenario, here we would integrate with Facebook Graph API
    // For now, we simulate success
    data?.target_groups.forEach((group: any) => {
        console.log(`[Publish Engine] Mock Posting to FB Group: ${group.name} (${group.url})`);
    });

    await docRef.update({
        status: 'published',
        published_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

// Autopilot: Run matching and creation automatically
export async function autopublishJobs() {
    console.log("[Publish Engine] Running Autopilot...");
    // 1. Get unprocessed jobs
    // 2. Run recommendGroups
    // 3. Create publish requests
}
