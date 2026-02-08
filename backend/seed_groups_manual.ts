
import admin from 'firebase-admin';
import { db } from './db.js';

const groups = [
    // --- PETAH TIKVA ---
    {
        name: "דרושים בפתח תקווה והסביבה",
        url: "https://www.facebook.com/groups/petah.tikva.jobs",
        is_member: true,
        region: "center",
        location_tags: ["פתח תקווה", "פ״ת", "המרכז", "גבעת שמואל"]
    },
    {
        name: "משרות שוות בפתח תקווה",
        url: "https://www.facebook.com/groups/pt.jobs.hot",
        is_member: true,
        region: "center",
        location_tags: ["פתח תקווה", "פ״ת"]
    },
    {
        name: "פתח תקווה שלי - דרושים",
        url: "https://www.facebook.com/groups/mishpaha.pt",
        is_member: true,
        region: "center",
        location_tags: ["פתח תקווה", "קריית אריה", "קריית מטלון"]
    },

    // --- TEL AVIV / CENTER ---
    {
        name: "דרושים תל אביב והמרכז",
        url: "https://www.facebook.com/groups/tlv.jobs",
        is_member: true, // Must clarify user needs to be a member
        region: "center",
        location_tags: ["תל אביב", "רמת גן", "גבעתיים", "המרכז", "חולון"]
    },
    {
        name: "משרות הייטק ושיווק במרכז",
        url: "https://www.facebook.com/groups/hitech.center",
        is_member: true,
        region: "center",
        location_tags: ["תל אביב", "הרצליה", "רמת החייל"]
    },

    // --- SHARON ---
    {
        name: "דרושים בשרון והסביבה",
        url: "https://www.facebook.com/groups/sharon.jobs",
        is_member: true,
        region: "sharon",
        location_tags: ["רעננה", "כפר סבא", "הרצליה", "הוד השרון", "נתניה"]
    },
    {
        name: "משרות נתניה והסביבה",
        url: "https://www.facebook.com/groups/netanya.jobs",
        is_member: true,
        region: "sharon",
        location_tags: ["נתניה", "פג", "חדרה", "עמק חפר"]
    },

    // --- SHEFELA / SOUTH ---
    {
        name: "דרושים ראשון לציון והסביבה",
        url: "https://www.facebook.com/groups/rishon.jobs",
        is_member: true,
        region: "shfela",
        location_tags: ["ראשון לציון", "נס ציונה", "רחובות", "יבנה"]
    },
    {
        name: "דרושים אשדוד אשקלון והסביבה",
        url: "https://www.facebook.com/groups/ashdod.jobs",
        is_member: true,
        region: "south",
        location_tags: ["אשדוד", "אשקלון", "הדרום"]
    },

    // --- NORTH ---
    {
        name: "דרושים חיפה והקריות",
        url: "https://www.facebook.com/groups/haifa.jobs",
        is_member: true,
        region: "north",
        location_tags: ["חיפה", "קריות", "נשר", "עכו", "נהריה"]
    }
];

async function seedGroups() {
    console.log("🌱 Seeding Job Groups...");
    const batch = db.batch();

    for (const group of groups) {
        // Use URL hash or name as ID to prevent duplicates
        const id = group.url.split('groups/')[1]?.replace('/', '') || group.name.replace(/\s+/g, '_');
        const docRef = db.collection('facebook_groups').doc(id);

        batch.set(docRef, {
            ...group,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    await batch.commit();
    console.log(`✅ Successfully added/updated ${groups.length} groups.`);
}

seedGroups();
