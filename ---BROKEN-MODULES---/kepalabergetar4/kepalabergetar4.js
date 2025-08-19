async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const response = await fetchv2(`https://kepalabergetardramas.cfd/?s=${encodedKeyword}`);
        const html = await response.text();

        const results = [];

        const articleRegex = /<article[^>]*class="item-list tie_video"[^>]*>[\s\S]*?<h2[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<\/article>/g;

        let match;
        while ((match = articleRegex.exec(html)) !== null) {
            const href = match[1];
            const title = match[2];
            const image = match[3];

            results.push({
                title: title.trim(),
                href: href.trim(),
                image: image.trim()
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.error('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const responseText = await fetchv2(url);
        const html = await responseText.text();

        const details = [];

        const airdateMatch = html.match(/<span class="tie-date">.*?>([^<]+)<\/span>/i);
        const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

        const description = '';
        const alias = '';

        details.push({
            description,
            alias,
            airdate
        });

        console.log(details);
        return JSON.stringify(details);
    } catch (error) {
        console.log('Details error:', error);
        return [{
            description: '',
            alias: '',
            airdate: 'N/A'
        }];
    }
}

async function extractEpisodes(url) {
    try {
        return JSON.stringify([
            { href: url, number: 1 }
        ]);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return [];
    }
}

async function extractStreamUrl(url) {
    try {
        const responseText = await fetch(url);
        const html = await responseText.text();

        const iframeMatches = [...html.matchAll(/<iframe[^>]+src="([^"]+)"/g)];
        const iframeUrls = iframeMatches.map(m => m[1]);

        const streams = [];

        for (const iframeUrl1 of iframeUrls) {
            try {
                const responseText2 = await fetch(iframeUrl1);
                const html2 = await responseText2.text();

                if (html2.includes("This video is unavailable due to server maintenance.")) {
                    continue;
                }

                if (iframeUrl1.includes("https://tamilembed.lol/")) {
                    const loaderUrl = getTamilembedLoaderUrl(iframeUrl1);
                    const responseText3 = await fetch(loaderUrl);
                    const html3 = await responseText3.text();

                    const src = extractIframeSrc(html3);
                    const responseText4 = await fetch(src);
                    const html4 = await responseText4.text();

                    const packedScriptMatch = html4.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                    if (!packedScriptMatch) continue;

                    const packedScript = packedScriptMatch[1];
                    const unpackedScript = unpack(packedScript);

                    const regex = /file":"(https?:\/\/[^"]+)"/;
                    const match3 = unpackedScript.match(regex);

                    if (match3 && match3[1]) {
                        const streamUrl = match3[1];

                        const headers = {
                            "Referer": "https://blogger.com/",
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0"
                        };

                        streams.push({
                            title: "Tamilembed Stream",
                            streamUrl: streamUrl,
                            headers: headers
                        });
                    }
                }
            } catch (innerErr) {
                console.warn('Skipping broken iframe:', iframeUrl1, innerErr);
                continue;
            }
        }

        const result = {
            streams: streams,
            subtitles: ""
        };

        console.log(`All Available Stream URLs: ${JSON.stringify(result)}`);
        return JSON.stringify(result);
    } catch (error) {
        console.error('extractStreamUrl error:', error);
        return JSON.stringify({
            streams: [],
            subtitles: ""
        });
    }
}

// searchResults("keluarga");
// extractDetails("https://kepalabergetardramas.cfd/keluarga-itu-episod-24-tonton-drama-video.html");
// extractEpisodes("https://kepalabergetardramas.cfd/keluarga-itu-episod-24-tonton-drama-video.html");
extractStreamUrl("https://kepalabergetardramas.cfd/keluarga-itu-episod-24-tonton-drama-video.html");

function getTamilembedLoaderUrl(streamUrl) {
    try {
        const match = streamUrl.match(/\/stream\/([^"]+)/);
        if (!match || !match[1]) return null;

        const encodedId = decodeURIComponent(match[1]);
        return `https://tamilembed.lol/embed/loader.php?id=${encodedId}`;
    } catch (e) {
        console.error("getTamilembedLoaderUrl error:", e);
        return null;
    }
}

function extractIframeSrc(html) {
    const match = html.match(/<iframe[^>]+src="([^"]+)"/);
    return match ? match[1] : null;
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