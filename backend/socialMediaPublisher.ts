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
    async approveAndPublish(requestId: string, approvedBy: string): Promise<any> {
        try {
            const requestDoc = await db.collection('publish_requests').doc(requestId).get();
            const request = requestDoc.data();

            if (!request) {
                throw new Error('Request not found');
            }

            const results: any = {};

            // Publish to each platform
            for (const platform of request.platforms) {
                try {
                    switch (platform) {
                        case 'facebook':
                            if (this.facebook) {
                                results.facebook = await this.facebook.publishToPage(
                                    request.content,
                                    request.link
                                );
                            }
                            break;

                        case 'instagram':
                            if (this.instagram && request.image_url) {
                                results.instagram = await this.instagram.publishPost(
                                    request.image_url,
                                    request.content
                                );
                            }
                            break;

                        case 'linkedin':
                            if (this.linkedin) {
                                results.linkedin = await this.linkedin.publishPost(
                                    request.content,
                                    request.link
                                );
                            }
                            break;

                        case 'twitter':
                            if (this.twitter) {
                                // Twitter has 280 char limit
                                const tweetText = request.content.substring(0, 270) + '... ' + request.link;
                                results.twitter = await this.twitter.publishTweet(tweetText);
                            }
                            break;

                        case 'telegram':
                            if (this.telegram) {
                                results.telegram = await this.telegram.sendMessage(
                                    request.content,
                                    request.image_url
                                );
                            }
                            break;
                    }
                } catch (platformError) {
                    results[platform] = { error: platformError.message };
                }
            }

            // Update request status
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
