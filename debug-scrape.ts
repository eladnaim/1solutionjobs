import { SVTScraper } from './backend/scraper.js';

async function test() {
    console.log("Starting debug scrape...");
    const scraper = new SVTScraper();
    try {
        const count = await scraper.scrapeJobs();
        console.log(`Scrape finished. Found ${count} jobs.`);
    } catch (e) {
        console.error("Scrape failed with error:", e);
    }
}

test();
