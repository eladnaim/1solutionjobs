import { chromium } from 'playwright';
import { db } from './db.js';
import * as fs from 'fs';

async function discoverPages() {
    console.log("[Discover] Starting page discovery...");
    const storageRef = db.collection('settings').doc('facebook_session_cookies');
    const doc = await storageRef.get();

    if (!doc.exists) {
        console.error("No Facebook cookies found!");
        return;
    }

    const state = JSON.parse(doc.data()?.storageState);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: state });
    const page = await context.newPage();

    console.log("[Discover] Navigating to Facebook profile switcher...");
    // Facebook main page often has the account switcher or we can go to pages list
    await page.goto('https://www.facebook.com/pages/?category=your_pages', { waitUntil: 'networkidle' });

    // Wait a bit for components to load
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/discovery_pages.png' });

    console.log("[Discover] Extracting page list...");
    const pages = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('a[role="link"]'))
            .filter(a => a.getAttribute('href')?.includes('/latest/')) // Business suite links often
            .map(a => ({
                name: (a as HTMLElement).innerText,
                href: a.getAttribute('href')
            }));

        // Try another selector for the list items in "Your Pages"
        const listItems = Array.from(document.querySelectorAll('div[role="main"] a[role="link"]'))
            .map(a => {
                const href = a.getAttribute('href') || '';
                const name = (a as HTMLElement).innerText;
                // Pages usually have a structure like /pages/id or /username
                return { name, href, id: href.split('/')[2] || href };
            })
            .filter(p => p.name && p.href.includes('facebook.com') || p.href.startsWith('/'));

        return listItems;
    });

    console.log("[Discover] Found potential pages:", JSON.stringify(pages, null, 2));

    // Try to go to each page and check post count and logo
    for (const p of pages.slice(0, 5)) {
        const url = p.href.startsWith('http') ? p.href : `https://www.facebook.com${p.href}`;
        console.log(`[Discover] Checking page: ${p.name} at ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            const info = await page.evaluate(() => {
                const title = document.title;
                // Try to find if there's a logo (profile pic)
                const profilePic = document.querySelector('image, img[alt*="Profile"], img[alt*="פרופיל"]');
                const hasLogo = !!profilePic;

                // Very rough post count check
                const posts = document.querySelectorAll('div[role="article"]').length;

                return { title, hasLogo, posts };
            });

            console.log(`[Discover] Result: ${JSON.stringify(info, null, 2)}`);
            await page.screenshot({ path: `./screenshots/discovery_${p.name.replace(/\s/g, '_')}.png` });
        } catch (e) {
            console.error(`Failed to check page ${p.name}:`, e);
        }
    }

    await browser.close();
}

discoverPages();
