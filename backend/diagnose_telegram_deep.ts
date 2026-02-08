
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

async function deepDiagnose() {
    console.log("🕵️ Starting Deep Telegram Diagnostic...");

    // 1. Get Token
    const doc = await db.collection('settings').doc('telegram').get();
    const token = doc.data()?.bot_token;

    if (!token) {
        console.error("❌ No token found in DB.");
        return;
    }

    const API = `https://api.telegram.org/bot${token}`;

    try {
        // 2. Check Identity
        const me = await axios.get(`${API}/getMe`);
        console.log(`✅ Token is valid. Bot: @${me.data.result.username} (ID: ${me.data.result.id})`);

        // 3. Check Webhook Override
        // If a webhook is active, getUpdates will NEVER work.
        const webhookInfo = await axios.get(`${API}/getWebhookInfo`);
        console.log("ℹ️ Webhook Status:", webhookInfo.data.result);

        if (webhookInfo.data.result.url) {
            console.warn("⚠️ A webhook is currently set! This blocks getUpdates.");
            console.log("🗑️ Deleting webhook now...");
            await axios.post(`${API}/deleteWebhook`);
            console.log("✅ Webhook deleted. getUpdates should work now.");
        }

        // 4. Try to get updates aggressively
        console.log("🔍 Fetching updates... (Please send a message in the group NOW)");

        let attempts = 0;
        while (attempts < 10) {
            const updates = await axios.get(`${API}/getUpdates?offset=-1`); // Get latest
            const result = updates.data.result;

            if (result.length > 0) {
                console.log("\n📬 FOUND UPDATES:");
                console.log(JSON.stringify(result, null, 2));

                const last = result[result.length - 1];
                const chat = last.message?.chat || last.channel_post?.chat || last.my_chat_member?.chat;

                if (chat) {
                    console.log(`\n🎯 TARGET ACQUIRED: Chat ID ${chat.id} (${chat.title})`);
                    await db.collection('settings').doc('telegram').update({
                        chat_id: String(chat.id),
                        updated_at: new Date()
                    });
                    console.log("✅ Saved to Firestore.");

                    // Send confirmation
                    await axios.post(`${API}/sendMessage`, {
                        chat_id: chat.id,
                        text: "✅ <b>הצלחנו! המערכת מחוברת.</b>",
                        parse_mode: "HTML"
                    });

                    return;
                }
            } else {
                process.stdout.write(".");
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        console.log("\n❌ Still no updates found.");
        console.log("💡 Tip: Ensure 'Group Privacy' is disabled in BotFather settings if this persists.");

    } catch (e: any) {
        console.error("❌ API Error:", e.response?.data || e.message);
    }
}

deepDiagnose();
