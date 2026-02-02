import admin from 'firebase-admin';
import { db } from './db.js';

async function checkGroups() {
    const s = await db.collection('groups').get();
    console.log(`Groups in DB: ${s.size}`);
    s.forEach(doc => {
        console.log(`- ${doc.id}: ${JSON.stringify(doc.data())}`);
    });
}

checkGroups();
