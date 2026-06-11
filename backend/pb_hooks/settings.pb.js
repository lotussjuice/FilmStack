/// <reference path="../pb_data/types.d.ts" />

// Reduce auth token duration from default 72h to 24h (86400 seconds)
onBootstrap((e) => {
    try {
        const settings = $app.settings();
        if (settings.userAuthToken) {
            settings.userAuthToken.tokenDuration = 86400;
        }
        if (settings.adminAuthToken) {
            settings.adminAuthToken.tokenDuration = 86400;
        }
        console.log('[Settings] Auth token duration set to 24 hours (86400s)');
    } catch (err) {
        console.error('[Settings] Error configuring token duration:', err);
    }
    e.next();
});
