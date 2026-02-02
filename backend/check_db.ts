import admin from 'firebase-admin';
import { db } from './db.js';

async function checkSettings() {
    const doc = await db.collection('settings').doc('facebook').get();
    console.log("Current FB Settings:", JSON.stringify(doc.data(), null, 2));

    // Also check one job to see its structure
    const jobSnapshot = await db.collection('jobs').limit(1).get();
    if (!jobSnapshot.empty) {
        console.log("Job Sample Content:", JSON.stringify(jobSnapshot.docs[0].data(), null, 2));
    }
}

checkSettings();
