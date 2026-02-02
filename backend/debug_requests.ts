import admin from 'firebase-admin';
import { db } from './db.js';

async function checkRequests() {
    const s = await db.collection('publish_requests').orderBy('created_at', 'desc').limit(5).get();
    console.log(`Recent Requests: ${s.size}`);
    s.forEach(doc => {
        const d = doc.data();
        console.log(`- ${doc.id}: Status: ${d.status}, Page: ${d.target_page_id}, Results: ${JSON.stringify(d.results)}`);
    });
}

checkRequests();
