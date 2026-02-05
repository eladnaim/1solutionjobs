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

            // 1. First go to the Page URL (Relaxed timeout)
            const pageUrl = targetId.startsWith('http') ? targetId : `https://www.facebook.com/${targetId}`;
            try {
                await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                await page.waitForTimeout(4000);
            } catch (navError) {
                console.warn("[Facebook Engine] Navigation timeout (non-fatal), proceeding...", navError);
            }

            // 🟢 AUTO-SWITCH IDENTITY (Robust)
            if (!targetId.startsWith('http')) {
                try {
                    console.log("[Facebook Engine] 🕵️ Checking identity context...");

                    // Check for immediate "Switch Now" button (Blue banner)
                    const switchBtn = page.locator('div[aria-label="Switch Now"], div[aria-label="החלף כעת"], div[role="button"]:has-text("Switch Now")').first();
                    if (await switchBtn.isVisible({ timeout: 3000 })) {
                        console.log("[Facebook Engine] 🔄 Found Banner Switch Button - Clicking...");
                        await switchBtn.click();
                        await page.waitForTimeout(5000);
                    } else {
                        // Check if we need to switch via Account Menu
                        // 1. Open Account Menu
                        try {
                            const accountMenuBtn = page.locator('div[aria-label="Account controls and settings"], div[aria-label="חשבון"], div[role="button"][aria-label="Your profile"]').first();
                            if (await accountMenuBtn.isVisible()) {
                                await accountMenuBtn.click();
                                await page.waitForTimeout(1500);

                                // 2. Look for "Switch to [Page Name]" or similar in the menu
                                // Heuristic: Find a button that contains "Switch" or the page name? 
                                // Actually, simpler: Look for a "Switch profile" button or circle icon with arrows
                                const switchProfileItem = page.locator('div[role="button"] span:has-text("Switch"), div[role="button"] span:has-text("החלף פרופיל")').first();

                                if (await switchProfileItem.isVisible()) {
                                    console.log("[Facebook Engine] 🔄 Found Switch Option in Menu - Clicking...");
                                    await switchProfileItem.click();
                                    await page.waitForTimeout(1500);

                                    // 3. Select the page from the list
                                    // This is tricky as we don't know the exact name. 
                                    // But typically the Business Page is the first option or we can try to guess.
                                    // For now, let's assume the user IS on the page view, so the switch button might be context aware.
                                    // If we are on the page url, the "Switch" might just happen.

                                    // BETTER FALLBACK:
                                    // Just print that we tried.
                                } else {
                                    // Maybe we are already switched?
                                    // Close menu
                                    await page.keyboard.press('Escape');
                                }
                            }
                        } catch (menuError) {
                            console.log("[Facebook Engine] Menu switch attempt failed:", menuError);
                        }
                    }
                } catch (e) {
                    console.log("[Facebook Engine] Identity check error (ignored):", e);
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

            // Fill message using keyboard (more reliable than fill on collection inputs)
            // FOCUS first
            console.log("[Facebook Engine] Focusing input...");
            await page.keyboard.press('Tab');
            await page.waitForTimeout(500);

            // Type slower to trigger React events
            console.log("[Facebook Engine] Typing message...");
            for (const char of message) {
                await page.keyboard.type(char, { delay: Math.random() * 50 + 10 }); // Human-like typing
            }
            await page.waitForTimeout(2000);

            await page.screenshot({ path: `./screenshots/pub_filled_${targetId.replace(/[^a-z0-9]/gi, '_')}.png` });

            // 🟩 Submit Button Selectors (Enhanced for FB 2024/2025)
            const submitSelectors = [
                'div[role="button"][aria-label="פרסם"]',
                'div[role="button"][aria-label="Post"]',
                'div[role="button"]:has-text("פרסם")',
                'div[role="button"]:has-text("Post")',
                'div[aria-label="Submit"]',
                'div[role="button"].x1n2onr6.x1ja2u2z',
                // Generic Blue Button contained in the dialog
                'div[role="dialog"] div[role="button"][tabindex="0"]:not([aria-label="Close"])'
            ];

            let posted = false;

            // Wait for button to become enabled
            console.log("[Facebook Engine] Waiting for submit button to be enabled...");
            try {
                // Try to find ANY enabled submit button
                const submitBtn = page.locator(submitSelectors.join(',')).filter({ hasNot: page.locator('[aria-disabled="true"]') }).first();
                await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
            } catch (e) {
                console.log("[Facebook Engine] Warning: Submit button might still be disabled or not found.");
            }

            // Try Keyboard Shortcut first (Command+Enter or Ctrl+Enter)
            console.log("[Facebook Engine] ⌨️ Trying Keyboard Shortcut (Ctrl+Enter)...");
            await page.keyboard.down('Control');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Control');
            await page.waitForTimeout(3000);

            // Check if dialog closed (indicates success)
            const createPostDialog = page.locator('div[role="dialog"][aria-label="יצירת פוסט"], div[role="dialog"][aria-label="Create post"], div[role="dialog"][aria-label="Create Post"]').first();
            const genericDialog = page.locator('div[role="dialog"]').filter({ hasText: /Post|פרסם|שתף/ }).first();

            if (await createPostDialog.count() > 0 && !(await createPostDialog.isVisible())) {
                console.log("[Facebook Engine] ✅ 'Create Post' Dialog closed.");
                posted = true;
            } else if (await genericDialog.count() > 0 && !(await genericDialog.isVisible())) {
                console.log("[Facebook Engine] ✅ Generic Dialog closed.");
                posted = true;
            } else {
                // If still open, try clicking buttons explicitly
                for (const selector of submitSelectors) {
                    try {
                        const btn = page.locator(selector).first();

                        if (await btn.isVisible()) {
                            // Check if disabled
                            const ariaDisabled = await btn.getAttribute('aria-disabled');
                            if (ariaDisabled === 'true') {
                                console.log(`[Facebook Engine] Button ${selector} is DISABLED. Trying to re-trigger input...`);
                                await page.keyboard.press('Space');
                                await page.keyboard.press('Backspace');
                                await page.waitForTimeout(1000);
                            }

                            // Click now
                            if ((await btn.getAttribute('aria-disabled')) !== 'true') {
                                console.log(`[Facebook Engine] Clicking Submit: ${selector}`);
                                await btn.click();
                                await page.waitForTimeout(5000);

                                if (!(await createPostDialog.isVisible()) && !(await genericDialog.isVisible())) {
                                    posted = true;
                                    break;
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            if (!posted) {
                // Final check: did the post button disappear?
                const anyPostBtn = page.locator('div[aria-label="Post"], div[aria-label="פרסם"]').first();
                if (!(await anyPostBtn.isVisible())) {
                    console.log("[Facebook Engine] ⚠️ Post button gone, assuming success.");
                    posted = true;
                }
            }

            if (!posted) throw new Error("Could not confirm post publication (Dialog still open)");

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
