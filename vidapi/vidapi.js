async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetchv2(`https://api.themoviedb.org/3/search/multi?api_key=71fdb081b0133511ac14ac0cc10fd307&query=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://vidapi.xyz/embed/movie/${result.id}`
                };
            }
            else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://vidapi.xyz/embed/tv/${result.id}&s=1&e=1`
                };
            } else {
                return {
                    title: result.title || result.name || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://vidapi.xyz/embed/tv/${result.id}&s=1&e=1`
                };
            }
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('/embed/movie/')) {
            const match = url.match(/https:\/\/vidapi\.xyz\/embed\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/movie/${movieId}?api_key=71fdb081b0133511ac14ac0cc10fd307&append_to_response=videos,credits`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/embed/tv/')) {
            const match = url.match(/https:\/\/vidapi\.xyz\/embed\/tv\/([^\/]+)\&s=([^&]+)\&e=([^&]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=71fdb081b0133511ac14ac0cc10fd307&append_to_response=seasons`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        if(url.includes('/embed/movie/')) {
            const match = url.match(/https:\/\/vidapi\.xyz\/embed\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const movieId = match[1];
            return JSON.stringify([
                { href: `https://vidapi.xyz/embed/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/embed/tv/')) {
            const match = url.match(/https:\/\/vidapi\.xyz\/embed\/tv\/([^\/]+)\&s=([^&]+)\&e=([^&]+)/);
            if (!match) throw new Error("Invalid URL format");
            const showId = match[1];
            
            const showResponseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=71fdb081b0133511ac14ac0cc10fd307`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=71fdb081b0133511ac14ac0cc10fd307`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://vidapi.xyz/embed/tv/${showId}&s=${seasonNumber}&e=${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        if (url.includes('/embed/movie/')) {
            const match = url.match(/https:\/\/vidapi\.xyz\/embed\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            try {
                const responseText = await fetchv2(`https://vidapi.xyz/embed/movie/${movieId}`);
                const data = await responseText.text();

                const iframeMatch = data.match(/<iframe[^>]+src=["']([^"']+)["']/);
                if (!iframeMatch) {
                    throw new Error("No iframe found in the main page.");
                }
                let iframeSrc = iframeMatch[1].trim();

                if (!iframeSrc.startsWith("http")) {
                    iframeSrc = "https://uqloads.xyz/e/" + iframeSrc;
                }

                console.log("Iframe src:", iframeSrc);

                const headers = {
                    'Referer': 'https://vidapi.xyz/',
                };

                let streams = [];
                let subtitles = '';

                if (iframeSrc.includes("uqloads.xyz")) {
                    const iframeResponse = await fetchv2(iframeSrc, headers);
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
                        streams.push(streamMatch[1].trim());
                    }

                    const subtitlesRegex = /tracks\s*:\s*\[[\s\S]*?{\s*file\s*:\s*"([^"]+)"\s*,\s*label\s*:\s*"[^"]+"\s*,\s*kind\s*:\s*"captions"/;
                    const subtitlesMatch = unpackedScript.match(subtitlesRegex);
                    subtitles = subtitlesMatch ? subtitlesMatch[1].trim() : '';
                    console.log("Subtitles URL:", subtitles);
                } else if (iframeSrc.includes("player4u.xyz")) {
                    const iframeResponse = await fetchv2(iframeSrc, headers);
                    const html = await iframeResponse.text();

                    const liRegex = /<li class="slide-toggle">([\s\S]*?)<\/li>/g;
                    const entries = [];
                    let liMatch;
                    while ((liMatch = liRegex.exec(html)) !== null) {
                        const liContent = liMatch[1];
                        const urlMatch = liContent.match(/onclick="go\('([^']+)'\)"/);
                        if (!urlMatch) continue;
                        const entryUrl = urlMatch[1];
                        entries.push(entryUrl);
                    }

                    for (const entry of entries) {
                        const fullUrl = "https://player4u.xyz" + entry;
                        try {
                            const resp = await fetchv2(fullUrl, headers);
                            const iframeData = await resp.text();

                            const innerIframeMatch = iframeData.match(/<iframe[^>]+src=["']([^"']+)["']/);
                            if (!innerIframeMatch) continue;
                            let iframeSrc2 = innerIframeMatch[1].trim();
                            if (!iframeSrc2.startsWith("http")) {
                                iframeSrc2 = "https://uqloads.xyz/e/" + iframeSrc2;
                            }
                            console.log("Iframe src2:", iframeSrc2);

                            const resp2 = await fetchv2(iframeSrc2, headers);
                            const iframeHtml2 = await resp2.text();
                            console.log("Iframe HTML:", iframeHtml2);

                            const packedScriptMatch = iframeHtml2.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                            if (!packedScriptMatch) continue;
                            const packedScript = packedScriptMatch[1];
                            console.log("Packed script found.");
                            const unpackedScript = unpack(packedScript);
                            console.log("Unpacked script:", unpackedScript);

                            const streamRegex = /"hls[1-9]":\s*"([^"]+)"/g;
                            let innerStreamMatch;
                            while ((innerStreamMatch = streamRegex.exec(unpackedScript)) !== null) {
                                streams.push(innerStreamMatch[1].trim());
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

                const result = { streams, subtitles };
                console.log(JSON.stringify(result));
                return JSON.stringify(result);
            } catch (err) {
                console.log(`Fetch error on endpoint https://vidapi.xyz/embed/movie/${movieId} for movie ${movieId}:`, err);
            }
        } else if (url.includes('/embed/tv/')) {
            const match = url.match(/https:\/\/vidapi\.xyz\/embed\/tv\/([^\/]+)\&s=([^&]+)\&e=([^&]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            try {
                const responseText = await fetchv2(`https://vidapi.xyz/embed/tv/${showId}&s=${seasonNumber}&e=${episodeNumber}`);
                const data = await responseText.text();

                const iframeMatch = data.match(/<iframe[^>]+src=["']([^"']+)["']/);
                if (!iframeMatch) {
                    throw new Error("No iframe found in the main page.");
                }
                let iframeSrc = iframeMatch[1].trim();

                if (!iframeSrc.startsWith("http")) {
                    iframeSrc = "https://uqloads.xyz/e/" + iframeSrc;
                }
                console.log("Iframe src:", iframeSrc);

                const headers = {
                    'Referer': 'https://vidapi.xyz/',
                };

                let streams = [];
                let subtitles = '';

                if (iframeSrc.includes("uqloads.xyz")) {
                    const iframeResponse = await fetchv2(iframeSrc, headers);
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
                        streams.push(streamMatch[1].trim());
                    }

                    const subtitlesRegex = /tracks\s*:\s*\[[\s\S]*?{\s*file\s*:\s*"([^"]+)"\s*,\s*label\s*:\s*"[^"]+"\s*,\s*kind\s*:\s*"captions"/;
                    const subtitlesMatch = unpackedScript.match(subtitlesRegex);
                    subtitles = subtitlesMatch ? subtitlesMatch[1].trim() : '';
                    console.log("Subtitles URL:", subtitles);
                } else if (iframeSrc.includes("player4u.xyz")) {
                    const iframeResponse = await fetchv2(iframeSrc, headers);
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
                            const resp = await fetchv2(fullUrl, headers);
                            const iframeData = await resp.text();

                            const innerIframeMatch = iframeData.match(/<iframe[^>]+src=["']([^"']+)["']/);
                            if (!innerIframeMatch) continue;
                            let iframeSrc2 = innerIframeMatch[1].trim();
                            if (!iframeSrc2.startsWith("http")) {
                                iframeSrc2 = "https://uqloads.xyz/e/" + iframeSrc2;
                            }
                            console.log("Iframe src2:", iframeSrc2);

                            const resp2 = await fetchv2(iframeSrc2, headers);
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
                                streams.push(streamMatch[1].trim());
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

                const result = { streams, subtitles };
                console.log(JSON.stringify(result));
                return JSON.stringify(result);
            } catch (err) {
                console.log(`Fetch error on endpoint https://vidapi.xyz/embed/tv/${showId}&s=${seasonNumber}&e=${episodeNumber} for TV show ${showId} S${seasonNumber}E${episodeNumber}:`, err);
            }
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);

        const result = {
            streams: [],
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
    }
}

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}

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