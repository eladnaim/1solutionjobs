
import admin from 'firebase-admin';
import { db } from './db.js';
import axios from 'axios';

async function diagnose() {
    console.log("🔍 Starting Diagnosis...");

    // 1. Check Telegram Settings
    const tgDoc = await db.collection('settings').doc('telegram').get();
    if (!tgDoc.exists) {
        console.error("❌ Telegram Settings: MISSING DOC!");
    } else {
        const data = tgDoc.data();
        console.log(`✅ Telegram Settings Found:`);
        console.log(`   - Bot Token Present: ${!!data?.bot_token}`);
        console.log(`   - Chat ID: ${data?.chat_id}`);

        // Try a live ping
        if (data?.bot_token && data?.chat_id) {
            try {
                const url = `https://api.telegram.org/bot${data.bot_token}/getMe`;
                const res = await axios.get(url);
                console.log(`   - Telegram API Test (getMe): SUCCESS (@${res.data.result.username})`);

                // Try sending a silent test message
                const sendUrl = `https://api.telegram.org/bot${data.bot_token}/sendMessage`;
                await axios.post(sendUrl, {
                    chat_id: data.chat_id,
                    text: "🛠 בדיקת מערכת - התעלם מהודעה זו",
                    disable_notification: true
                });
                console.log(`   - Telegram Send Test: SUCCESS`);
            } catch (e: any) {
                console.error(`   - Telegram Test FAILED: ${e.message}`);
                if (e.response) console.error("     API Response:", e.response.data);
            }
        }
    }

    // 2. Check Facebook Page Settings
    const fbDoc = await db.collection('settings').doc('facebook').get();
    const fbCookiesDoc = await db.collection('settings').doc('facebook_session_cookies').get();

    if (!fbDoc.exists) {
        console.error("❌ Facebook Settings: MISSING DOC!");
    } else {
        const data = fbDoc.data();
        console.log(`✅ Facebook Page Settings Found:`);
        console.log(`   - Page Name: ${data?.page_name}`);
        console.log(`   - Page ID: ${data?.page_id}`); // This is likely the culprit for "Knockout"
    }

    if (fbCookiesDoc.exists) {
        console.log(`✅ Facebook Cookies Found: Connected=${fbCookiesDoc.data()?.connected}`);
    } else {
        console.error("❌ Facebook Cookies: MISSING!");
    }
}

diagnose();
