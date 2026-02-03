
import { FacebookScraper } from './facebookScraper.js';
import { db } from './db.js';
import * as fs from 'fs';

async function debugPost() {
    console.log("🐞 Starting Facebook Post Debugger...");

    // Ensure screenshots dir exists
    if (!fs.existsSync('./screenshots')) {
        fs.mkdirSync('./screenshots');
    }

    try {
        // 1. Get Settings
        const settingsDoc = await db.collection('settings').doc('facebook').get();
        const settings = settingsDoc.data();

        if (!settings || !settings.page_id) {
            console.error("❌ No Facebook Page ID configured in settings.");
            return;
        }

        const pageId = settings.page_id;
        console.log(`🎯 Target Page ID: ${pageId}`);

        // 2. Initialize Scraper
        const scraper = new FacebookScraper();

        // 3. Attempt Post
        console.log("🚀 Attempting to publish test post...");
        const result = await scraper.publishPost(
            pageId,
            `Test Post from 1solution Debugger - ${new Date().toLocaleTimeString()} \n\nThis is a system test.`
        );

        if (result) {
            console.log("✅ SUCCESS: Post published successfully!");
        } else {
            console.log("❌ FAILURE: Post failed. Check screenshot in ./screenshots folder.");
        }

    } catch (e: any) {
        console.error("💥 CRITICAL ERROR:", e);
    }
}

debugPost();
