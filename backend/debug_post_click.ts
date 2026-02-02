
import { chromium } from 'playwright';
import { db } from './db.js';

async function debugPostClick() {
    console.log("🚀 Starting Visual Debugger...");

    // Load cookies
    const doc = await db.collection('settings').doc('facebook_session_cookies').get();
    if (!doc.exists) { console.error("❌ No cookies."); return; }
    const state = JSON.parse(doc.data()?.storageState);

    const browser = await chromium.launch({ headless: false, slowMo: 100 }); // Slow motion to see
    const context = await browser.newContext({ storageState: state, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        const pageId = '61587004355854';
        console.log(`🌐 Navigating to Page: https://www.facebook.com/${pageId}`);
        await page.goto(`https://www.facebook.com/${pageId}`, { waitUntil: 'networkidle' });

        console.log("👀 Looking for 'Switch Profile' or 'Create Post'...");

        // Highlight potential buttons for user visibility
        await page.addStyleTag({
            content: `
            div[role="button"]:has-text("Switch Now"), 
            div[role="button"]:has-text("החלף כעת"),
            div[role="button"]:has-text("Post"),
            div[role="button"]:has-text("פרסם"),
            div[role="button"]:has-text("כתבו פוסט") 
            { border: 5px solid red !important; box-shadow: 0 0 20px yellow !important; }
        `});

        // Try to click "Switch Now" if exists
        const switchBtn = page.locator('div[aria-label="Switch Now"], div[aria-label="החלף כעת"], div[role="button"]:has-text("Switch Now")').first();
        if (await switchBtn.isVisible()) {
            console.log("👉 CLICKING SWITCH BUTTON...");
            await switchBtn.click();
            await page.waitForTimeout(5000);
        } else {
            console.log("ℹ️ No Switch Button found.");
        }

        console.log("🖱️ Trying to click 'Create Post' area...");
        const postSelectors = [
            'div[role="button"]:has-text("כתבו פוסט")',
            'div[role="button"]:has-text("Write something")',
            'div[role="button"]:has-text("מה עובר לך בראש")',
            'div[aria-label="צור פוסט"]',
            '.m9osae9f.p01is63a'
        ];

        for (const sel of postSelectors) {
            if (await page.locator(sel).first().isVisible()) {
                console.log(`✅ Found selector: ${sel}`);
                await page.locator(sel).first().click();
                console.log("👉 Clicked!");
                break;
            }
        }

        console.log("⏳ Keeping browser open for 30 seconds for manual inspection...");
        await page.waitForTimeout(30000);

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await browser.close();
    }
}

debugPostClick();
