
import axios from 'axios';
import { db } from './db.js';
import admin from 'firebase-admin';

// Initialize Firebase if not already
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function interactiveSetup() {
    console.log("\n🛑 --- עצור! בוא נתקן את הטלגרם אחת ולתמיד --- 🛑");

    // Get Token
    const doc = await db.collection('settings').doc('telegram').get();
    const token = doc.data()?.bot_token;

    if (!token) {
        console.error("❌ לא נמצא טוקן בהגדרות! יש להגדיר בוט טוקן קודם.");
        return;
    }

    console.log("1. וודא שהבוט @OneSolutionJobsBot נמצא בקבוצה/ערוץ שלך.");
    console.log("2. וודא שהבוט מוגדר כמנהל (Admin).");
    console.log("3. שלח עכשיו הודעה כלשהי בקבוצה (למשל: 'בדיקה').");
    console.log("⏳ המערכת מחכה להודעה שלך כדי לתפוס את ה-ID... (בודק כל 3 שניות)");

    let found = false;
    let attempts = 0;

    while (!found && attempts < 20) { // Try for 60 seconds
        try {
            const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates?offset=-1`);
            const updates = res.data.result;

            if (updates.length > 0) {
                const lastUpdate = updates[updates.length - 1];
                const chat = lastUpdate.message?.chat || lastUpdate.channel_post?.chat || lastUpdate.my_chat_member?.chat;

                if (chat) {
                    console.log("\n✅ הופה! מצאתי הודעה!");
                    console.log(`📌 שם הקבוצה: ${chat.title}`);
                    console.log(`🆔 מזהה (Chat ID): ${chat.id}`);

                    // Save immediately
                    await db.collection('settings').doc('telegram').update({
                        chat_id: String(chat.id),
                        updated_at: new Date()
                    });

                    console.log("💾 המזהה נשמר בבסיס הנתונים!");

                    // Verify
                    console.log("📤 שולח הודעת אימות...");
                    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                        chat_id: chat.id,
                        text: "✅ המערכת חוברה בהצלחה! מעכשיו כל המשרות יגיעו לכאן.",
                        parse_mode: 'HTML'
                    });

                    console.log("✨ הכל תקין. הטלגרם מחובר.");
                    found = true;
                    process.exit(0);
                }
            }
        } catch (e: any) {
            console.log("... מנסה שוב ...");
        }

        await sleep(3000);
        attempts++;
        process.stdout.write(".");
    }

    if (!found) {
        console.log("\n❌ לא הצלחתי למצוא הודעה חדשה. האם שלחת הודעה בקבוצה בזמן שהמתנתי?");
    }
}

interactiveSetup();
