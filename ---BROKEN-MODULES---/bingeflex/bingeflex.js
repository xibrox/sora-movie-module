async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=68e094699525b18a70bab2f86b1fa706&query=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://bingeflix.tv/movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://bingeflix.tv/tv/${result.id}`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://bingeflix.tv/tv/${result.id}`
                };
            }
        });

        console.log('Transformed search results: ' + JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/bingeflix\.tv\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/bingeflix\.tv\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
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
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/bingeflix\.tv\/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://bingeflix.tv/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/bingeflix\.tv\/tv\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://bingeflix.tv/tv/${showId}?season=${seasonNumber}&episode=${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }

            console.log('All episodes: ' + JSON.stringify(allEpisodes));
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

// searchResults("Breaking bad");
// extractDetails("https://bingeflix.tv/tv/1396");
// extractEpisodes("https://bingeflix.tv/tv/1396");
extractStreamUrl("https://bingeflix.tv/tv/1396?season=1&episode=1");

// extractStreamUrl("https://bingeflix.tv/movie/157336");

async function extractStreamUrl(url) {
    try {
        let providers = [];

        if (url.includes('/movie/')) {
            const match = url.match(/https:\/\/bingeflix\.tv\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            const response = await soraFetch(`https://play2.123embed.net/server/6?path=/movie/${movieId}`);
            const data = await response.json();

            const iframeUrl = data.iframe;
            const iframeResponse = await soraFetch(iframeUrl);
            const iframeHtml = await iframeResponse.text();

            const regex = /loadMovieServer\('(\d+)',\s*'([^']+)'\)/g;
            let m;
            const seen = new Set();

            while ((m = regex.exec(iframeHtml)) !== null) {
                const key = `${m[1]}-${m[2]}`;
                if (seen.has(key)) continue;
                seen.add(key);
                providers.push({ showId: m[1], provider: m[2] });
            }

            console.log('Providers found: ' + JSON.stringify(providers));

            const tasks = providers.map(async ({ showId, provider }) => {
                try {
                    if (["hydrax", "ytstream", "gd-hls", "gd-proxy"].includes(provider)) {
                        return null;
                    }

                    const providerUrl = `https://play.123embed.net/ajax/movie/get_sources/${showId}/${provider}`;
                    const providerResponse = await soraFetch(providerUrl);
                    const providerData = await providerResponse.json();

                    let sources = providerData.sources;
                    let tracks = providerData.tracks;

                    if (typeof sources === "string") sources = JSON.parse(sources || "[]");
                    if (typeof tracks === "string") tracks = JSON.parse(tracks || "[]");

                    if (!Array.isArray(sources) || sources.length === 0) return null;

                    const streams = sources.map(s => ({
                        title: `${provider.toUpperCase()} - ${s.label || "Source"}`,
                        streamUrl: s.file,
                        headers: {}
                    }));

                    let subtitle = "";
                    if (Array.isArray(tracks) && tracks.length > 0) {
                        const eng = tracks.find(t => /english/i.test(t.label));
                        subtitle = eng ? eng.file : tracks[0].file;
                    }

                    return { streams, subtitle };
                } catch (err) {
                    console.error(`❌ Failed provider ${provider}:`, err);
                    return null;
                }
            });

            const results = (await Promise.all(tasks)).filter(Boolean);

            const allStreams = results.flatMap(r => r.streams);
            const subtitle = results.find(r => r.subtitle)?.subtitle || "";

            const transformedResults = { streams: allStreams, subtitles: subtitle };

            console.log('Transformed stream results: ' + JSON.stringify(transformedResults));
            return JSON.stringify(transformedResults);
        } else if (url.includes('/tv/')) {
            const match = url.match(/https:\/\/bingeflix\.tv\/tv\/([^\/]+)\?season=(\d+)&episode=(\d+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];
            const response = await soraFetch(`https://play2.123embed.net/server/6?path=/tv/${showId}/${seasonNumber}/${episodeNumber}`);
            const data = await response.json();

            const iframeUrl = data.iframe;
            const iframeResponse = await soraFetch(iframeUrl);
            const iframeHtml = await iframeResponse.text();

            const regex = /loadSerieEpisode\('(\d+)',\s*(\d+),\s*'([^']+)'\)/g;
            let m;
            const seen = new Set();
            const providers = [];

            while ((m = regex.exec(iframeHtml)) !== null) {
                const key = `${m[1]}-${m[2]}-${m[3]}`;
                if (seen.has(key)) continue;
                seen.add(key);

                providers.push({
                    showId: m[1],
                    episodeNumber: m[2],
                    provider: m[3]
                });
            }

            console.log(providers);

            const tasks = providers.map(async ({ showId, episodeNumber, provider }) => {
                try {
                    if (["hydrax", "ytstream", "gd-hls", "gd-proxy"].includes(provider)) {
                        return null;
                    }

                    let streams = [];
                    let subtitle = "";

                    if (provider === "2embed") {
                        // const embedUrl = `https://www.2embed.cc/embedtv/${showId}&s=${episodeNumber}&e=${episodeNumber}`;
                        // streams.push({
                        //     title: `${provider.toUpperCase()} - EMBED`,
                        //     streamUrl: embedUrl,
                        //     headers: {}
                        // });

                        const providerUrl = `https://play.123embed.net/ajax/serie/get_sources/${showId}/${episodeNumber}/${provider}`;
                        const providerResponse = await soraFetch(providerUrl);
                        const providerData = await providerResponse.json();

                        console.log("Provider Data: " + JSON.stringify(providerData));

                        let source = providerData.sources;
                        let tracks = providerData.tracks;

                        const sourceResponse = await soraFetch(source);
                        const sourceHtml = await sourceResponse.text();

                        const match = sourceHtml.match(/data-src="([^"]+)"/);

                        const iframeSrc = match ? match[1] : null;

                        console.log(iframeSrc);

                        const headers = {
                            'Referer': 'https://vidapi.xyz/',
                        };

                        let streams = [];
                        let subtitles = '';

                        if (iframeSrc.includes("uqloads.xyz")) {
                            const iframeResponse = await soraFetch(iframeSrc, { headers });
                            const iframeHtml = await iframeResponse.text();

                            const packedScriptMatch = iframeHtml.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                            if (!packedScriptMatch) {
                                throw new Error("No packed script found in the iframe.");
                            }
                            const packedScript = packedScriptMatch[1];
                            console.log("Packed script found.");
                            const unpackedScript = unpack(packedScript);
                            console.log("Unpacked script:", unpackedScript);

                            const streamRegex = /"hls[1-9]":\s*"([^"]+)"/g;
                            let streamMatch;
                            while ((streamMatch = streamRegex.exec(unpackedScript)) !== null) {
                                const streamUrl = streamMatch[1].trim();

                                if (
                                    streamUrl.startsWith("https://") &&
                                    (streamUrl.includes(".m3u8") || streamUrl.includes(".mp4"))
                                ) {
                                    streams.push({
                                        title: `Stream ${streams.length + 1}`,
                                        url: streamUrl,
                                        headers: {}
                                    });
                                } else {
                                    console.log("Skipping invalid or relative Vidapi stream:", streamUrl);
                                }

                                // streams.push(streamMatch[1].trim());
                            }

                            const subtitlesRegex = /tracks\s*:\s*\[[\s\S]*?{\s*file\s*:\s*"([^"]+)"\s*,\s*label\s*:\s*"[^"]+"\s*,\s*kind\s*:\s*"captions"/;
                            const subtitlesMatch = unpackedScript.match(subtitlesRegex);
                            subtitles = subtitlesMatch ? subtitlesMatch[1].trim() : '';
                            console.log("Subtitles URL:", subtitles);
                        } else if (iframeSrc.includes("player4u.xyz")) {
                            const iframeResponse = await soraFetch(iframeSrc, { headers });
                            const html = await iframeResponse.text();

                            const liRegex = /<li class="slide-toggle">([\s\S]*?)<\/li>/g;
                            const entries = [];
                            let liMatch;
                            while ((liMatch = liRegex.exec(html)) !== null) {
                                const liContent = liMatch[1];
                                const urlMatch = liContent.match(/onclick="go\('([^']+)'\)"/);
                                if (!urlMatch) continue;
                                const entryUrl = urlMatch[1];
                                const resMatch = liContent.match(/&nbsp;(\d+p|4K)\b/);
                                const resolution = resMatch ? resMatch[1] : '';
                                entries.push({ url: entryUrl, resolution });
                            }

                            for (const entry of entries) {
                                const fullUrl = "https://player4u.xyz" + entry.url;
                                try {
                                    const resp = await soraFetch(fullUrl, { headers });
                                    const iframeData = await resp.text();

                                    const innerIframeMatch = iframeData.match(/<iframe[^>]+src=["']([^"']+)["']/);
                                    if (!innerIframeMatch) continue;
                                    let iframeSrc2 = innerIframeMatch[1].trim();
                                    if (!iframeSrc2.startsWith("http")) {
                                        iframeSrc2 = "https://uqloads.xyz/e/" + iframeSrc2;
                                    }
                                    console.log("Iframe src2:", iframeSrc2);

                                    const resp2 = await soraFetch(iframeSrc2, { headers });
                                    const iframeHtml = await resp2.text();
                                    console.log("Iframe HTML:", iframeHtml);

                                    const packedScriptMatch = iframeHtml.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                                    if (!packedScriptMatch) continue;
                                    const packedScript = packedScriptMatch[1];
                                    console.log("Packed script found.");
                                    const unpackedScript = unpack(packedScript);
                                    console.log("Unpacked script:", unpackedScript);

                                    const streamRegex = /"hls[1-9]":\s*"([^"]+)"/g;
                                    let streamMatch;
                                    while ((streamMatch = streamRegex.exec(unpackedScript)) !== null) {
                                        const streamUrl = streamMatch[1].trim();

                                        if (
                                            streamUrl.startsWith("https://") &&
                                            (streamUrl.includes(".m3u8") || streamUrl.includes(".mp4"))
                                        ) {
                                            streams.push({
                                                title: `Stream ${streams.length + 1}`,
                                                url: streamUrl,
                                                headers: {}
                                            });
                                        } else {
                                            console.log("Skipping invalid or relative Vidapi stream:", streamUrl);
                                        }

                                        // streams.push(streamMatch[1].trim());
                                    }

                                    if (!subtitles) {
                                        const subtitlesRegex = /tracks\s*:\s*\[[\s\S]*?{\s*file\s*:\s*"([^"]+)"\s*,\s*label\s*:\s*"[^"]+"\s*,\s*kind\s*:\s*"captions"/;
                                        const subtitlesMatch = unpackedScript.match(subtitlesRegex);
                                        subtitles = subtitlesMatch ? subtitlesMatch[1].trim() : '';
                                        console.log("Subtitles URL:", subtitles);
                                    }
                                } catch (err) {
                                    console.log("Error processing entry:", entry, err);
                                    continue;
                                }
                            }
                        }

                        return { streams, subtitle };
                    } else {
                        const providerUrl = `https://play.123embed.net/ajax/serie/get_sources/${showId}/${episodeNumber}/${provider}`;
                        const providerResponse = await soraFetch(providerUrl);
                        const providerData = await providerResponse.json();

                        let sources = providerData.sources;
                        let tracks = providerData.tracks;

                        if (typeof sources === "string") sources = JSON.parse(sources || "[]");
                        if (typeof tracks === "string") tracks = JSON.parse(tracks || "[]");

                        if (!Array.isArray(sources) || sources.length === 0) return null;

                        streams = sources.map(s => ({
                            title: `${provider.toUpperCase()} - ${s.label || "Source"}`,
                            streamUrl: s.file,
                            headers: {}
                        }));

                        if (Array.isArray(tracks) && tracks.length > 0) {
                            const eng = tracks.find(t => /english/i.test(t.label));
                            subtitle = eng ? eng.file : tracks[0].file;
                        }
                    }

                    return { streams, subtitle };

                } catch (err) {
                    console.error(`❌ Failed provider ${provider}:`, err);
                    return null;
                }
            });


            const results = (await Promise.all(tasks)).filter(Boolean);

            const allStreams = results.flatMap(r => r.streams);
            const subtitle = results.find(r => r.subtitle)?.subtitle || "";

            const transformedResults = { streams: allStreams, subtitles: subtitle };

            console.log('Transformed stream results: ' + JSON.stringify(transformedResults));
            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log("Fetch error in extractStreamUrl:", error);
        return { streams: [], subtitles: "" };
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}

class Unbaser {
    constructor(base) {
        /* Functor for a given base. Will efficiently convert
          strings to natural numbers. */
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        // fill elements 37...61, if necessary
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        // If base can be handled by int() builtin, let it do it for us
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            // Build conversion dictionary cache
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        /* Decodes a value to an integer. */
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}

function detect(source) {
    /* Detects whether `source` is P.A.C.K.E.R. coded. */
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
}

function unpack(source) {
    /* Unpacks P.A.C.K.E.R. packed js code. */
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        /* Look up symbols in the synthetic symtab. */
        const word = match;
        let word2;
        if (radix == 1) {
            //throw Error("symtab unknown");
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        /* Juice from a source file the four args needed by decoder. */
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            //const args = re.search(juicer, source, re.DOTALL);
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                    //don't know what it is
                    // a = list(a);
                    // a[1] = 62;
                    // a = tuple(a);
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        /* Strip string lookup table (list) and replace values in source. */
        /* Need to work on this. */
        return source;
    }
}