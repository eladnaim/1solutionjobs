import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { SoldiersFunnel } from './components/SoldiersFunnel';
import { VeteransFunnel } from './components/VeteransFunnel';

function App() {
    const [isConnected, setIsConnected] = useState(false);
    const [isFacebookConnected, setIsFacebookConnected] = useState(false);
    const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
    const [isInstagramConnected, setIsInstagramConnected] = useState(false);
    const [isTelegramConnected, setIsTelegramConnected] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [facebookPageName, setFacebookPageName] = useState('');
    const [facebookPageId, setFacebookPageId] = useState('');

    // Basic Client-Side Routing
    const path = window.location.pathname;
    const query = new URLSearchParams(window.location.search);
    const publicJobId = query.get('job');
    const isSoldierPath = path === '/soldiers' || query.get('soldiers') === 'true';
    const isVeteranPath = path === '/veterans' || query.get('veterans') === 'true';

    // Initial Check
    useEffect(() => {
        if (!publicJobId) {
            checkStatus();
            const interval = setInterval(checkStatus, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [publicJobId]);

    const checkStatus = async () => {
        try {
            // Check SVT Status
            const res = await fetch('/api/svt-status');
            const data = await res.json();
            setIsConnected(data.connected);
            if (data.active) setIsPulling(true);
            else if (!isPulling) setIsPulling(false);

            // Check Facebook Status
            const fbRes = await fetch('/api/facebook-status');
            const fbData = await fbRes.json();
            setIsFacebookConnected(fbData.connected);
            setFacebookPageName(fbData.page_name || '');
            setFacebookPageId(fbData.page_id || '');

            // Check Telegram Status
            const tgRes = await fetch('/api/telegram-status');
            const tgData = await tgRes.json();
            setIsTelegramConnected(tgData.connected);

            // Check Other Social Statuses (Mocked for now)
            setIsLinkedInConnected(fbData.linkedInConnected || false);
            setIsInstagramConnected(fbData.instagramConnected || false);
        } catch (e) {
            console.warn("Backend not reachable yet");
        }
    };

    const handleConnect = async () => {
        try {
            const res = await fetch('/api/svt-login', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setIsConnected(true);
                alert("החיבור ל-SVT הצליח! המערכת שמרה את נתוני הגישה.");
            } else {
                alert("החיבור נכשל. אנא נסה שנית.");
            }
        } catch (e) {
            alert("שגיאת תקשורת עם השרת.");
        }
    };

    const handleConnectFacebook = async () => {
        try {
            // Trigger interactive login for FB
            const res = await fetch('/api/facebook-login', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setIsFacebookConnected(true);
                alert("החיבור לפייסבוק הצליח! מעכשיו ניתן לפרסם פוסטים ישירות לדף העסק.");
            } else {
                alert("החיבור לפייסבוק נכשל.");
            }
        } catch (e) {
            alert("שגיאת תקשורת.");
        }
    };

    const handlePull = async (fullSweep: boolean = false) => {
        setIsPulling(true);
        try {
            const res = await fetch(`/api/pull-jobs?fullSweep=${fullSweep}`);
            const data = await res.json();
            if (data.success) {
                alert(data.message || "משיכת משרות החלה ברקע.");
            } else {
                alert("שגיאה בהפעלת משיכת המשרות.");
            }
        } catch (e) {
            alert("שגיאה בתקשורת עם השרת.");
        } finally {
            setIsPulling(false);
        }
    };

    if (publicJobId) {
        return <LandingPage jobId={publicJobId} />;
    }

    if (isSoldierPath) {
        return <SoldiersFunnel />;
    }

    if (isVeteranPath) {
        return <VeteransFunnel />;
    }

    return (
        <Dashboard
            isConnected={isConnected}
            isFacebookConnected={isFacebookConnected}
            facebookPageName={facebookPageName}
            facebookPageId={facebookPageId}
            isLinkedInConnected={isLinkedInConnected}
            isInstagramConnected={isInstagramConnected}
            isTelegramConnected={isTelegramConnected}
            onConnect={handleConnect}
            onConnectFacebook={handleConnectFacebook}
            onPull={handlePull}
            isPulling={isPulling}
        />
    );
}

export default App;
