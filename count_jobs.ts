
import { db } from './backend/db.js';

async function count() {
    try {
        const snap = await db.collection('jobs').get();
        console.log(`📊 Current Jobs in DB: ${snap.size}`);
    } catch (e) {
        console.error("Error counting jobs:", e);
    }
    process.exit(0);
}
count();
