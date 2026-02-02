import { chromium } from 'playwright';
import { db } from './backend/db';
import fs from 'fs';

async function dumpStructure() {
    console.log("Starting Structure Dump...");

    // 1. Load Session
    const doc = await db.collection('settings').doc('svt_session_cookies').get();
    if (!doc.exists) {
        console.error("No session found in DB. Please login first.");
        process.exit(1);
    }
    const storageState = JSON.parse(doc.data()?.storageState);

    // 2. Launch
    const browser = await chromium.launch({ headless: true }); // Headless is fine for dumping HTML
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    // 3. List Page
    const agentId = '774555'; // Hardcoded for debug, matches scraper.ts
    const baseUrl = `https://www.svt.jobs/agent/${agentId}/positions`;

    console.log(`Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    const listHtml = await page.content();
    fs.writeFileSync('debug_list.html', listHtml);
    console.log("Saved debug_list.html");

    // 4. Find first link
    // Try to find a link that looks like a job
    const links = await page.$$eval('a', as => as.map(a => a.href));
    const jobLink = links.find(l => l.includes('/position/') || l.includes('/job/'));

    if (jobLink) {
        console.log(`Navigating to detail page: ${jobLink}...`);
        await page.goto(jobLink, { waitUntil: 'domcontentloaded' });
        const detailHtml = await page.content();
        fs.writeFileSync('debug_detail.html', detailHtml);
        console.log("Saved debug_detail.html");
    } else {
        console.log("Could not find a job link to drill down into.");
    }

    await browser.close();
    console.log("Dump complete.");
    process.exit(0);
}

dumpStructure();
