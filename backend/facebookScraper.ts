import { chromium, Browser, BrowserContext } from 'playwright';
import admin from 'firebase-admin';
import { db } from './db.js';
import * as fs from 'fs';

export class FacebookScraper {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private storageRef = db.collection('settings').doc('facebook_session_cookies');
    public static isRunning = false;

    async runInteractiveLogin(): Promise<boolean> {
        console.log("[Facebook Engine] Starting Interactive Login Flow...");

        try {
            this.browser = await chromium.launch({ headless: false });
            this.context = await this.browser.newContext();
            const page = await this.context.newPage();

            // Navigate to Facebook
            await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });

            console.log("[Facebook Engine] ⚠️ Please log in to your Facebook account and select your Page profile.");
            console.log("[Facebook Engine] ⚠️ Close the browser window ONLY AFTER you are on the Page profile view.");

            // Wait for user to navigate to a page or just be logged in
            // We'll wait until they are on a page profile or the user closes the window manually
            return new Promise((resolve, reject) => {
                const interval = setInterval(async () => {
                    try {
                        if (page.isClosed()) {
                            clearInterval(interval);
                            console.log("[Facebook Engine] Browser closed. Capturing state...");

                            // Capture State
                            const state = await this.context!.storageState();

                            // Save to Firestore
                            await this.storageRef.set({
                                storageState: JSON.stringify(state),
                                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                                connected: true
                            });

                            // Sync to local
                            fs.writeFileSync('./fb_session_local.json', JSON.stringify(state));

                            console.log("[Facebook Engine] ✅ Session Securely Stored.");
                            resolve(true);
                            return;
                        }

                        const url = page.url();

                        // Try to detect Page ID and Name from URL or content
                        // URL usually contains the page name or business_id
                        if (url.includes('facebook.com/') && !url.includes('login') && !url.includes('checkpoint')) {
                            const pageDoc = await page.evaluate(() => {
                                // Try to find page name and ID from meta tags or title
                                const title = document.title;
                                const fbId = (document.querySelector('meta[property="al:android:url"]') as any)?.content?.split('page/')[1] ||
                                    (document.querySelector('meta[property="al:ios:url"]') as any)?.content?.split('page/')[1];

                                return { title, fbId };
                            });

                            if (pageDoc.fbId) {
                                console.log(`[Facebook Engine] ✅ Detected Page ID: ${pageDoc.fbId}`);
                                // Save Page Settings Automatically
                                await db.collection('settings').doc('facebook').set({
                                    page_id: pageDoc.fbId,
                                    page_name: pageDoc.title.replace(' | Facebook', ''),
                                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                                }, { merge: true });
                            }
                        }
                    } catch (e) {
                        // Page might be closed during evaluation
                        if (page.isClosed()) {
                            clearInterval(interval);
                            console.log("[Facebook Engine] Browser closed during check. Attempting to save...");

                            try {
                                const state = await this.context!.storageState();
                                await this.storageRef.set({
                                    storageState: JSON.stringify(state),
                                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                                    connected: true
                                });
                                fs.writeFileSync('./fb_session_local.json', JSON.stringify(state));
                                console.log("[Facebook Engine] ✅ Session Securely Stored.");
                            } catch (saveError) {
                                console.error("[Facebook Engine] Failed to save session:", saveError);
                            }

                            resolve(true);
                        }
                    }
                }, 3000);
            });

        } catch (error) {
            console.error("[Facebook Engine] Login Flow Error:", error);
            throw error;
        }
    }

    async publishPost(targetId: string, message: string, imageUrl?: string): Promise<boolean> {
        console.log(`[Facebook Engine] 🚀 Publishing to: ${targetId}`);

        try {
            // Load state from Firestore or Local
            const doc = await this.storageRef.get();
            if (!doc.exists) throw new Error("No session cookies found. Please log in first.");

            const stateData = doc.data();
            if (!stateData?.storageState) throw new Error("Session state is empty.");

            const state = JSON.parse(stateData.storageState);

            this.browser = await chromium.launch({ headless: false }); // Visible for debugging
            this.context = await this.browser.newContext({
                storageState: state,
                viewport: { width: 1280, height: 800 }
            });
            const page = await this.context.newPage();

            // 1. First go to the Page URL to ensure/force Profile Switch
            const pageUrl = targetId.startsWith('http') ? targetId : `https://www.facebook.com/${targetId}`;
            await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });

            // 🟢 AUTO-SWITCH FIX
            if (!targetId.startsWith('http')) {
                try {
                    const switchBtn = page.locator('div[aria-label="Switch Now"], div[aria-label="החלף כעת"], div[role="button"]:has-text("Switch Now")').first();
                    if (await switchBtn.isVisible({ timeout: 5000 })) {
                        console.log("[Facebook Engine] 🔄 Switching to Page Profile...");
                        await switchBtn.click();
                        await page.waitForTimeout(5000);
                    }

                    // 🏠 CRITICAL STEP: Go to Home Feed to find the post box!
                    console.log("[Facebook Engine] 🏠 Navigating to Home Feed to find post box...");
                    await page.click('a[aria-label="Home"], a[aria-label="דף הבית"], a[href="/"]');
                    await page.waitForTimeout(3000);

                } catch (e) {
                    console.log("[Facebook Engine] Switch flow error or already correct context.");
                }
            }

            console.log(`[Facebook Engine] On page: ${page.url()}`);
            await page.screenshot({ path: `./screenshots/pub_pre_${targetId.replace(/[^a-z0-9]/gi, '_')}.png` });

            // Robust Selector for Post Box
            // Try different variants of the "Write something" button
            const postSelectors = [
                'div[role="button"] span:has-text("מה בא לך לשתף")', // Specific from your screenshot!
                'div[role="button"]:has-text("מה בא לך לשתף")',
                'div[role="button"]:has-text("כתבו פוסט")',
                'div[role="button"]:has-text("Write something")',
                'div[role="button"]:has-text("מה עובר לך בראש")',
                '.m9osae9f.p01is63a'
            ];

            let clicked = false;
            for (const selector of postSelectors) {
                try {
                    await page.click(selector, { timeout: 5000 });
                    clicked = true;
                    break;
                } catch (e) { }
            }

            if (!clicked) {
                // Try clicking the area by coordinates if selectors fail (Fallback)
                await page.mouse.click(600, 400);
                await page.waitForTimeout(2000);
            }

            await page.waitForTimeout(3000);

            // Fill message using keyboard (more reliable than fill on complex inputs)
            await page.keyboard.type(message, { delay: 50 });
            await page.waitForTimeout(2000);

            await page.screenshot({ path: `./screenshots/pub_filled_${targetId.replace(/[^a-z0-9]/gi, '_')}.png` });

            // Click Post Button
            const submitSelectors = [
                'div[role="button"]:has-text("פרסם")',
                'div[role="button"]:has-text("Post")',
                'div[aria-label="פרסם"]',
                'div[aria-label="Post"]',
                'div[role="button"].x1n2onr6.x1ja2u2z' // Another specific FB class
            ];

            let posted = false;
            for (const selector of submitSelectors) {
                try {
                    await page.click(selector, { timeout: 5000 });
                    posted = true;
                    break;
                } catch (e) { }
            }

            if (!posted) throw new Error("Could not find Post button");

            await page.waitForTimeout(8000);
            console.log(`[Facebook Engine] ✅ Post Published to ${targetId}`);

            await page.screenshot({ path: `./screenshots/pub_done_${targetId.replace(/[^a-z0-9]/gi, '_')}.png` });

            await this.cleanup();
            return true;

        } catch (error: any) {
            console.error("[Facebook Engine] Publishing Failed:", error.message);
            if (this.context) {
                const pages = this.context.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: `./screenshots/pub_error_${targetId.replace(/[^a-z0-9]/gi, '_')}.png` });
                }
            }
            await this.cleanup();
            return false;
        }
    }

    async cleanup() {
        if (this.browser) await this.browser.close();
        this.browser = null;
        this.context = null;
    }
}
