async function searchResults(keyword) {
    const url = `https://kinoger.com/?do=search&subaction=search&story=${keyword}`;
    const response = await soraFetch(url);
    const html = await response.text();

    let results = [];

    const filmListRegex = /<div class="titlecontrol">[\s\S]*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div class="content_text searchresult_img">[\s\S]*?<img src="([^"]+)"/g;

    let match;
    while ((match = filmListRegex.exec(html)) !== null) {
        const href = match[1].startsWith('http') ? match[1] : `https://kinoger.com${match[1]}`;
        const title = match[2].trim();
        const image = match[3].startsWith('http') ? match[3] : `https://kinoger.com${match[3]}`;

        results.push({
            title,
            image,
            href,
        });
    }

    console.log(results);
    return results;
}

// searchResults("interstellar");
// extractDetails("https://kinoger.com/stream/1274-interstellar-2014.html");
// extractEpisodes("https://kinoger.com/stream/1274-interstellar-2014.html");
// extractStreamUrl("https://supervideo.cc/k/ej2l1x8jr7l0");

// searchResults("squid game");
// extractDetails("https://kinoger.com/stream/9719-squid-game-staffel-1-stream.html");
// extractEpisodes("https://kinoger.com/stream/9719-squid-game-staffel-1-stream.html");

extractEpisodes("https://kinoger.com/stream/2267-breaking-bad-staffel-01-05-2013.html");

async function extractDetails(url) {
    const response = await soraFetch(url);
    const html = await response.text();

    const descriptionMatch = html.match(/<div class="images-border"[^>]*>([\s\S]*?)<br><br>/);
    const description = descriptionMatch 
        ? descriptionMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : 'N/A';

    const ratingMatch = html.match(/<span[^>]*style="[^"]*color:\s*#f60[^>]*">([\d.]+)<\/span>\s*\/10 von <span[^>]*>(\d+)<\/span>/);
    const rating = ratingMatch ? `${ratingMatch[1]}/10 von ${ratingMatch[2]}` : 'N/A';

    const airdateMatch = html.match(/<h1[^>]*>[\s\S]*?\((\d{4})\)<\/h1>/);
    const airdate = airdateMatch ? airdateMatch[1] : 'N/A';

    const updatedMatch = html.match(/<li class="date"><a[^>]*>([^<]+)<\/a><\/li>/);
    const lastUpdated = updatedMatch ? updatedMatch[1].trim() : 'N/A';

    const viewsMatch = html.match(/<li class="view">Aufrufe:\s*([\d\s]+)<\/li>/);
    const views = viewsMatch ? viewsMatch[1].replace(/\s+/g, '') : 'N/A';

    const alias = 
`Bewertung: ${rating}
Zuletzt aktualisiert: ${lastUpdated}
Aufrufe: ${views}`;

    const details = [{
        description,
        alias,
        airdate,
    }];

    console.log(details);
    return details;
}

async function extractEpisodes(url) {
    const response = await soraFetch(url);
    const html = await response.text();
    const episodes = [];

    // Match all .show() calls and capture the content inside [[...]]
    const showRegex = /\.show\(\d+,\s*\[\[(.*?)\]\],/g;
    let match;
    let index = 1;

    while ((match = showRegex.exec(html)) !== null) {
        const embedList = match[1];

        const urlMatches = embedList.match(/'([^']+)'/g);

        if (urlMatches) {
            for (const raw of urlMatches) {
                const url = raw.replace(/'/g, '').trim();
                if (url.startsWith("https://supervideo")) {
                    episodes.push({
                        href: url,
                        number: `${index++}`,
                    });
                }
            }
        }
    }

    console.log("Episodes:", episodes);
    return episodes;
}

async function extractStreamUrl(url) {
    // if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    const response = await soraFetch(url);
    const html = await response.text();

    const scriptMatch = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        console.log("No packed script found");
        return JSON.stringify({ stream: 'N/A' });
    }
   
    const unpackedScript = unpack(scriptMatch[1]);
    
    const streamMatch = unpackedScript.match(/(?<=file:")[^"]+/);
    const stream = streamMatch ? streamMatch[0].trim() : 'N/A';
    
    console.log(stream);
    return stream;
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
