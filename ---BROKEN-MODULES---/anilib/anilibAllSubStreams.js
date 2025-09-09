// Utility functions for Kodik extractor
function extractStringSingleQuote(text, pattern) {
    const regex = new RegExp(`${pattern}\\s*=\\s*'([^']*)'`);
    const match = text.match(regex);
    return match ? match[1] : null;
}

function extractStringDoubleQuote(text, pattern) {
    const regex = new RegExp(`${pattern}\\s*=\\s*"([^"]*)"`);
    const match = text.match(regex);
    return match ? match[1] : null;
}

function extractFromScript(html, pattern) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    
    while ((match = scriptRegex.exec(html)) !== null) {
        const scriptContent = match[1];
        const result = pattern.test ? scriptContent.match(pattern) : scriptContent.includes(pattern);
        if (result) {
            return pattern.test ? result : scriptContent;
        }
    }
    return null;
}

function base64decode(str) {
    try {
        return Buffer.from(str, 'base64').toString();
    } catch (e) {
        return null;
    }
}

function decodeSrc(src) {
    try {
        // ROT13 decode
        src = src.replace(/[a-zA-Z]/g, e =>
            String.fromCharCode(
                (e <= "Z" ? 90 : 122) >= (e = e.charCodeAt(0) + 13) ? e : e - 26
            )
        );
        return base64decode(src);
    } catch (e) {
        return null;
    }
}

function linkExtractor(links, hls = true) {
    const bestQuality = Object.keys(links).pop();
    let redirectUrl = links[bestQuality][0].src;
    
    // Reverse and decode
    redirectUrl = Buffer.from(
        redirectUrl
            .split("")
            .reverse()
            .join(""),
        "base64"
    ).toString();
    
    if (!hls) {
        redirectUrl = redirectUrl.replace(":hls:manifest.m3u8", "");
    }
    return redirectUrl;
}

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// DDOS BYPASS CLASS
class DdosGuardInterceptor {
    constructor() {
        this.errorCodes = [403]; // Blocked by DDoS-Guard
        this.serverCheck = ["ddos-guard"]; // Server header check
        this.cookieStore = {}; // In-memory cookie storage
    }
    
    async fetchWithBypass(url, options = {}) {
        let response = await this.fetchWithCookies(url, options);
        
        // If request is successful or not blocked, return response
        if (!this.errorCodes.includes(response.status) && !this.isDdosGuard(response)) {
            return response;
        }
        
        console.error("DDoS-Guard detected, attempting to bypass...");
        
        // Check if we already have the __ddg2_ cookie
        if (this.cookieStore["__ddg2_"]) {
            console.error("Retrying request with existing DDoS-Guard cookie...");
            return this.fetchWithCookies(url, options);
        }
        
        // Get a new DDoS-Guard cookie
        const newCookie = await this.getNewCookie(url);
        if (!newCookie) {
            console.error("Failed to retrieve DDoS-Guard cookie.");
            return response;
        }
        
        console.error("New DDoS-Guard cookie acquired, retrying request...");
        return this.fetchWithCookies(url, options);
    }
    
    async fetchWithCookies(url, options) {
        const cookieHeader = this.getCookieHeader();
        const headers = { 
            ...options.headers, 
            ...(cookieHeader && { Cookie: cookieHeader })
        };
        
        const response = await fetch(url, { ...options, headers });
        
        // Store any new cookies received
        const setCookieHeader = response.headers.get("Set-Cookie");
        if (setCookieHeader) {
            this.storeCookies(setCookieHeader);
        }
        
        return response;
    }
    
    isDdosGuard(response) {
        const serverHeader = response.headers.get("Server");
        return serverHeader && this.serverCheck.some(check => 
            serverHeader.toLowerCase().includes(check)
        );
    }
    
    storeCookies(setCookieString) {
        setCookieString.split(";").forEach(cookieStr => {
            const [key, value] = cookieStr.split("=");
            if (key && key.trim()) {
                this.cookieStore[key.trim()] = value?.trim() || "";
            }
        });
    }
    
    getCookieHeader() {
        const cookies = Object.entries(this.cookieStore)
            .map(([key, value]) => `${key}=${value}`)
            .join("; ");
        return cookies || null;
    }
    
    async getNewCookie(targetUrl) {
        try {
            // Fetch the challenge path from DDoS-Guard
            const wellKnownResponse = await fetch("https://check.ddos-guard.net/check.js");
            const wellKnownText = await wellKnownResponse.text();
            const wellKnownPath = wellKnownText.split("'")[1];
            
            const regex = /^(https?:\/\/[^\/]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/;
            const newUrl = targetUrl.replace(regex, (match, baseUrl, pathname, query, fragment) => {
                // If pathname exists, replace it; otherwise, just append the newPath
                return `${baseUrl}${wellKnownPath}${query || ''}${fragment || ''}`;
            });
            
            // Make a request to the challenge URL
            const checkResponse = await this.fetchWithCookies(newUrl, {});
            const setCookieHeader = checkResponse.headers.get("Set-Cookie");
            if (!setCookieHeader) return null;
            
            // Store and return the new DDoS-Guard cookie
            this.storeCookies(setCookieHeader);
            return this.cookieStore["__ddg2_"];
        } catch (error) {
            console.error("Error fetching DDoS-Guard cookies:");
            console.error(error.message);
            return null;
        }
    }
}

// Create a global instance of the DDoS guard interceptor
const ddosGuard = new DdosGuardInterceptor();

// Enhanced Kodik stream extraction with multiple approaches
async function extractKodikStreamEnhanced(kodikUrl) {
    try {
        if (kodikUrl.startsWith('//')) {
            kodikUrl = 'https:' + kodikUrl;
        }

        console.log('Fetching Kodik page:', kodikUrl);

        const response = await ddosGuard.fetchWithBypass(kodikUrl, {
            headers: {
                'User-Agent': userAgent,
                'Referer': 'https://anilib.me/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        console.log('Page loaded, length:', html.length);

        // Extract video info
        const videoId = extractStringSingleQuote(html, "videoInfo\\.id") || 
                       extractStringDoubleQuote(html, "videoInfo\\.id");
        const videoHash = extractStringSingleQuote(html, "videoInfo\\.hash") || 
                         extractStringDoubleQuote(html, "videoInfo\\.hash");

        console.log('Extracted video info:', { videoId, videoHash });

        // Try multiple API endpoints and approaches
        const apiEndpoints = [
            "https://kodik.info/gvi",
            "https://kodik.info/get-video-info",
            "https://kodik.cc/gvi",
            "https://kodik.cc/get-video-info"
        ];

        if (videoId && videoHash) {
            for (const apiUrl of apiEndpoints) {
                try {
                    console.log(`Trying API endpoint: ${apiUrl}`);
                    
                    // Extract authentication parameters more thoroughly
                    const authParams = extractAuthParams(html);
                    console.log('Auth params:', authParams);

                    const videoInfoParams = {
                        id: videoId,
                        hash: videoHash,
                        type: 'seria',
                        bad_user: false,
                        info: '{}',
                        ...authParams
                    };

                    const formData = new URLSearchParams();
                    Object.keys(videoInfoParams).forEach(key => {
                        if (videoInfoParams[key] !== null && videoInfoParams[key] !== undefined) {
                            formData.append(key, videoInfoParams[key]);
                        }
                    });

                    const apiResponse = await ddosGuard.fetchWithBypass(apiUrl, {
                        method: "POST",
                        headers: {
                            "User-Agent": userAgent,
                            "Referer": kodikUrl,
                            "Origin": new URL(kodikUrl).origin,
                            "Content-Type": "application/x-www-form-urlencoded",
                            "X-Requested-With": "XMLHttpRequest"
                        },
                        body: formData
                    });

                    console.log(`API Response status for ${apiUrl}:`, apiResponse.status);
                    
                    if (apiResponse.ok) {
                        const videoInfoText = await apiResponse.text();
                        console.log('API Response:', videoInfoText.substring(0, 500));
                        
                        try {
                            const videoInfo = JSON.parse(videoInfoText);
                            console.log('Parsed video info:', JSON.stringify(videoInfo, null, 2));
                            
                            if (videoInfo.links) {
                                const redirectUrl = linkExtractor(videoInfo.links, true);
                                const decodedUrl = decodeSrc(redirectUrl);
                                const finalUrl = decodedUrl.startsWith('//') ? 'https:' + decodedUrl : decodedUrl;
                                console.log('Successfully extracted stream:', finalUrl);
                                return finalUrl;
                            }
                        } catch (parseError) {
                            console.log('Failed to parse API response as JSON:', parseError.message);
                        }
                    }
                } catch (apiError) {
                    console.log(`API call failed for ${apiUrl}:`, apiError.message);
                }
            }
        }

        // Enhanced pattern matching for direct stream extraction
        console.log('Trying enhanced pattern matching...');
        
        // Look for iframe sources that might contain the actual stream
        const streamUrl = await tryDirectStreamExtraction(html, kodikUrl);
        if (streamUrl) {
            return streamUrl;
        }

        // Try to find embedded player configurations
        const playerConfigStream = extractPlayerConfig(html);
        if (playerConfigStream) {
            return playerConfigStream;
        }

        // Look for AJAX calls that might load the stream
        const ajaxStream = await tryAjaxStreamExtraction(html, kodikUrl);
        if (ajaxStream) {
            return ajaxStream;
        }

        console.log('All extraction methods failed');
        return null;

    } catch (error) {
        console.error('Error in extractKodikStreamEnhanced:', error);
        return null;
    }
}

// Extract authentication parameters more thoroughly
function extractAuthParams(html) {
    const authParams = {};
    
    // More comprehensive parameter patterns
    const paramPatterns = {
        'd': [
            /['"]*d['"]*\s*:\s*['"]([^'"]*)['"]/g,
            /var\s+d\s*=\s*['"]([^'"]*)['"]/g,
            /domain['"]*\s*:\s*['"]([^'"]*)['"]/g
        ],
        'd_sign': [
            /['"]*d_sign['"]*\s*:\s*['"]([^'"]*)['"]/g,
            /var\s+d_sign\s*=\s*['"]([^'"]*)['"]/g
        ],
        'pd': [
            /['"]*pd['"]*\s*:\s*['"]([^'"]*)['"]/g,
            /var\s+pd\s*=\s*['"]([^'"]*)['"]/g
        ],
        'pd_sign': [
            /['"]*pd_sign['"]*\s*:\s*['"]([^'"]*)['"]/g,
            /var\s+pd_sign\s*=\s*['"]([^'"]*)['"]/g
        ],
        'ref': [
            /['"]*ref['"]*\s*:\s*['"]([^'"]*)['"]/g,
            /var\s+ref\s*=\s*['"]([^'"]*)['"]/g
        ],
        'ref_sign': [
            /['"]*ref_sign['"]*\s*:\s*['"]([^'"]*)['"]/g,
            /var\s+ref_sign\s*=\s*['"]([^'"]*)['"]/g
        ]
    };

    for (const [key, patterns] of Object.entries(paramPatterns)) {
        for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
                authParams[key] = matches[0][1];
                console.log(`Found ${key}:`, matches[0][1]);
                break;
            }
        }
    }

    return authParams;
}

// Try direct stream extraction from HTML
async function tryDirectStreamExtraction(html, kodikUrl) {
    console.log('Trying direct stream extraction...');
    
    const streamPatterns = [
        // HLS streams
        /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
        /\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
        
        // MP4 streams
        /https?:\/\/[^"'\s]*\.mp4[^"'\s]*/gi,
        /\/\/[^"'\s]*\.mp4[^"'\s]*/gi,
        
        // Look for src attributes in video/source tags
        /<(?:video|source)[^>]*src\s*=\s*['"]([^'"]*)['"]/gi,
        
        // Look for data-src attributes
        /data-src\s*=\s*['"]([^'"]*)['"]/gi,
        
        // Look for file URLs in JavaScript
        /file\s*:\s*['"]([^'"]*)['"]/gi,
        /url\s*:\s*['"]([^'"]*)['"]/gi,
        /source\s*:\s*['"]([^'"]*)['"]/gi
    ];

    for (const pattern of streamPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
            let url = match[1] || match[0];
            
            // Clean up the URL
            url = url.replace(/['"]/g, '');
            
            if (url.includes('.m3u8') || url.includes('.mp4')) {
                console.log('Found potential direct stream:', url);
                
                // Test if the stream is accessible
                try {
                    const testResponse = await ddosGuard.fetchWithBypass(url.startsWith('//') ? 'https:' + url : url, {
                        method: 'HEAD',
                        headers: {
                            'User-Agent': userAgent,
                            'Referer': kodikUrl
                        }
                    });
                    
                    if (testResponse.ok) {
                        console.log('Stream confirmed accessible:', url);
                        return url.startsWith('//') ? 'https:' + url : url;
                    }
                } catch (e) {
                    console.log('Stream test failed for:', url);
                }
            }
        }
    }
    
    return null;
}

// Extract player configuration
function extractPlayerConfig(html) {
    console.log('Trying player config extraction...');
    
    // Look for various player configurations
    const configPatterns = [
        /videojs\s*\([^)]*,\s*({[^}]+})/g,
        /jwplayer\s*\([^)]*\)\.setup\s*\(\s*({[^}]+})/g,
        /player\s*=\s*({[^}]+})/g,
        /config\s*:\s*({[^}]+})/g
    ];

    for (const pattern of configPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
            try {
                const configStr = match[1];
                console.log('Found config:', configStr.substring(0, 200));
                
                // Try to extract stream URLs from the config
                const streamMatch = configStr.match(/['"]([^'"]*\.m3u8[^'"]*)['"]/);
                if (streamMatch) {
                    const streamUrl = streamMatch[1];
                    console.log('Found stream in config:', streamUrl);
                    return streamUrl.startsWith('//') ? 'https:' + streamUrl : streamUrl;
                }
            } catch (e) {
                console.log('Failed to parse config:', e.message);
            }
        }
    }
    
    return null;
}

// Try AJAX stream extraction
async function tryAjaxStreamExtraction(html, kodikUrl) {
    console.log('Trying AJAX stream extraction...');
    
    // Look for AJAX calls that might load streams
    const ajaxPatterns = [
        /\$\.ajax\s*\(\s*({[^}]+})/g,
        /\$\.post\s*\(\s*['"]([^'"]*)['"]/g,
        /fetch\s*\(\s*['"]([^'"]*)['"]/g,
        /XMLHttpRequest[^;]*\.open\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]*)['"]/g
    ];

    for (const pattern of ajaxPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
            const endpoint = match[1] || match[2];
            if (endpoint && endpoint.includes('video') || endpoint.includes('stream') || endpoint.includes('play')) {
                console.log('Found potential AJAX endpoint:', endpoint);
                
                try {
                    const ajaxUrl = endpoint.startsWith('/') ? new URL(kodikUrl).origin + endpoint : endpoint;
                    const response = await ddosGuard.fetchWithBypass(ajaxUrl, {
                        headers: {
                            'User-Agent': userAgent,
                            'Referer': kodikUrl,
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.text();
                        console.log('AJAX response:', data.substring(0, 200));
                        
                        // Look for streams in the response
                        const streamMatch = data.match(/https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/);
                        if (streamMatch) {
                            console.log('Found stream in AJAX response:', streamMatch[0]);
                            return streamMatch[0];
                        }
                    }
                } catch (e) {
                    console.log('AJAX call failed:', e.message);
                }
            }
        }
    }
    
    return null;
}

// Updated main extraction function
async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/anilib\.me\/ru\/anime\/([^\/]+)\/watch\?episode=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const episodeId = match[2];

        const responseText = await ddosGuard.fetchWithBypass(`https://api2.mangalib.me/api/episodes/${episodeId}`, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json'
            }
        });
        const data = await responseText.json();

        console.log('Episode data loaded');

        const animePlayers = data.data.players;
        console.log('Available players:', animePlayers.length);

        let kodikUrl = null;

        // Find Kodik player with subtitles (prefer subtitles, fallback to any Kodik)
        for (let i = 0; i < animePlayers.length; i++) {
            if (animePlayers[i].player === "Kodik") {
                if (animePlayers[i].translation_type.label === "Субтитры") {
                    kodikUrl = animePlayers[i].src;
                    console.log('Found Kodik with subtitles');
                    break;
                } else if (!kodikUrl) {
                    kodikUrl = animePlayers[i].src;
                    console.log('Found Kodik player (no subtitles)');
                }
            }
        }

        if (!kodikUrl) {
            console.log('No Kodik player found');
            return JSON.stringify({ stream: null, error: 'No Kodik player found' });
        }

        console.log('Kodik URL:', kodikUrl);

        // Use enhanced extraction
        const streamUrl = await extractKodikStreamEnhanced(kodikUrl);
        
        if (streamUrl) {
            const result = {
                stream: streamUrl,
                subtitles: ""
            };

            console.log('Final result:', result);
            return JSON.stringify(result);
        }

        console.log('Stream extraction failed');
        return JSON.stringify({ stream: null, error: 'Failed to extract stream' });

    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return JSON.stringify({ stream: null, error: error.message });
    }
}

// Keep your existing functions
async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const apiUrl = `https://api2.mangalib.org/api/anime?q=${encodedKeyword}`;

        const responseText = await ddosGuard.fetchWithBypass(apiUrl, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json'
            }
        });
        const data = await responseText.json();

        const transformedResults = data.data.map(result => {
            return {
                title: result.rus_name || result.eng_name || result.name,
                image: result.cover.default,
                href: `https://anilib.org/ru/anime/${result.slug_url}`
            };
        });

        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/anilib\.me\/ru\/anime\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeSlug = match[1];

        const responseText = await ddosGuard.fetchWithBypass(`https://api2.mangalib.me/api/anime/${animeSlug}?fields[]=background&fields[]=eng_name&fields[]=otherNames&fields[]=summary&fields[]=releaseDate&fields[]=type_id&fields[]=caution&fields[]=views&fields[]=close_view&fields[]=rate_avg&fields[]=rate&fields[]=genres&fields[]=tags&fields[]=teams&fields[]=user&fields[]=franchise&fields[]=authors&fields[]=publisher&fields[]=userRating&fields[]=moderated&fields[]=metadata&fields[]=metadata.count&fields[]=metadata.close_comments&fields[]=anime_status_id&fields[]=time&fields[]=episodes&fields[]=episodes_count&fields[]=episodesSchedule`, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json'
            }
        });
        const animeData = await responseText.json();

        const data = animeData.data;

        const transformedResults = [{
            description: data.summary || 'Без описания',
            aliases: `Длительность: ${data.time.formated}` || 'Без длительности',
            airdate: `Дата выхода: ${data.releaseDateString ? data.releaseDateString : 'Без даты'}`,
        }];

        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/anilib\.me\/ru\/anime\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeSlug = match[1];

        const responseText = await fetch(`https://api2.mangalib.me/api/episodes?anime_id=${animeSlug}`);
        const data = await responseText.json();

        const transformedResults = data.data.map(result => {
            return {
                href: `https://anilib.me/ru/anime/${animeSlug}/watch?episode=${result.id}`,
                number: result.item_number,
                title: result.name
            };
        });

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

// Test the function
console.log('Testing enhanced extraction...');
extractStreamUrl(`https://anilib.me/ru/anime/20591--ore-dake-level-up-na-ken-anime/watch?episode=116858`);