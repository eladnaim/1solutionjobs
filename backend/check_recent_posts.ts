import { chromium } from 'playwright';
import { db } from './db.js';

async function checkRecentPosts() {
    try {
        console.log("🔍 Checking recent posts on Facebook Page...\n");

        // Get Facebook settings
        const fbSettingsDoc = await db.collection('settings').doc('facebook').get();
        const pageId = fbSettingsDoc.data()?.page_id || '61587004355854';

        // Get session cookies
        const sessionDoc = await db.collection('settings').doc('facebook_session_cookies').get();
        if (!sessionDoc.exists) {
            console.error("❌ No Facebook session found. Please login first.");
            return;
        }

        const state = JSON.parse(sessionDoc.data()?.storageState);

        // Launch browser
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: state });
        const page = await context.newPage();

        // Navigate to page
        console.log(`📍 Navigating to: https://www.facebook.com/${pageId}`);
        await page.goto(`https://www.facebook.com/${pageId}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        // Take screenshot of the page
        await page.screenshot({ path: './screenshots/page_overview.png' });
        console.log("📸 Screenshot saved: ./screenshots/page_overview.png");

        // Try to find recent posts
        console.log("\n🔎 Looking for recent posts...\n");

        // Method 1: Check main feed posts
        const posts = await page.locator('div[role="article"]').all();
        console.log(`Found ${posts.length} article elements on the page`);

        if (posts.length > 0) {
            console.log("\n📝 Recent Posts Found:\n");
            for (let i = 0; i < Math.min(posts.length, 5); i++) {
                try {
                    const postText = await posts[i].innerText();
                    const preview = postText.substring(0, 150).replace(/\n/g, ' ');
                    console.log(`Post ${i + 1}: ${preview}...`);
                    console.log("---");
                } catch (e) {
                    console.log(`Post ${i + 1}: [Could not extract text]`);
                }
            }
        } else {
            console.log("⚠️ No posts found in main feed");
        }

        // Method 2: Check for "Posts" tab
        console.log("\n🔍 Checking 'Posts' tab...");
        const postsTab = page.locator('a[role="tab"]:has-text("Posts"), a[role="tab"]:has-text("פוסטים")').first();
        if (await postsTab.isVisible({ timeout: 3000 })) {
            console.log("✅ Found 'Posts' tab, clicking...");
            await postsTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: './screenshots/posts_tab.png' });
            console.log("📸 Screenshot saved: ./screenshots/posts_tab.png");

            const tabPosts = await page.locator('div[role="article"]').all();
            console.log(`Found ${tabPosts.length} posts in Posts tab`);
        } else {
            console.log("⚠️ 'Posts' tab not found");
        }

        // Method 3: Check for "Community" tab (visitor posts)
        console.log("\n🔍 Checking 'Community' tab...");
        const communityTab = page.locator('a[role="tab"]:has-text("Community"), a[role="tab"]:has-text("קהילה")').first();
        if (await communityTab.isVisible({ timeout: 3000 })) {
            console.log("✅ Found 'Community' tab, clicking...");
            await communityTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: './screenshots/community_tab.png' });
            console.log("📸 Screenshot saved: ./screenshots/community_tab.png");

            const communityPosts = await page.locator('div[role="article"]').all();
            console.log(`Found ${communityPosts.length} posts in Community tab`);

            if (communityPosts.length > 0) {
                console.log("\n⚠️ IMPORTANT: Posts found in Community tab!");
                console.log("This means posts are being published as 'Visitor Posts' not as the Page.");
                console.log("You need to approve these or fix the posting identity.\n");
            }
        } else {
            console.log("⚠️ 'Community' tab not found");
        }

        // Wait a bit before closing
        console.log("\n✅ Check complete. Browser will close in 5 seconds...");
        await page.waitForTimeout(5000);
        await browser.close();

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

checkRecentPosts();
