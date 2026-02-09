
import { db } from './db.js';
import * as fs from 'fs';

// Israel Cities Mapping for Auto-Tagging
const CITIES_MAPPING: Record<string, string[]> = {
    'דרום': ['באר שבע', 'אשקלון', 'אשדוד', 'נתיבות', 'שדרות', 'אילת', 'דרום', 'קרית גת', 'דימונה', 'ערד', 'אופקים'],
    'צפון': ['חיפה', 'קריות', 'נהריה', 'עכו', 'צפון', 'טבריה', 'כרמיאל', 'גליל', 'עפולה', 'נצרת', 'קרית שמונה', 'צפת', 'מגדל העמק'],
    'מרכז': ['תל אביב', 'רמת גן', 'גבעתיים', 'פתח תקווה', 'ראשון לציון', 'חולון', 'בת ים', 'מרכז', 'בני ברק', 'אלעד', 'אור יהודה'],
    'שרון': ['רעננה', 'כפר סבא', 'הרצליה', 'השרון', 'נתניה', 'הוד השרון', 'חדרה', 'חריש', 'רמת השרון'],
    'ירושלים': ['ירושלים', 'מבשרת', 'מעלה אדומים', 'בית שמש'],
    'שפלה': ['רחובות', 'נס ציונה', 'לוד', 'רמלה', 'גדרה', 'יבנה', 'מודיעין']
};

export async function syncFacebookGroups() {
    console.log("🚀 Starting Facebook Groups Sync...");
    const { chromium } = await import('playwright');

    // Load cookies
    const doc = await db.collection('settings').doc('facebook_session_cookies').get();
    if (!doc.exists) throw new Error("No Facebook session found. Please login first.");
    const state = JSON.parse(doc.data()?.storageState);

    const browser = await chromium.launch({ headless: false }); // Visible for user confidence
    const context = await browser.newContext({ storageState: state, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        console.log("🌐 Navigating to My Groups...");
        await page.goto('https://www.facebook.com/groups/feed/', { waitUntil: 'networkidle' });

        // Wait for sidebar or list to load
        await page.waitForTimeout(5000);

        // Extract groups from the sidebar list (usually on the left)
        // Selectors might vary, we look for links containing "/groups/" that are NOT the feed itself
        // A better URL is usually the "Joins" page or just extracting from the sidebar menu

        // Let's try to extract from the sidebar
        const groupLinks = await page.$$eval('a[href*="/groups/"]', (anchors) => {
            return anchors.map(a => ({
                text: a.innerText,
                href: a.href
            })).filter(g => g.text.length > 3 && !g.href.includes('/feed/') && !g.href.includes('/create/'));
        });

        console.log(`🔍 Found ${groupLinks.length} potential groups. Processing...`);

        let addedCount = 0;
        const batch = db.batch();

        for (const g of groupLinks) {
            // Clean URL
            // Groups url format: https://www.facebook.com/groups/123456/ or /groups/name/
            const urlParts = g.href.split('?')[0]; // Remove query params
            if (urlParts.split('/').length < 5) continue; // Basic validation

            // Detect Location
            const tags: string[] = [];
            let region = 'general';

            for (const [reg, cities] of Object.entries(CITIES_MAPPING)) {
                for (const city of cities) {
                    if (g.text.includes(city)) {
                        tags.push(city);
                        region = reg;
                    }
                }
            }
            if (tags.length > 0) tags.push(region);

            // Create ID from URL (last part)
            const groupId = urlParts.replace(/\/$/, '').split('/').pop() || '';
            if (!groupId) continue;

            const groupRef = db.collection('facebook_groups').doc(groupId);
            batch.set(groupRef, {
                name: g.text,
                url: urlParts,
                location_tags: tags,
                region: region,
                last_synced: new Date(),
                is_member: true
            }, { merge: true });

            addedCount++;
        }

        await batch.commit();
        console.log(`✅ Successfully synced ${addedCount} groups to database!`);
        return { success: true, count: addedCount };

    } catch (e) {
        console.error("❌ Sync Error:", e);
        return { success: false, error: e };
    } finally {
        await browser.close();
    }
}

// Allow running directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncFacebookGroups();
}
