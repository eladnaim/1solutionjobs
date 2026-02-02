import { chromium } from 'playwright';
import * as fs from 'fs';
import * as readline from 'readline';
import admin from 'firebase-admin';
import { db } from './db.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function runLoginHelper() {
    console.log("\n=================================================");
    console.log("   FACEBOOK LOGIN HELPER - ONE SOLUTION");
    console.log("=================================================\n");

    console.log("🚀 Launching browser...");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("🌐 Navigating to Facebook...");
    await page.goto('https://www.facebook.com');

    console.log("\n⚠️  ACTION REQUIRED IN BROWSER ⚠️");
    console.log("1. Log in to your account.");
    console.log("2. IMPORTANT: Switch to your Business Page Profile (1solution).");
    console.log("3. Verify you can post on your page.");
    console.log("\n⏳ Waiting for you to finish...");

    await new Promise<void>(resolve => {
        rl.question('\n✅ WHEN YOU ARE DONE AND ON YOUR PAGE, PRESS [ENTER] HERE TO SAVE... ', () => {
            resolve();
        });
    });

    console.log("\n📥 capturing session...");

    // 1. Get State
    const state = await context.storageState();

    // 2. Checks
    const cookies = state.cookies || [];
    console.log(`🍪 Found ${cookies.length} cookies.`);

    const pageIdCookie = cookies.find(c => c.name.includes('c_user') || c.name.includes('i_user'));
    console.log(`👤 Detected User ID in cookies: ${pageIdCookie?.value || 'unknown'}`);

    // 3. Save to Local File
    fs.writeFileSync('./fb_session_local.json', JSON.stringify(state, null, 2));
    console.log("💾 Saved locally to fb_session_local.json");

    // 4. Save to Firestore
    try {
        console.log("☁️  Uploading to Firestore...");
        await db.collection('settings').doc('facebook_session_cookies').set({
            storageState: JSON.stringify(state),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            connected: true,
            source: 'login_helper'
        });
        console.log("✅ Saved to Firestore successfully!");
    } catch (e) {
        console.error("❌ Firestore Error:", e);
    }

    console.log("\n🎉 SUCCESS! You can now run the publishing flow.");
    console.log("Closing browser in 3 seconds...");

    setTimeout(async () => {
        await browser.close();
        rl.close();
        process.exit(0);
    }, 3000);
}

runLoginHelper().catch(e => console.error(e));
