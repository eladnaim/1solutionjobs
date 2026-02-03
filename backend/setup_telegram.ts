import { db } from './db.js';

async function setupTelegram() {
    try {
        const botToken = '8301836128:AAGJD59JDJjD7lDSxrl0HyN7TIXvWftJrBI';

        console.log("🔍 Testing Telegram bot token...");

        // Test the token
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const data = await response.json();

        if (data.ok) {
            console.log("✅ Bot token is valid!");
            console.log(`Bot name: @${data.result.username}`);
            console.log(`Bot ID: ${data.result.id}`);

            // Get updates to find chat ID
            console.log("\n🔍 Fetching recent updates to find Chat ID...");
            const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
            const updatesData = await updatesResponse.json();

            if (updatesData.ok && updatesData.result.length > 0) {
                console.log("\n📬 Recent chats found:");
                const uniqueChats = new Map();

                updatesData.result.forEach((update: any) => {
                    const chat = update.message?.chat || update.channel_post?.chat;
                    if (chat) {
                        uniqueChats.set(chat.id, {
                            id: chat.id,
                            type: chat.type,
                            title: chat.title || chat.username || `${chat.first_name || ''} ${chat.last_name || ''}`.trim()
                        });
                    }
                });

                uniqueChats.forEach((chat, id) => {
                    console.log(`  - Chat ID: ${id} | Type: ${chat.type} | Name: ${chat.title}`);
                });

                // If there's only one chat, use it automatically
                if (uniqueChats.size === 1) {
                    const chatId = Array.from(uniqueChats.keys())[0];
                    console.log(`\n✅ Found single chat, using Chat ID: ${chatId}`);

                    await db.collection('settings').doc('telegram').set({
                        bot_token: botToken,
                        chat_id: chatId.toString(),
                        bot_username: data.result.username,
                        updated_at: new Date()
                    });

                    console.log("✅ Telegram settings saved to database!");

                    // Send test message
                    console.log("\n📤 Sending test message...");
                    const testResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: '🎉 <b>1solution jobs</b> מחובר בהצלחה!\n\nהמערכת מוכנה לשלוח התראות על לידים חדשים.',
                            parse_mode: 'HTML'
                        })
                    });

                    const testData = await testResponse.json();
                    if (testData.ok) {
                        console.log("✅ Test message sent successfully!");
                    }
                } else {
                    console.log("\n⚠️ Multiple chats found. Please specify which Chat ID to use.");
                    console.log("You can save manually using one of the Chat IDs above.");
                }
            } else {
                console.log("\n⚠️ No recent messages found.");
                console.log("Please send a message to your bot or add it to a channel/group first.");
                console.log("Then run this script again to detect the Chat ID.");

                // Save token only
                await db.collection('settings').doc('telegram').set({
                    bot_token: botToken,
                    bot_username: data.result.username,
                    updated_at: new Date()
                });
                console.log("\n✅ Bot token saved. Chat ID pending.");
            }

        } else {
            console.error("❌ Invalid bot token:", data.description);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

setupTelegram();
