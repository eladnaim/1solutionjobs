
import { db } from './db.js';

async function resetLocations() {
    console.log("🧹 Resetting locations for re-scan...");
    try {
        const snapshot = await db.collection('jobs').where('location', '==', 'ישראל').get();
        console.log(`🔍 Found ${snapshot.size} jobs with generic 'ישראל' location.`);

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                is_full_scrape: false,
                location: 'לבדיקה...' // Set to something else to mark for update
            });
        });

        await batch.commit();
        console.log(`✅ Success! ${snapshot.size} jobs marked for full re-scrape.`);
    } catch (e) {
        console.error("❌ Error during reset:", e);
    }
}

async function testRecommendations(title: string, location: string, description: string = '') {
    console.log(`🧪 Testing recommendations for: "${title}" in "${location}"`);
    const { recommendGroups } = await import('./publishEngine.js');
    const results = await recommendGroups(title, location, description);
    console.log('Top Recommended Groups:');
    results.forEach((g, i) => console.log(`${i + 1}. ${g.name} (${g.url})`));
}

async function listGroups() {
    console.log("📋 Listing all synced Facebook groups...");
    const snapshot = await db.collection('facebook_groups').get();
    snapshot.forEach(doc => {
        const g = doc.data();
        console.log(`- Name: ${g.name} | Tags: ${g.location_tags} | Region: ${g.region}`);
    });
}

async function patchGroups() {
    console.log("🛠 Patching groups with location tags...");
    const CITIES_MAPPING: Record<string, string[]> = {
        'south': ['באר שבע', 'אשדוד', 'אשקלון', 'נתיבות', 'שדרות', 'אילת', 'דרום', 'קרית גת', 'דימונה', 'רעים', 'אופקים', 'ערד', 'מצפה רמון'],
        'north': ['חיפה', 'קריות', 'נהריה', 'עכו', 'צפון', 'טבריה', 'כרמיאל', 'גליל', 'עפולה', 'נצרת', 'מגדל העמק', 'בית שאן'],
        'center': ['תל אביב', 'רמת גן', 'גבעתיים', 'פתח תקווה', 'ראשון לציון', 'חולון', 'בת ים', 'מרכז', 'רעננה', 'כפר סבא', 'הרצליה', 'השרון', 'נתניה', 'הוד השרון', 'מודיעין', 'בני ברק', 'גבעת שמואל', 'קרית אונו', 'אור יהודה', 'יהוד', 'שוהם'],
        'jerusalem': ['ירושלים', 'מבשרת', 'מעלה אדומים', 'בית שמש', 'מעלה אדומים', 'מבשרת ציון'],
        'shfela': ['רחובות', 'נס ציונה', 'לוד', 'רמלה', 'גדרה', 'יבנה', 'קרית עקרון', 'מזכרת בתיה']
    };

    const snapshot = await db.collection('facebook_groups').get();
    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const group = doc.data();
        const tags: string[] = [];
        let region = group.region || 'general';

        for (const [reg, cities] of Object.entries(CITIES_MAPPING)) {
            for (const city of cities) {
                if (group.name && group.name.includes(city)) {
                    tags.push(city);
                    region = reg;
                }
            }
        }
        if (tags.length > 0) tags.push(region);

        batch.update(doc.ref, {
            location_tags: tags,
            region: region
        });
        count++;
        if (count % 50 === 0) console.log(`Processed ${count} groups...`);
    });

    await batch.commit();
    console.log(`✅ Finished patching ${count} groups.`);
}

const action = process.argv[2];
if (action === 'reset-locations') {
    resetLocations();
} else if (action === 'test-rec') {
    testRecommendations(process.argv[3] || '', process.argv[4] || '', process.argv[5] || '');
} else if (action === 'list-groups') {
    listGroups();
} else if (action === 'patch-groups') {
    patchGroups();
} else {
    console.log("Usage: npx tsx backend/maintenance.ts reset-locations | test-rec \"title\" \"location\" | list-groups | patch-groups");
}
