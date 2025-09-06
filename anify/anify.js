async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://anify.to/search-ajax`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            body: `query=${encodedKeyword}`
        });
        const html = await responseText.text();

        const regex = /<a href="([^"]+)">\s*<img src="([^"]+)"[^>]*>\s*<\/a>[\s\S]+?<span class="animename[^"]*"[^>]*>([^<]+)<\/span>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: `https://anify.to${match[2].trim()}`,
                href: `https://anify.to${match[1].trim()}`
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults("clannad");
// extractDetails("https://anify.to/anime/5349/clannad");
// extractEpisodes("https://anify.to/anime/5349/clannad");
// extractStreamUrl("https://anify.to/watch/5349/clannad/1");

// extractStreamUrl("https://anify.to/watch/1066/solo-leveling/1");

// searchResults("fragrant");
// extractEpisodes("https://anify.to/anime/6106/the-fragrant-flower-blooms-with-dignity");

// searchResults("your name");
// extractEpisodes("https://anify.to/anime/2238/your-name-movie");

// extractEpisodes("https://anify.to/anime/8006/violet-evergarden");

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        // Extract description
        const descMatch = htmlText.match(/<span class="description">([\s\S]*?)<\/span>/i);
        const description = descMatch ? descMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/\s+/g, ' ')
            .trim() : 'No description available';

        // Extract rating score
        const ratingMatch = htmlText.match(/<span class="badge badge-score">.*?([\d.]+)<\/span>/i);
        const rating = ratingMatch ? ratingMatch[1] : 'Unknown';

        // Extract age rating
        const ageRatingMatch = htmlText.match(/<span class="badge badge-rating">.*?<\/i>\s*(.*?)\s*<\/span>/i);
        const ageRating = ageRatingMatch ? ageRatingMatch[1] : 'Unknown';

        // Extract status
        const statusMatch = htmlText.match(/<span class="badge badge-status[^"]*">.*?<\/i>\s*(.*?)\s*<\/span>/i);
        const status = statusMatch ? statusMatch[1] : 'Unknown';

        // Extract year
        const yearMatch = htmlText.match(/<span class="badge badge-year">.*?<\/i>\s*(\d{4})\s*<\/span>/i);
        const year = yearMatch ? yearMatch[1] : 'Unknown';

        // Extract genres
        const genreRegex = /<span class="badge badge-genre[^"]*">.*?<\/i>\s*(.*?)\s*<\/span>/gi;
        const genreList = [];
        let genreMatch;
        while ((genreMatch = genreRegex.exec(htmlText)) !== null) {
            genreList.push(genreMatch[1].trim());
        }

        const aliases = `
Rating: ${rating}
Age Rating: ${ageRating}
Status: ${status}
Genres: ${genreList.join(', ') || 'Unknown'}
        `.trim();

        const airdate = `Released: ${year}`;

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const episodeRegex = /<a href="(\/watch\/[^"]+)">[\s\S]*?<span class="animename">Episode (\d+)<\/span>/g;
        const episodes = [];
        let match;

        while ((match = episodeRegex.exec(html)) !== null) {
            episodes.push({
                href: `https://anify.to${match[1].trim()}`,
                number: parseInt(match[2], 10)
            });
        }

        episodes.sort((a, b) => a.number - b.number);

        // const episodeRegex2 = /<a href="(\/watch\/[^"]+)">[\s\S]*?<span class="badge badge-(movie|special)[^"]*">[\s\S]*?<span class="animename[^>]*">([\s\S]*?)<\/span>/g;

        const episodes2 = [];
        // let match2;

        // while ((match2 = episodeRegex2.exec(html)) !== null) {
        //     const href = match2[1].trim();

        //     const numberMatch = href.match(/\/(?:m|s)-(\d+)/);

        //     if (numberMatch) {
        //         episodes2.push({
        //             href: `https://anify.to${href}`,
        //             number: parseInt(numberMatch[1], 10)
        //         });
        //     }
        // }

        // episodes2.sort((a, b) => a.number - b.number);

        // Match links with /m- or /s- and get href and number
        const regex = /<a href="(\/watch\/[^"]*?\/[ms]-(\d+))"[^>]*>[\s\S]*?<span class="badge badge-(movie|special)"/g;

        let match3;
        while ((match3 = regex.exec(html)) !== null) {
            const href = match3[1].trim();
            const number = parseInt(match3[2], 10);

            episodes2.push({
                href: `https://anify.to${href}`,
                number
            });
        }

        episodes.push(...episodes2);

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const iframeSrcRegex = /<iframe\s+src="([^"]+)"[^>]*><\/iframe>/g;
        const matches = [];
        let match;

        while ((match = iframeSrcRegex.exec(htmlText)) !== null) {
            matches.push(`https://anify.to${match[1]}`);
        }

        if (matches.length === 0) {
            throw new Error('Iframe source not found');
        }

        let streams = [];

        for (const iframeUrl of matches) {
            const response2 = await soraFetch(iframeUrl);
            const htmlText2 = await response2.text();

            const regex = /streaming_url\s*:\s*"([^"]+\.m3u8)"/;
            const match = htmlText2.match(regex);

            if (match) {
                const streamUrl = match[1];
                console.log("Stream URL: " + streamUrl);

                streams.push({
                    title: "Streamup",
                    streamUrl,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                        "Referer": "https://strmup.to/",
                        "Origin": "https://strmup.to"
                    }
                });
            }

            const iframeMatches = [...htmlText2.matchAll(/<iframe\s+src="([^"]+)"[^>]*><\/iframe>/g)];

            if (iframeMatches.length !== 0) {
                for (const iframeMatch of iframeMatches) {
                    const rawSrc = iframeMatch[1];
                    const iframeSrc = rawSrc;

                    try {
                        const response3 = await soraFetch(iframeSrc);
                        const htmlText3 = await response3.text();

                        const scriptMatch = htmlText3.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                        if (!scriptMatch) continue;

                        const unpackedScript = unpack(scriptMatch[1]);

                        const regex2 = /file:\s*"([^"]+)"/;
                        const match3 = unpackedScript.match(regex2);
                        const streamUrl = match3 ? match3[1] : '';

                        console.log("Filemoon Stream URL: " + streamUrl);

                        streams.push({
                            title: "FileMoon",
                            streamUrl,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36"
                            }
                        });
                    } catch (err) {
                        console.log("Failed to fetch iframe: " + iframeSrc + " " + err);
                    }
                }
            }
        }

        const result = {
            streams,
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
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