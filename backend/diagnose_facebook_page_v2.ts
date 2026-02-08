import { FacebookScraper } from './facebookScraper.js';
import admin from 'firebase-admin';
import { db } from './db.js';

// Initialize Firebase (if not already)
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function diagnosePagePublishing() {
    console.log("🛠️ Starting Facebook Page Post Diagnostic V2...");

    const settingsDoc = await db.collection('settings').doc('facebook').get();
    const pageId = settingsDoc.data()?.page_id;

    if (!pageId) {
        console.error("❌ No Facebook Page ID found in settings!");
        return;
    }

    console.log(`🎯 Target Page ID: ${pageId}`);

    const scraper = new FacebookScraper();

    // Override log function to print to stdout immediately
    const originalLog = console.log;
    console.log = (...args) => {
        originalLog(...args);
    };

    try {
        console.log(`[Diagnostic] Attempting to publish test post to ${pageId}...`);

        // Use a unique test message
        const testMessage = `Test Post Diagnostic ${new Date().toISOString()} - Please ignore.`;

        await scraper.publishPost(pageId, testMessage);

        console.log("[Diagnostic] Process finished. Check screenshots in backend/screenshots/");
    } catch (error) {
        console.error("[Diagnostic] Fatal Error:", error);
    }
}

diagnosePagePublishing();
