async function searchResults(keyword) {
    try {
        const responseText = await soraFetch(`https://dramacool.com.kg/?s=${keyword}&content_type=anime`);
        const html = await responseText.text();

        const regex = /<a href="([^"]+)"[^>]*title="([^"]+)">[\s\S]*?<img\s+src="([^"]+)"/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[2].trim(),
                image: match[3].trim(),
                href: match[1].trim()
            });
        }

        const responseText2 = await soraFetch(`https://dramacool.com.kg/?s=${keyword}&content_type=movie`);
        const html2 = await responseText2.text();

        const regex2 = /<a href="([^"]+)"[^>]*class="recent-post-link">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/g;

        let match2;

        while ((match2 = regex2.exec(html2)) !== null) {
            results.push({
                title: match2[3].trim(),
                image: match2[2].trim(),
                href: match2[1].trim()
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults("head over");
// extractDetails("https://dramacool.com.kg/series/head-over-heels-2025/");
// extractEpisodes("https://dramacool.com.kg/series/head-over-heels-2025/");
// extractStreamUrl("https://dramacool.com.kg/episode/head-over-heels-2025-episode-1/");

// searchResults("m3gan");
// extractDetails("https://dramacool.com.kg/movies/m3gan-2-0-2025/");
// extractEpisodes("https://dramacool.com.kg/movies/m3gan-2-0-2025/");
// extractStreamUrl("https://dramacool.com.kg/movies/m3gan-2-0-2025/");

async function extractDetails(url) {
    try {
        if (url.includes('movies')) {
            const response = await soraFetch(url);
            const htmlText = await response.text();

            // Rating
            const ratingMatch = htmlText.match(/<span class="text-gray-600[^>]*?text-xs">([\d.]+) \(\d+\)<\/span>/);
            const rating = ratingMatch ? ratingMatch[1] : 'Unknown';

            // Extract description
            const descMatch = htmlText.match(/<div class="[^"]*?prose[^"]*?">[\s\S]*?<p>([\s\S]*?)<\/p>/i);
            const description = descMatch ? descMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/?[^>]+>/g, '') // Remove HTML tags
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/\s+/g, ' ')
                .trim() : 'No description available';

            // Studio, Release Year, Quality, Language, Duration, Released on
            const info = {
                studio: '',
                year: '',
                quality: '',
                language: '',
                duration: '',
                releasedOn: ''
            };

            const infoRegex = /<strong>([^<]+):<\/strong>\s*([^<]+)/gi;
            let match;
            while ((match = infoRegex.exec(htmlText)) !== null) {
                const key = match[1].toLowerCase().trim();
                const value = match[2].trim();
                if (key.includes('studio')) info.studio = value;
                else if (key.includes('release year')) info.year = value;
                else if (key.includes('quality')) info.quality = value;
                else if (key.includes('language')) info.language = value;
                else if (key.includes('duration')) info.duration = value;
                else if (key.includes('released on')) info.releasedOn = value;
            }

            // Genres
            const genreList = [];
            const genreRegex = /class="genre-tag[^"]*">([^<]+)<\/a>/g;
            let genreMatch;
            while ((genreMatch = genreRegex.exec(htmlText)) !== null) {
                genreList.push(genreMatch[1].trim());
            }

            // Aliases string
            const aliases = `
Studio: ${info.studio || 'Unknown'}
Release Year: ${info.year || 'Unknown'}
Quality: ${info.quality || 'Unknown'}
Language: ${info.language || 'Unknown'}
Duration: ${info.duration || 'Unknown'}
Genres: ${genreList.join(', ') || 'Unknown'}
Rating: ${rating}
            `.trim();

            const airdate = `Released on: ${info.releasedOn || 'Unknown'}`;

            const result = [{
                description,
                aliases,
                airdate
            }];

            console.log(result);
            return JSON.stringify(result);
        } else if (url.includes('series')) {
            const response = await soraFetch(url);
            const htmlText = await response.text();

            // Extract description
            const descMatch = htmlText.match(/<div class="[^"]*?prose[^"]*?">[\s\S]*?<p>([\s\S]*?)<\/p>/i);
            const description = descMatch ? descMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/?[^>]+>/g, '') // Remove HTML tags
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/\s+/g, ' ')
                .trim() : 'No description available';

            // Extract info fields
            const info = {
                status: 'Unknown',
                studio: 'Unknown',
                released: 'Unknown',
                duration: 'Unknown',
                season: 'Unknown',
                type: 'Unknown',
                censor: 'Unknown',
                releasedOn: 'Unknown'
            };

            const infoRegex = /<strong>([^<]+):<\/strong>\s*([^<]+)<\/p>/g;
            let match;
            while ((match = infoRegex.exec(htmlText)) !== null) {
                const key = match[1].toLowerCase().trim();
                const value = match[2].trim();
                if (key.includes('status')) info.status = value;
                else if (key.includes('studio')) info.studio = value;
                else if (key.includes('released on')) info.releasedOn = value;
                else if (key.includes('released')) info.released = value;
                else if (key.includes('duration')) info.duration = value;
                else if (key.includes('season')) info.season = value;
                else if (key.includes('type')) info.type = value;
                else if (key.includes('censor')) info.censor = value;
            }

            // Genres
            const genreList = [];
            const genreRegex = /class="genre-tag[^"]*">([^<]+)<\/a>/g;
            let genreMatch;
            while ((genreMatch = genreRegex.exec(htmlText)) !== null) {
                genreList.push(genreMatch[1].trim());
            }

            const aliases = `
Status: ${info.status}
Studio: ${info.studio}
Released: ${info.released}
Duration: ${info.duration}
Season: ${info.season}
Type: ${info.type}
Age Rating: ${info.censor}
Genres: ${genreList.join(', ') || 'Unknown'}
            `.trim();

            const airdate = `Released on: ${info.releasedOn}`;

            const transformedResults = [{
                description,
                aliases,
                airdate
            }];

            console.log(transformedResults);
            return JSON.stringify(transformedResults);
        }
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
    if (url.includes('series')) {
        try {
            const response = await soraFetch(url);
            const html = await response.text();
            
            const episodes = [];
            const episodeRegex = /<a href="(https:\/\/dramacool\.com\.kg\/episode\/[^"]+)"\s+title="[^"]*Episode\s+(\d+)/gi;
            let match;
            
            while ((match = episodeRegex.exec(html)) !== null) {
                episodes.push({
                    href: match[1].trim(),
                    number: parseInt(match[2], 10)
                });
            }
            
            episodes.sort((a, b) => a.number - b.number);
            
            console.log(episodes);
            return JSON.stringify(episodes);
        } catch (error) {
            console.log('Fetch error in extractEpisodes: ' + error);
            return JSON.stringify([]);
        }
    } else if (url.includes('movies')) {
        try {
            const episodes = [];

            episodes.push({
                href: url,
                number: 1
            });
            
            console.log(episodes);
            return JSON.stringify(episodes);
        } catch (error) {
            console.log('Fetch error in extractEpisodes: ' + error);
            return JSON.stringify([]);
        }
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        const iframeSrc = match ? match[1] : null;

        if (!iframeSrc) {
            throw new Error('Iframe source not found');
        }

        console.log("Iframe Source: " + iframeSrc);

        const response2 = await soraFetch(iframeSrc);
        const html2 = await response2.text();

        const scriptMatch = html2.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);

        if (!scriptMatch) {
            throw new Error('Packed script not found in iframe source');
        }

        const unpackedScript = unpack(scriptMatch[1]);

        console.log("Unpacked Script: " + unpackedScript);

        const regex2 = /file:\s*window\.atob\("([^"]+)"\)/;
        const match2 = unpackedScript.match(regex2);
        const encodedStreamUrl = match2 ? match2[1] : '';
        const streamUrl = encodedStreamUrl ? atob(encodedStreamUrl) : '';

        if (!streamUrl) {
            throw new Error('Stream URL not found in unpacked script');
        }

        console.log("Stream URL: " + streamUrl);

        let streams = [{
            title: "",
            streamUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                "Referer": "https://asianload.cfd/",
                "Origin": "https://asianload.cfd"
            }
        }];

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