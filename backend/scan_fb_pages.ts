
import { FacebookScraper } from './facebookScraper.js';

async function listPages() {
    console.log("🔍 Scanning Facebook Pages...");
    const scraper = new FacebookScraper();

    // We launch headless=false so we can see if it needs interaction, though usually it uses cookies
    const browser = await scraper['launchBrowser']();
    const context = await scraper['createContext'](browser);
    const page = await context.newPage();

    try {
        await page.goto('https://www.facebook.com/pages/?category=your_pages', { waitUntil: 'domcontentloaded' });
        console.log("Navigated to Pages dashboard. Waiting for list...");

        await page.waitForTimeout(5000); // Wait for load

        // Try to extract page names and maybe IDs from links
        const pages = await page.$$eval('a[href*="/"]', (anchors) => {
            return anchors
                .filter(a => a.href.includes('facebook.com') && !a.href.includes('checkpoint'))
                .map(a => ({ text: a.innerText, href: a.href }))
                .filter(p => p.text.length > 3);
        });

        console.log("--- FOUND LINKS (Potential Pages) ---");
        // Simple filter to reduce noise
        const likelyPages = pages.filter(p => !p.href.includes('profile.php') && !p.href.includes('watch') && !p.href.includes('groups'));
        likelyPages.forEach(p => console.log(`Name: ${p.text} | Link: ${p.href}`));

    } catch (e: any) {
        console.error("Error scanning pages:", e);
    } finally {
        await browser.close();
    }
}

listPages();
