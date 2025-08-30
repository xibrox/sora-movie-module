async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const response = await fetchv2(`https://ww31.kepalabergetar9.com/?s=${encodedKeyword}`);
        const html = await response.text();

        const results = [];

        const articleRegex = /<article[^>]*>[\s\S]*?<h2 class="post-box-title">\s*<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<\/article>/g;

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
        return [{ title: 'Error', image: '', href: '' }];
    }
}

async function extractDetails(url) {
    try {
        const responseText = await fetchv2(url);
        const html = await responseText.text();

        const details = [];

        const description = '';

        const airdateMatch = html.match(/<span class="tie-date">.*?>([^<]+)<\/span>/i);
        const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

        const categoryMatch = html.match(/<span class="post-cats">[\s\S]*?<\/span>/i);
        let categories = 'N/A';
        if (categoryMatch) {
            const categoryLinks = [...categoryMatch[0].matchAll(/<a [^>]+>([^<]+)<\/a>/g)];
            categories = categoryLinks.map(link => link[1].trim()).join(', ');
        }

        const alias = `Tarikh Tayangan: ${airdate} | Kategori: ${categories}`;

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
            description: 'Error loading description',
            alias: 'N/A',
            airdate: 'N/A'
        }];
    }
}

async function extractEpisodes(url) {
    try {
        const responseText = await fetchv2(url);
        const html = await responseText.text();

        const episodes = [];

        const episodeBlocks = html.match(/<a[^>]+href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/g);

        if (episodeBlocks) {
            episodeBlocks.forEach(block => {
                const hrefMatch = block.match(/href="([^"]+)"/);
                const numberTextMatch = block.match(/>([^<]+)</);

                if (hrefMatch && numberTextMatch) {
                    let numberText = numberTextMatch[1].trim();
                    let number;

                    if (/^\d+$/.test(numberText)) {
                        number = Number(numberText);
                    } else if (numberText.toLowerCase() === 'akhir') {
                        number = episodes.length + 1;
                        numberText = 'Akhir';
                    } else {
                        return;
                    }

                    episodes.push({
                        href: hrefMatch[1],
                        number: number,
                        label: numberText
                    });
                }
            });
        }

        episodes.sort((a, b) => a.number - b.number);

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return [];
    }
}

async function extractStreamUrl(url) {
    try {
        const responseText = await fetch(url);
        const html = await responseText.text();

        const match = html.match(/<iframe[^>]+src="([^"]+)"/);
        const iframeUrl1 = match ? match[1] : null;
        if (!iframeUrl1) throw new Error("First iframe not found");

        const responseText2 = await fetch(iframeUrl1);
        const html2 = await responseText2.text();

        console.log(iframeUrl1);

        const match2 = html2.match(/<iframe[^>]+src="([^"]+)"/);
        const iframeUrl2 = match2 ? match2[1] : null;
        if (!iframeUrl2) throw new Error("Second iframe not found");

        const headers = {
            "Referer": "https://filemoon.to/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0"
        };

        const responseText3 = await fetch(iframeUrl2, headers);
        const html3 = await responseText3.text();

        const packedScriptMatch = html3.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
        if (!packedScriptMatch) throw new Error("Packed script not found");
        
        const packedScript = packedScriptMatch[1];
        const unpackedScript = unpack(packedScript);

        const regex = /sources:\s*\[\s*{file:"([^"]+)"\}\s*\]/;
        const match3 = unpackedScript.match(regex);
        if (!match3) throw new Error("Stream URL not found");

        const streamUrl = match3[1];

        const result = {
            streams: [{
                title: "HD Server - Part 1",
                streamUrl: streamUrl,
                headers: headers
            }],
            subtitles: ""
        }

        console.log(result);
        return JSON.stringify(result);
    } catch (error) {
        console.error('extractStreamUrl error:', error);
        return {
            streams: [],
            subtitles: ""
        };
    }
}

// searchResults("keluarga");
// extractDetails("https://ww31.kepalabergetar9.com/keluarga-itu-episod-22-tonton-drama-video/");
// extractEpisodes("https://ww31.kepalabergetar9.com/keluarga-itu-episod-22-tonton-drama-video/");
// extractStreamUrl("https://ww31.kepalabergetar9.com/keluarga-itu-episod-22-tonton-drama-video/");

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