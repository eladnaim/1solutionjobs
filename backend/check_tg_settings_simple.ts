import { db } from './db.js';

async function checkTelegram() {
    const doc = await db.collection('settings').doc('telegram').get();
    console.log(JSON.stringify(doc.data(), null, 2));
}

checkTelegram();
