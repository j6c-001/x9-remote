// Shared Constants
const ALPHABET_CUSTOM = "KLMPQRSTUVWXYZABCGHdefIJjkNOlmnopqrstuvwxyzabcghiDEF34501289+67/";
const ALPHABET_STANDARD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Utility Functions
function decodeCustom(encoded) {
    let translated = "";
    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.charAt(i);
        const index = ALPHABET_CUSTOM.indexOf(char);
        translated += index !== -1 ? ALPHABET_STANDARD.charAt(index) : char;
    }
    const decoded = atob(translated);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
}

function decodeWiiMText(text) {
    if (!text || text === "unknown" || text === "556E6B6E6F776E" || text === "Unkown" || text === "0") return "";
    
    let decoded = text;
    // If it looks like hex (possibly with spaces), try to decode it
    const cleanHex = text.replace(/\s+/g, '');
    if (/^[0-9A-Fa-f]+$/.test(cleanHex) && cleanHex.length % 2 === 0 && cleanHex.length > 4) {
        try {
            const bytes = new Uint8Array(cleanHex.length / 2);
            for (let i = 0; i < cleanHex.length; i += 2) {
                bytes[i/2] = parseInt(cleanHex.substr(i, 2), 16);
            }
            decoded = new TextDecoder("utf-8").decode(bytes);
        } catch (e) { 
            decoded = text; 
        }
    }
    
    // Unescape HTML/XML entities if present
    if (typeof decoded === 'string' && decoded.includes('&')) {
        try {
            const doc = new DOMParser().parseFromString(decoded, 'text/html');
            decoded = doc.documentElement.textContent || decoded;
        } catch (e) {}
    }
    
    return decoded;
}

function parseWiiMMetaData(metaData) {
    if (!metaData) return {};
    
    // If it's hex, decode it first
    let xml = metaData;
    if (/^[0-9A-Fa-f\s]+$/.test(metaData) && metaData.length > 10) {
        xml = decodeWiiMText(metaData);
    }
    
    if (!xml || (typeof xml === 'string' && !xml.includes('<'))) {
        return {};
    }
    
    console.log("XML Parser: Analyzing XML...");
    const results = {};
    const getTagValue = (tag) => {
        // More robust regex for UPnP/DIDL-Lite tags
        // Matches <tag>, <ns:tag>, <tag attr="val">, etc.
        const re = new RegExp(`<(?:[\\w\\d]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w\\d]+:)?${tag}>`, 'i');
        const m = xml.match(re);
        if (m) {
            let val = m[1].trim();
            // Sometimes values are CDATA wrapped
            if (val.startsWith('<![CDATA[')) {
                val = val.substring(9, val.length - 3);
            }
            console.log(`XML Parser: Found ${tag}`);
            return val;
        }
        return null;
    };

    try {
        results.title = getTagValue('title');
        results.artist = getTagValue('artist') || getTagValue('creator');
        results.album = getTagValue('album');
        // Check multiple common art tags
        results.artUrl = getTagValue('albumArtURI') || getTagValue('icon') || getTagValue('logo') || getTagValue('albumArtUrl') || getTagValue('cover');
        
        // Fallback 1: Search for any URL ending in an image extension within the XML
        if (!results.artUrl) {
            const artRe = /https?:\/\/[^<"']+\.(?:jpg|jpeg|png|webp|gif|bmp)[^<"']*/i;
            const artMatch = xml.match(artRe);
            if (artMatch) {
                results.artUrl = artMatch[0].trim();
                console.log("XML Parser: Found art URL via generic regex:", results.artUrl);
            }
        }
        
        // Fallback 2: Check for relative paths in albumArtURI specifically
        if (!results.artUrl) {
            const relArtRe = /<(?:[\w\d]+:)?albumArtURI[^>]*>([^<]+)<\//i;
            const relArtMatch = xml.match(relArtRe);
            if (relArtMatch) {
                results.artUrl = relArtMatch[1].trim();
                console.log("XML Parser: Found possible relative art path:", results.artUrl);
            }
        }
    } catch (e) {
        console.warn("XML Parser: Error:", e);
    }
    return results;
}

// API Fetching
async function fetchDevice(path) {
    const ipInput = document.getElementById('deviceIp')?.value.trim();
    if (!ipInput) return null;
    const ip = ipInput.replace(/^https?:\/\//, '').split('/')[0];
    if (!ip) return null;
    
    const url = `http://${ip}${path}`;
    console.debug(`Device Fetch (Direct): ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        const statusDot = document.getElementById('statusDot');
        if (statusDot) statusDot.style.backgroundColor = "#30d158";
        return text;
    } catch (e) {
        clearTimeout(timeoutId);
        console.error("Device Fetch error:", e);
        const currentState = document.getElementById('currentState');
        if (currentState && !path.includes('syncData')) {
            currentState.innerText = "Error: " + e.message;
        }
        const deviceName = document.getElementById('deviceName');
        if (deviceName) deviceName.innerText = "Unreachable";
        
        const statusDot = document.getElementById('statusDot');
        if (statusDot) statusDot.style.backgroundColor = "#ff3b30";
        return null;
    }
}

async function fetchWiiM(path) {
    const ipInput = document.getElementById('wiimIp')?.value.trim();
    if (!ipInput) return null;
    const ip = ipInput.replace(/^https?:\/\//, '').split('/')[0];
    if (!ip) return null;
    
    const targetUrl = `https://${ip}${path}`;
    const url = `/proxy?url=${encodeURIComponent(targetUrl)}`;
    console.debug(`WiiM Fetch (Proxied): ${targetUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const text = await response.text();
        
        if (!response.ok) {
            console.warn(`WiiM Error: ${response.status} ${response.statusText} - ${text}`);
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            console.log(`WiiM Response is not JSON: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
            return { raw: text };
        }
    } catch (e) { 
        clearTimeout(timeoutId);
        console.debug(`WiiM Fetch Failed: ${targetUrl}`, e);
        return null; 
    }
}

async function sendWiimCmd(cmd) {
    const ipInput = document.getElementById('wiimIp')?.value.trim();
    if (!ipInput) return;
    const ip = ipInput.replace(/^https?:\/\//, '').split('/')[0];
    if (!ip) return;

    const targetUrl = `https://${ip}/httpapi.asp?command=${cmd}`;
    const url = `/proxy?url=${encodeURIComponent(targetUrl)}`;
    console.debug(`WiiM Command (Proxied): ${targetUrl}`);
    try {
        await fetch(url);
        console.debug(`WiiM Command Sent: ${cmd}`);
        if (typeof refreshWiiMState === 'function') {
            setTimeout(refreshWiiMState, 500);
        }
    } catch (e) { 
        console.error(`WiiM Command Failed: ${targetUrl}`, e);
    }
}

// UI Helpers
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) panel.classList.toggle('hidden');
}

// PWA Helpers
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA: Install prompt deferred. "Install as App" button is now available in Advanced Settings.');
    const btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'block';
});

async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        deferredPrompt = null;
        const btn = document.getElementById('installBtn');
        if (btn) btn.style.display = 'none';
    }
}

async function clearAppCache() {
    if (confirm('This will unregister the service worker and clear all local caches. The app will then reload. Continue?')) {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let name of cacheNames) {
                await caches.delete(name);
            }
        }
        window.location.reload();
    }
}

// Initialization
function initApp() {
    // Load saved IPs
    const savedIp = localStorage.getItem('deviceIp');
    if (savedIp) {
        const input = document.getElementById('deviceIp');
        if (input) input.value = savedIp;
    }
    const savedWiimIp = localStorage.getItem('wiimIp');
    if (savedWiimIp) {
        const input = document.getElementById('wiimIp');
        if (input) input.value = savedWiimIp;
    }

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
}

// Global state update (called periodically)
async function globalRefresh() {
    const deviceIpInput = document.getElementById('deviceIp');
    if (deviceIpInput) {
        const ip = deviceIpInput.value.trim().replace(/^https?:\/\//, '').split('/')[0];
        if (ip) localStorage.setItem('deviceIp', ip);
    }

    const wiimIpInput = document.getElementById('wiimIp');
    if (wiimIpInput) {
        const ip = wiimIpInput.value.trim().replace(/^https?:\/\//, '').split('/')[0];
        if (ip) localStorage.setItem('wiimIp', ip);
    }

    if (typeof refreshAmpState === 'function') await refreshAmpState();
    if (typeof refreshWiiMState === 'function') await refreshWiiMState();
}
