async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);

        console.log(`https://kuudere.to/search?keyword=${encodedKeyword}`);

        const responseText = await soraFetch(`https://kuudere.to/search?keyword=${encodedKeyword}`);
        const data = await responseText.json();

        const results = data.documents.map(result => ({
            title: result.english || result.romaji || result.native,
            image: result.cover,
            href: `${result.id}`
        }));

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(id) {
    try {
        const response = await soraFetch(`https://kuudere.to/anime/${id}`);
        const json = await response.json();

        console.log(json);
        
        const data = json.data;

        let description = data.description || 'No description available';
        description = description
            .replace(/<br\s*\/?>/gi, '\n') // Replace <br> with newlines
            .replace(/<\/?[^>]+(>|$)/g, '') // Strip any other HTML tags
            .replace(/\\n/g, '\n') // Convert escaped \n to real newlines
            .trim();

        const aliases = `
Type: ${data.type}
Status: ${data.status}
Episodes: ${data.epCount}
Subbed Episodes: ${data.subbedCount}
Dubbed Episodes: ${data.dubbedCount}
Age Rating: ${data.ageRating}
Genres: ${data.genres.join(', ') || 'Unknown'}
        `.trim();

        const airdate = `Released: ${data.startDate ? data.startDate : 'Unknown'}`

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

async function extractEpisodes(id) {
    try {
        const response = await soraFetch(`https://kuudere.to/api/watch/${id}/1`);
        const json = await response.json();

        console.log(json);
        
        const data = json.all_episodes;

        const sortedEpisodes = data.sort((a, b) => a.number - b.number);

        const episodes = sortedEpisodes.map(episode => ({
            title: `Episode ${episode.number}`,
            href: `https://kuudere.to/api/watch/${id}/${episode.number}`,
            number: episode.number
        }));

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
        const { episode_links: links } = await response.json();

        // ALL KNOWN SERVERS
        // Zen - server id = 0
        // StreamWish - server id = 1
        // Vidhide - server id = 2
        // FileMoon - server id = 3
        // Streamwish - server id = 8
        // Mp4upload - server id = 9
        // Doodstream - server id = 10
        // Vidstreaming - server id = 11
        // Filelions - server id = 12
        // Kumi-v3 - server id = 906
        // Kumi-v4 - server id = 907
        // Kumi - server id = 908

        const allowedServers = new Set([
            "StreamWish", "Vidhide", "FileMoon", "Streamwish", "Filelions"
        ]);

        // Filter and create array of promises for allowed servers
        const streamPromises = links
            .filter(({ serverName }) => allowedServers.has(serverName))
            .map(({ serverName, dataType, dataLink }) => extractHls(serverName, dataType, dataLink));

        // Wait for all to finish
        const streamsResults = await Promise.all(streamPromises);

        // Filter out nulls (failed extractions)
        const streams = streamsResults.filter(Boolean);

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

async function extractHls(serverName, dataType, dataLink) {
    try {
        const response = await soraFetch(dataLink);
        const htmlText = await response.text();

        const scriptMatch = htmlText.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
        if (!scriptMatch) return null;

        const unpackedScript = unpack(scriptMatch[1]);
        const match = unpackedScript.match(/"hls2"\s*:\s*"([^"]+)"/);
        if (!match) return null;

        return {
            title: `${serverName} - ${dataType}`,
            streamUrl: match[1],
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36"
            }
        };
    } catch {
        return null;
    }
}

// searchResults('one piece');
// extractEpisodes("677f1387001c5de2ba68");
// extractStreamUrl("https://kuudere.to/api/watch/677f1387001c5de2ba68/1");

// extractDetails("6749f2d9002936e95a95");
// extractEpisodes("6749f2d9002936e95a95");
// extractStreamUrl("https://kuudere.to/api/watch/6749f2d9002936e95a95/1");

// extractStreamUrl("https://kuudere.to/api/watch/67d80988001ca43d9445/1");

// extractStreamUrl("https://kuudere.to/api/watch/6749a577001f2b50906e/1");

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