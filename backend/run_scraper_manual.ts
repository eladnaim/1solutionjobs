
import { SVTScraper } from './scraper.js';
import { db } from './db.js';

async function main() {
    console.log('🚀 Starting MANUAL SCRAPE from script...');

    // Initialize scraper
    const scraper = new SVTScraper();

    // Run the job
    // Note: scrapeJobs is async
    await scraper.scrapeJobs();

    console.log('✅ Manual scrape process completed.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Manual scrape failed:', err);
    process.exit(1);
});
