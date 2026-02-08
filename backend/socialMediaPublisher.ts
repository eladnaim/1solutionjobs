import admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();

// ============================================
// REAL SOCIAL MEDIA PUBLISHING ENGINE
// ============================================

interface PublishConfig {
    platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'whatsapp';
    enabled: boolean;
    requiresApproval: boolean;
    accessToken?: string;
    pageId?: string;
    groupId?: string;
}

interface PublishRequest {
    jobId: string;
    content: string;
    imageUrl?: string;
    platforms: string[];
    scheduledTime?: Date;
    status: 'pending_approval' | 'approved' | 'published' | 'failed';
}

// ============================================
// FACEBOOK GRAPH API INTEGRATION
// ============================================

export class FacebookPublisher {
    private accessToken: string;
    private pageId: string;

    constructor(accessToken: string, pageId: string) {
        this.accessToken = accessToken;
        this.pageId = pageId;
    }

    /**
     * Publish to Facebook Page
     * Requires: Page Access Token with pages_manage_posts permission
     */
    async publishToPage(message: string, link?: string, imageUrl?: string): Promise<any> {
        try {
            const url = `https://graph.facebook.com/v18.0/${this.pageId}/feed`;

            const payload: any = {
                message,
                access_token: this.accessToken
            };

            if (link) {
                payload.link = link;
            }

            if (imageUrl) {
                // If image, use photos endpoint instead
                const photoUrl = `https://graph.facebook.com/v18.0/${this.pageId}/photos`;
                const photoPayload = {
                    url: imageUrl,
                    caption: message,
                    access_token: this.accessToken
                };

                const response = await axios.post(photoUrl, photoPayload);
                return response.data;
            }

            const response = await axios.post(url, payload);
            return response.data;
        } catch (error: any) {
            console.error('Facebook publish error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Publish to Facebook Group
     * Requires: Group access token
     */
    async publishToGroup(groupId: string, message: string, link?: string): Promise<any> {
        try {
            const url = `https://graph.facebook.com/v18.0/${groupId}/feed`;

            const payload: any = {
                message,
                access_token: this.accessToken
            };

            if (link) {
                payload.link = link;
            }

            const response = await axios.post(url, payload);
            return response.data;
        } catch (error: any) {
            console.error('Facebook group publish error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// ============================================
// INSTAGRAM GRAPH API INTEGRATION
// ============================================

export class InstagramPublisher {
    private accessToken: string;
    private instagramAccountId: string;

    constructor(accessToken: string, instagramAccountId: string) {
        this.accessToken = accessToken;
        this.instagramAccountId = instagramAccountId;
    }

    /**
     * Publish to Instagram (requires image)
     */
    async publishPost(imageUrl: string, caption: string): Promise<any> {
        try {
            // Step 1: Create media container
            const createUrl = `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media`;
            const createPayload = {
                image_url: imageUrl,
                caption,
                access_token: this.accessToken
            };

            const createResponse = await axios.post(createUrl, createPayload);
            const creationId = createResponse.data.id;

            // Step 2: Publish the container
            const publishUrl = `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media_publish`;
            const publishPayload = {
                creation_id: creationId,
                access_token: this.accessToken
            };

            const publishResponse = await axios.post(publishUrl, publishPayload);
            return publishResponse.data;
        } catch (error: any) {
            console.error('Instagram publish error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// ============================================
// LINKEDIN API INTEGRATION
// ============================================

export class LinkedInPublisher {
    private accessToken: string;
    private organizationId: string;

    constructor(accessToken: string, organizationId: string) {
        this.accessToken = accessToken;
        this.organizationId = organizationId;
    }

    /**
     * Publish to LinkedIn Organization Page
     */
    async publishPost(text: string, link?: string): Promise<any> {
        try {
            const url = 'https://api.linkedin.com/v2/ugcPosts';

            const payload = {
                author: `urn:li:organization:${this.organizationId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text
                        },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };

            if (link) {
                payload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
                payload.specificContent['com.linkedin.ugc.ShareContent'].media = [{
                    status: 'READY',
                    originalUrl: link
                }];
            }

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('LinkedIn publish error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// ============================================
// TWITTER (X) API INTEGRATION
// ============================================

export class TwitterPublisher {
    private bearerToken: string;

    constructor(bearerToken: string) {
        this.bearerToken = bearerToken;
    }

    /**
     * Publish to Twitter/X
     */
    async publishTweet(text: string): Promise<any> {
        try {
            const url = 'https://api.twitter.com/2/tweets';

            const payload = {
                text
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('Twitter publish error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// ============================================
// WHATSAPP BUSINESS API INTEGRATION
// ============================================

export class WhatsAppPublisher {
    private accessToken: string;
    private phoneNumberId: string;

    constructor(accessToken: string, phoneNumberId: string) {
        this.accessToken = accessToken;
        this.phoneNumberId = phoneNumberId;
    }

    /**
     * Send WhatsApp message to a contact
     */
    async sendMessage(to: string, message: string): Promise<any> {
        try {
            const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

            const payload = {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: {
                    body: message
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('WhatsApp send error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Send WhatsApp message with template
     */
    async sendTemplate(to: string, templateName: string, languageCode: string = 'he'): Promise<any> {
        try {
            const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

            const payload = {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    }
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('WhatsApp template error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// ============================================
// TELEGRAM BOT API INTEGRATION
// ============================================

export class TelegramPublisher {
    private botToken: string;
    private chatId: string;

    constructor(botToken: string, chatId: string) {
        this.botToken = botToken;
        this.chatId = chatId;
    }

    /**
     * Publish to Telegram Channel/Group
     */
    async sendMessage(text: string, imageUrl?: string): Promise<any> {
        try {
            if (imageUrl) {
                const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
                const response = await axios.post(url, {
                    chat_id: this.chatId,
                    photo: imageUrl,
                    caption: text,
                    parse_mode: 'HTML'
                });
                return response.data;
            } else {
                const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
                const response = await axios.post(url, {
                    chat_id: this.chatId,
                    text: text,
                    parse_mode: 'HTML'
                });
                return response.data;
            }
        } catch (error: any) {
            console.error('Telegram publish error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// ============================================
// UNIFIED PUBLISHING MANAGER
// ============================================

export class SocialMediaPublisher {
    private facebook?: FacebookPublisher;
    private instagram?: InstagramPublisher;
    private linkedin?: LinkedInPublisher;
    private twitter?: TwitterPublisher;
    private whatsapp?: WhatsAppPublisher;
    private telegram?: TelegramPublisher;

    constructor() {
        // Initialize publishers from environment variables or Firestore config
        this.loadConfig();
    }

    private async loadConfig() {
        try {
            // Load Facebook Settings
            const fbDoc = await db.collection('settings').doc('facebook').get();
            const fbCookies = await db.collection('settings').doc('facebook_session_cookies').get();

            // We only enable FB if we have a Page ID and cookies/token
            if (fbDoc.exists && fbDoc.data()?.page_id) {
                // Note: The original implementation assumed a long-lived token. 
                // Since we use Puppeteer/Cookies for some things, we might need a hybrid approach.
                // For now, let's assume the Access Token is stored in settings or we use the cookie-based scraper.
                // BUT, SocialMediaPublisher uses axios + Graph API. 
                // We need a Page Access Token. 

                // If the user hasn't provided a Graph API token, we might fail here.
                // However, for the purpose of fixing the immediate "Mock" issue:
                const fbData = fbDoc.data();
                if (fbData?.access_token) {
                    this.facebook = new FacebookPublisher(fbData.access_token, fbData.page_id);
                }
            }

            // Load Telegram Settings
            const tgDoc = await db.collection('settings').doc('telegram').get();
            if (tgDoc.exists) {
                const tgData = tgDoc.data();
                if (tgData?.bot_token && tgData?.chat_id) {
                    this.telegram = new TelegramPublisher(tgData.bot_token, tgData.chat_id);
                }
            }

            // Load WhatsApp Settings
            const waDoc = await db.collection('settings').doc('whatsapp').get();
            if (waDoc.exists) {
                const waData = waDoc.data();
                if (waData?.access_token && waData?.phone_number_id) {
                    this.whatsapp = new WhatsAppPublisher(waData.access_token, waData.phone_number_id);
                }
            }

        } catch (error) {
            console.error('Failed to load social media config:', error);
        }
    }

    /**
     * Create a publish request (requires approval)
     */
    async createPublishRequest(jobId: string, platforms: string[]): Promise<string> {
        try {
            // Get job data
            const jobDoc = await db.collection('jobs').doc(jobId).get();
            const job = jobDoc.data();

            if (!job) {
                throw new Error('Job not found');
            }

            // Create publish request
            const requestRef = await db.collection('publish_requests').add({
                job_id: jobId,
                job_title: job.title,
                content: job.viral_post || job.professional_post,
                platforms,
                status: 'pending_approval',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                approved_by: null,
                published_at: null
            });

            return requestRef.id;
        } catch (error) {
            console.error('Failed to create publish request:', error);
            throw error;
        }
    }

    /**
     * Approve and publish a request
     */
    async approveAndPublish(requestId: string, approvedBy: string = 'System'): Promise<any> {
        await this.loadConfig(); // Refresh config ensures we have latest tokens/chat_ids
        try {
            const requestDoc = await db.collection('publish_requests').doc(requestId).get();
            const request = requestDoc.data();

            if (!request) {
                throw new Error('Request not found');
            }

            const results: any = {};
            const platformsToPublish: string[] = request.target_platforms || request.platforms || [];

            // PARALLEL EXECUTION:
            // We want Telegram to happen instantly regardless of Facebook/Puppeteer delays.
            // So we will split the platforms.

            const independentPlatforms = platformsToPublish.filter(p => p !== 'facebook');
            const facebookPlatform = platformsToPublish.find(p => p === 'facebook');

            // 1. Run independent platforms (Telegram, Twitter, etc.) FAST
            for (const platform of independentPlatforms) {
                try {
                    switch (platform) {
                        case 'telegram':
                            if (this.telegram) {
                                console.log("[Publisher] 🚀 Sending Telegram...");
                                const tgContent = (request.generated_content || request.content) + `\n\n👇 להגשת מועמדות:\n${request.job_link || request.link}`;
                                results.telegram = await this.telegram.sendMessage(
                                    tgContent,
                                    request.image_url
                                );
                            } else {
                                results.telegram = { error: "Telegram not configured" };
                            }
                            break;

                        // ... (Other cases kept simple for now)
                    }
                } catch (e: any) {
                    console.error(`[Publisher] ${platform} failed:`, e.message);
                    results[platform] = { error: e.message };
                }
            }

            // 2. Run Facebook (Heavy Operation) - ONLY if requested
            if (facebookPlatform) {
                try {
                    console.log("[Publisher] 🐢 Starting Facebook Distribution (Page + Groups)...");

                    // A. Page Publishing
                    let pageSuccess = false;
                    if (this.facebook) {
                        // Graph API
                        await this.facebook.publishToPage(request.generated_content, request.job_link);
                        pageSuccess = true;
                    } else {
                        // Puppeteer Fallback
                        const { FacebookScraper } = await import('./facebookScraper.js');
                        const scraper = new FacebookScraper();
                        const settings = await db.collection('settings').doc('facebook').get();
                        const pageId = settings.data()?.page_id;

                        if (pageId) {
                            pageSuccess = await scraper.publishPost(pageId, (request.generated_content || '') + '\n\n' + (request.job_link || ''));
                            await scraper.cleanup();
                        }
                    }
                    results.facebook = { success: pageSuccess };

                    // B. Group Publishing
                    if (request.target_groups && request.target_groups.length > 0) {
                        console.log(`[Publisher] 👥 Starting Group Distribution...`);
                        const { FacebookScraper } = await import('./facebookScraper.js');
                        const groupScraper = new FacebookScraper();

                        for (const group of request.target_groups) {
                            const gid = group.url ? group.url.split('groups/')[1]?.split('/')[0] : group.id;
                            if (gid) {
                                const gContent = (request.generated_content || request.content);
                                await groupScraper.publishToGroup(gid, gContent);
                            }
                        }
                        await groupScraper.cleanup();
                    }

                } catch (e: any) {
                    console.error("[Publisher] Facebook failed:", e);
                    results.facebook = { error: e.message };
                }
            }

            // Final Database Update
            await db.collection('publish_requests').doc(requestId).update({
                status: 'published',
                approved_by: approvedBy,
                published_at: admin.firestore.FieldValue.serverTimestamp(),
                results
            });

            return results;
        } catch (error) {
            console.error('Failed to approve and publish:', error);
            throw error;
        }
    }
}

export default SocialMediaPublisher;
