/**
 * Manual Cookie Import Script
 * 
 * HOW TO USE:
 * 1. Open Chrome/Firefox and go to facebook.com
 * 2. Make sure you're logged in and viewing your business page
 * 3. Open DevTools (F12)
 * 4. Go to Console tab
 * 5. Paste this code and press Enter:
 * 
 * copy(JSON.stringify({cookies: document.cookie.split('; ').map(c => {
 *   const [name, value] = c.split('=');
 *   return {name, value, domain: '.facebook.com', path: '/', expires: Date.now()/1000 + 86400*365};
 * }), origins: []}))
 * 
 * 6. The cookies are now in your clipboard
 * 7. Paste them below in the COOKIES_JSON variable
 */

import admin from 'firebase-admin';
import { db } from './db.js';
import * as fs from 'fs';

// PASTE YOUR COOKIES HERE (replace the empty object)
const COOKIES_JSON = `PASTE_HERE`;

async function importCookies() {
    try {
        console.log("Importing Facebook cookies...");

        if (COOKIES_JSON === 'PASTE_HERE') {
            console.error("❌ Please paste your cookies first!");
            console.log("\nInstructions:");
            console.log("1. Go to facebook.com in your regular browser");
            console.log("2. Make sure you're logged in and on your business page");
            console.log("3. Open DevTools (F12) → Console");
            console.log("4. Paste this code:");
            console.log("\ncopy(JSON.stringify({cookies: document.cookie.split('; ').map(c => {const [name, value] = c.split('=');return {name, value, domain: '.facebook.com', path: '/', expires: Date.now()/1000 + 86400*365};}), origins: []}))");
            console.log("\n5. Paste the result in this file at line 23");
            console.log("6. Run this script again");
            return;
        }

        const state = JSON.parse(COOKIES_JSON);

        // Save to Firestore
        await db.collection('settings').doc('facebook_session_cookies').set({
            storageState: JSON.stringify(state),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            connected: true
        });

        // Save to local file
        fs.writeFileSync('./fb_session_local.json', JSON.stringify(state));

        console.log("✅ Cookies imported successfully!");
        console.log(`   Cookies count: ${state.cookies?.length || 0}`);
        console.log("\nYou can now publish to Facebook!");

    } catch (error) {
        console.error("❌ Error importing cookies:", error);
    }
}

importCookies();
