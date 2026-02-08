import { db } from './db.js';

async function fixSettings() {
    try {
        await db.collection('settings').doc('facebook').set({
            page_id: '61587004355854',
            page_name: '1solution - השמה וגיוס כ״א',
            updated_at: new Date()
        }, { merge: true });
        console.log('✅ Facebook Settings Fixed in Firestore.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Failed to fix settings:', e);
        process.exit(1);
    }
}

fixSettings();
