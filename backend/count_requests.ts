import admin from 'firebase-admin';
import { db } from './db.js';

async function countStatus() {
    const s = await db.collection('publish_requests').get();
    const counts = {};
    s.forEach(doc => {
        const status = doc.data().status;
        counts[status] = (counts[status] || 0) + 1;
    });
    console.log("Status Counts:", JSON.stringify(counts, null, 2));
}

countStatus();
