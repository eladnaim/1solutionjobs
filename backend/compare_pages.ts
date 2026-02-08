import { chromium } from 'playwright';
import { db } from './db.js';

async function comparePages() {
    const storageRef = db.collection('settings').doc('facebook_session_cookies');
    const doc = await storageRef.get();
    const state = JSON.parse(doc.data()?.storageState);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: state });
    const page = await context.newPage();

    const pagesToCheck = [
        { id: '61587004355854', name: 'Page A (In DB)' },
        { id: '61587098339508', name: 'Page B (Found)' }
    ];

    for (const p of pagesToCheck) {
        console.log(`\n--- Checking ${p.name}: ${p.id} ---`);
        try {
            await page.goto(`https://www.facebook.com/${p.id}`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(5000);

            const data = await page.evaluate(() => {
                const title = document.title;
                // Check for profile picture
                // In new FB layout, profile pic is an <image> inside an <svg> or an <img>
                const profilePic = document.querySelector('div[aria-label*="Profile photo"], div[aria-label*="תמונת פרופיל"] img');
                const hasSpecificLogo = !!profilePic;

                // Check post count by looking for articles
                const articles = document.querySelectorAll('div[role="article"]').length;

                // Get the page name from the title or H1
                const pageName = document.querySelector('h1')?.innerText || 'Unknown';

                return { title, pageName, hasSpecificLogo, articles, url: window.location.href };
            });

            console.log(JSON.stringify(data, null, 2));
            await page.screenshot({ path: `./screenshots/compare_${p.id}.png` });
        } catch (e) {
            console.error(`Error checking ${p.id}:`, e);
        }
    }

    await browser.close();
}

comparePages();
