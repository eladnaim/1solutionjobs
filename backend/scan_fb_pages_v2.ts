
import { chromium } from 'playwright';
import * as fs from 'fs';
import admin from 'firebase-admin';
import { db } from './db.js';

// Init Firebase (if not already init, but this script runs standalone so we need init)
// Usually tsx handles it if imported from elsewhere, but better safe.
if (admin.apps.length === 0) {
    // Assuming service account is set via ENV or default
    try {
        const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        admin.initializeApp();
    }
}

async function listPages() {
    console.log("🔍 Scanning Facebook Pages...");

    // Launch browser separately as we can't access private methods easily
    const browser = await chromium.launch({ headless: true }); // Headless true for speed, or false for debug
    const context = await browser.newContext();

    // Load cookies if available locally or from DB
    try {
        let authState: any = null;
        if (fs.existsSync('./fb_session_local.json')) {
            authState = JSON.parse(fs.readFileSync('./fb_session_local.json', 'utf8'));
        } else {
            const doc = await db.collection('settings').doc('facebook_session_cookies').get();
            if (doc.exists && doc.data()?.storageState) {
                authState = JSON.parse(doc.data()?.storageState);
            }
        }

        if (authState) {
            await context.addCookies(authState.cookies || []);
            // Also set other storage if needed
        } else {
            console.log("No saved cookies found. You might see a login page.");
        }
    } catch (e) {
        console.error("Error loading cookies:", e);
    }

    const page = await context.newPage();

    try {
        // Go to "All Pages" view
        console.log("Navigating to Facebook Pages...");
        await page.goto('https://www.facebook.com/pages/?category=your_pages', { waitUntil: 'domcontentloaded' });

        // Wait for list
        await page.waitForTimeout(5000);

        // Extract Links
        const pages = await page.$$eval('a', (anchors) => {
            return anchors
                .filter(a => a.href.includes('facebook.com') && !a.href.includes('checkpoint'))
                .map(a => ({ text: a.innerText, href: a.href }));
        });

        console.log("--- FOUND LINKS ---");
        const uniquePages = new Map();
        pages.forEach(p => {
            if (p.text && p.text.length > 2 && !uniquePages.has(p.href)) {
                uniquePages.set(p.href, p.text);
            }
        });

        for (const [href, text] of uniquePages) {
            console.log(`Page: ${text} | Link: ${href}`);
        }

        // Screenshot for verification
        await page.screenshot({ path: 'pages_scan.png' });
        console.log("Screenshot saved to pages_scan.png");

    } catch (e: any) {
        console.error("Error scanning pages:", e);
    } finally {
        await browser.close();
    }
}

listPages();
