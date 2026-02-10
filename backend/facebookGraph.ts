
import axios from 'axios';
import { db } from './db.js';
import admin from 'firebase-admin';

export class FacebookGraphService {
    private pageId: string | null = null;
    private accessToken: string | null = null;
    private version = 'v19.0'; // Updated to recent version

    constructor() { }

    async initialize() {
        // Try getting from Firestore first, then env
        const settings = await db.collection('settings').doc('facebook_graph').get();
        if (settings.exists) {
            this.pageId = settings.data()?.page_id;
            this.accessToken = settings.data()?.access_token;
        }

        if (!this.pageId) this.pageId = process.env.FACEBOOK_PAGE_ID || null;
        if (!this.accessToken) this.accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null;
    }

    async publishPost(message: string, link?: string): Promise<{ success: boolean; id?: string; error?: string }> {
        if (!this.pageId || !this.accessToken) {
            await this.initialize();
            if (!this.pageId || !this.accessToken) {
                return { success: false, error: 'Missing Page ID or Access Token' };
            }
        }

        try {
            console.log(`[Facebook Graph] Publishing to ${this.pageId}...`);
            const url = `https://graph.facebook.com/${this.version}/${this.pageId}/feed`;

            const payload: any = {
                message: message,
                access_token: this.accessToken
            };

            if (link) {
                payload.link = link;
            }

            const response = await axios.post(url, payload);

            if (response.data && response.data.id) {
                console.log(`[Facebook Graph] ✅ Published successfully: ${response.data.id}`);
                return { success: true, id: response.data.id };
            } else {
                return { success: false, error: 'Unknown response format' };
            }

        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`[Facebook Graph] ❌ Failed: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Posts a photo with a caption
     */
    async publishPhoto(message: string, imageUrl: string): Promise<{ success: boolean; id?: string; error?: string }> {
        if (!this.pageId || !this.accessToken) {
            await this.initialize();
        }

        try {
            console.log(`[Facebook Graph] Publishing Photo to ${this.pageId}...`);
            const url = `https://graph.facebook.com/${this.version}/${this.pageId}/photos`;

            const payload = {
                url: imageUrl,
                caption: message,
                access_token: this.accessToken
            };

            const response = await axios.post(url, payload);

            if (response.data && response.data.id) {
                console.log(`[Facebook Graph] ✅ Photo Published: ${response.data.id}`);
                return { success: true, id: response.data.id };
            }
            return { success: false, error: 'Unknown response' };

        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`[Facebook Graph] ❌ Photo Failed: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }
}
