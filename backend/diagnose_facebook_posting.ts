
import { FacebookScraper } from './facebookScraper.js';
import admin from 'firebase-admin';

// Init Firebase
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Simple test to isolate posting logic
async function runDiagnostic() {
    console.log("🛠️ Starting Facebook Page Post Diagnostic...");
    const scraper = new FacebookScraper();

    // Use a hardcoded Page ID if known, or let it detect from session
    // For diagn ostics, we'll try to fetch settings first
    const settings = await admin.firestore().collection('settings').doc('facebook').get();
    const pageId = settings.data()?.page_id;

    if (!pageId) {
        console.error("❌ No Page ID configured in settings/facebook. Please run scan_fb_pages.ts first.");
        return;
    }

    console.log(`🎯 Target Page ID: ${pageId}`);

    try {
        const result = await scraper.publishPost(pageId, "בדיקת מערכת 1solution - דיאגנוסטיקה (נא להתעלם)");
        if (result) {
            console.log("✅ Diagnostic Result: SUCCESS");
        } else {
            console.error("❌ Diagnostic Result: FAILED");
        }
    } catch (e) {
        console.error("💥 Diagnostic Crashed:", e);
    } finally {
        await scraper.cleanup();
        process.exit(0);
    }
}

runDiagnostic();
