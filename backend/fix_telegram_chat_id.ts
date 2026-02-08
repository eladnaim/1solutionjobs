
import admin from 'firebase-admin';
import { db } from './db.js';
import axios from 'axios';

async function fixTelegramChatId() {
    console.log("🔧 Fixing Telegram Chat ID based on recent updates...");

    const settingsDoc = await db.collection('settings').doc('telegram').get();
    if (!settingsDoc.exists) {
        console.error("❌ Telegram settings document not found!");
        return;
    }

    const { bot_token } = settingsDoc.data() as any;
    if (!bot_token) {
        console.error("❌ Bot token is missing!");
        return;
    }

    try {
        const updatesRes = await axios.get(`https://api.telegram.org/bot${bot_token}/getUpdates`);
        const updates = updatesRes.data.result;

        if (updates.length === 0) {
            console.log("⚠️ No updates found. Please send a message to the bot or add it to the group/channel now.");
            console.log("   Then run this script again.");
            return;
        }

        console.log(`✅ Found ${updates.length} updates.`);

        // Find the most recent group/channel interaction
        let bestChatId = null;
        let bestChatTitle = '';

        // Iterate backwards to find latest relevant chat
        for (let i = updates.length - 1; i >= 0; i--) {
            const u = updates[i];
            const chat = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat;

            if (chat && (chat.type === 'supergroup' || chat.type === 'channel' || chat.type === 'group')) {
                bestChatId = chat.id;
                bestChatTitle = chat.title;
                break;
            }
        }

        if (bestChatId) {
            console.log(`🎯 Found target Chat ID: ${bestChatId} (${bestChatTitle})`);

            await db.collection('settings').doc('telegram').update({
                chat_id: String(bestChatId),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ Updated Firestore settings with new Chat ID.");

            // Verify with message
            await axios.post(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
                chat_id: bestChatId,
                text: "✅ <b>הצ'אט אומת בהצלחה!</b>\nהמערכת מוכנה לשיגור משרות.",
                parse_mode: 'HTML'
            });
            console.log("✅ Verification message sent.");

        } else {
            console.log("⚠️ Could not identify a group or channel in the updates.");
            console.log("   Please ensure the bot is added to a group/channel and you've sent a message there recently.");
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }
}

fixTelegramChatId();
