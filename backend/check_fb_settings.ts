import { db } from './db.js';

import { chromium } from 'playwright';

async function checkSettings() {
    try {
        const doc = await db.collection('settings').doc('facebook').get();
        console.log("Current Facebook Settings in DB:");
        console.log(JSON.stringify(doc.data(), null, 2));

        const pageId = doc.data()?.page_id;
        if (pageId) {
            console.log("\nChecking Page Title via Web...");
            const browser = await chromium.launch();
            const page = await browser.newPage();
            await page.goto(`https://www.facebook.com/${pageId}`);
            const title = await page.title();
            console.log(`Actual Page Title: ${title}`);
            await browser.close();
        }

    } catch (e) {
        console.error(e);
    }
}

checkSettings();
