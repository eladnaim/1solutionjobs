
import { db } from './db.js';

async function resetJobs() {
    console.log('🗑️ Starting database cleanup: Deleting ALL jobs...');

    try {
        const snapshot = await db.collection('jobs').get();

        if (snapshot.empty) {
            console.log('✅ Database is already empty. No jobs to delete.');
            return;
        }

        console.log(`Found ${snapshot.size} jobs to delete.`);

        const BATCH_SIZE = 400;
        let batch = db.batch();
        let count = 0;
        let totalDeleted = 0;

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            count++;

            if (count >= BATCH_SIZE) {
                await batch.commit();
                totalDeleted += count;
                console.log(`Deleted ${totalDeleted} jobs...`);
                batch = db.batch(); // Get a new batch
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            totalDeleted += count;
        }

        console.log(`✅ Cleanup Complete! Deleted total of ${totalDeleted} jobs.`);
        console.log('The system is now clean and ready for a fresh scrape.');

    } catch (error) {
        console.error('❌ Error deleting jobs:', error);
    }
}

resetJobs();
