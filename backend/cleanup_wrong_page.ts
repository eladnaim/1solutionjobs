import { chromium } from 'playwright';
import { db } from './db.js';

async function deleteIncorrectPage() {
    const wrongPageId = '61587098339508'; // The one without logo
    console.log(`[Cleanup] 🎯 Targeting Page for deletion: ${wrongPageId}`);

    const storageRef = db.collection('settings').doc('facebook_session_cookies');
    const doc = await storageRef.get();

    if (!doc.exists) {
        console.error("No Facebook cookies found!");
        return;
    }

    const state = JSON.parse(doc.data()?.storageState);
    const browser = await chromium.launch({ headless: false }); // Headless false so we can see if it fails
    const context = await browser.newContext({ storageState: state, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        console.log("[Cleanup] Navigating to page...");
        await page.goto(`https://www.facebook.com/profile.php?id=${wrongPageId}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        // Take pre-action screenshot
        await page.screenshot({ path: './screenshots/delete_start.png' });

        // Meta often changes the path to deletion. 
        // A common one is https://www.facebook.com/settings?tab=profile_access
        console.log("[Cleanup] Navigating to Identity/Access settings...");
        await page.goto(`https://www.facebook.com/settings?tab=privacy`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(4000);

        // In new FB, it's often under "Facebook Page Information"
        const infoLink = page.locator('span:has-text("Facebook Page Information"), span:has-text("מידע על דף הפייסבוק")').first();
        if (await infoLink.isVisible()) {
            await infoLink.click();
            await page.waitForTimeout(3000);
        }

        const deleteOption = page.locator('span:has-text("Deactivation and deletion"), span:has-text("ביטול הפעלה ומחיקה")').first();
        if (await deleteOption.isVisible()) {
            console.log("[Cleanup] Found Deactivation and Deletion option. Clicking...");
            await deleteOption.click();
            await page.waitForTimeout(5000);

            await page.screenshot({ path: './screenshots/delete_step_2.png' });

            // Select "Delete Page" (usually the second radio)
            const deleteRadio = page.locator('input[type="radio"][value="delete_account"], div[role="radio"]:has-text("Delete Page")').first();
            if (await deleteRadio.isVisible()) {
                await deleteRadio.click();
                console.log("[Cleanup] Selected Delete Page. Clicking Continue...");
                const continueBtn = page.locator('div[role="button"][aria-label="Continue"], div[role="button"][aria-label="המשך"]').first();
                await continueBtn.click();
                await page.waitForTimeout(5000);

                // Final confirmation pages (Facebook asks multiple times)
                // We'll stop here and let the user know we reached the confirmation, 
                // or we could continue if the user is extremely sure.
                // Given the prompt "Required to delete", I'll proceed.

                await page.screenshot({ path: './screenshots/delete_step_3.png' });
                console.log("[Cleanup] ⚠️ Reached final confirmation stages. Please check screenshots.");
            }
        } else {
            console.warn("[Cleanup] Could not find the deletion option directly. Might need manual intervention or updated selectors.");
        }

    } catch (e) {
        console.error("[Cleanup] error:", e);
    } finally {
        await browser.close();
    }
}

deleteIncorrectPage();
