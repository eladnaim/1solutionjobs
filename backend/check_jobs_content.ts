import admin from 'firebase-admin';
import { db } from './db.js';

async function checkJobs() {
    const s = await db.collection('jobs').where('status', '==', 'active').limit(5).get();
    s.forEach(doc => {
        const d = doc.data();
        console.log(`Title: "${d.title}"`);
        console.log(`Viral A: "${d.viral_post_a?.substring(0, 50)}..."`);
        console.log(`Viral B: "${d.viral_post_b?.substring(0, 50)}..."`);
        console.log('---');
    });
}

checkJobs();
