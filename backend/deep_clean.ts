import admin from 'firebase-admin';
import { db } from './db.js';
import { cleanTitle } from './publishEngine.js';

async function deepClean() {
    console.log("Deep Cleaning Job Titles...");
    const snapshot = await db.collection('jobs').get();
    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const cleaned = cleanTitle(data.title);

        if (cleaned !== data.title) {
            batch.update(doc.ref, { title: cleaned });
            count++;
        }

        if (count >= 50) {
            await batch.commit();
            console.log(`Updated ${count} jobs...`);
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Final update for ${count} jobs.`);
    }
    console.log("Deep Clean Complete.");
}

deepClean().catch(console.error);
