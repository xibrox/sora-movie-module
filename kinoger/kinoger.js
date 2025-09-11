// async function searchResults(keyword) {
//     const url = `https://kinoger.com/?do=search&subaction=search&story=${keyword}`;
//     const response = await soraFetch(url);
//     const html = await response.text();

//     let results = [];

//     const filmListRegex = /<div class="titlecontrol">[\s\S]*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div class="content_text searchresult_img">[\s\S]*?<img src="([^"]+)"/g;

//     let match;
//     while ((match = filmListRegex.exec(html)) !== null) {
//         const href = match[1].startsWith('http') ? match[1] : `https://kinoger.com${match[1]}`;
//         const title = match[2].trim();
//         const image = match[3].startsWith('http') ? match[3] : `https://kinoger.com${match[3]}`;

//         results.push({
//             title,
//             image,
//             href,
//         });
//     }

//     console.log(JSON.stringify(results));
//     return JSON.stringify(results);
// }

async function searchResults(keyword) {
    const url = `https://kinoger.com/?do=search&subaction=search&story=${encodeURIComponent(keyword)}`;
    const response = await soraFetch(url);
    const html = await response.text();

    const results = [];
    const blockRegex = /<div class="titlecontrol">[\s\S]*?<div class="separator2"><\/div>/g;
    let blockMatch;

    while ((blockMatch = blockRegex.exec(html)) !== null) {
        const blockHtml = blockMatch[0];

        const linkMatch = blockHtml.match(/<div class="title">[\s\S]*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
        if (!linkMatch) continue;

        const hrefRaw = linkMatch[1].trim();
        const href = hrefRaw.startsWith('http') ? hrefRaw : `https://kinoger.com${hrefRaw}`;

        let title = linkMatch[2].trim();
        title = decodeHtmlEntities(title);

        const categoryMatch = blockHtml.match(/<li class="category">([\s\S]*?)<\/li>/i);
        const categoryHtml = categoryMatch ? categoryMatch[1] : '';

        if (/\/serie\/|\/tv-shows\//i.test(categoryHtml)) continue;

        let image = '';
        const posterMatch = blockHtml.match(/<div class="content_text searchresult_img">[\s\S]*?<img[^>]+src="([^"]+)"/i);
        if (posterMatch) {
            image = posterMatch[1].trim();
        } else {
            const allImgMatches = Array.from(blockHtml.matchAll(/<img[^>]+src="([^"]+)"/gi), m => m[1]);
            const nonLogoImgs = allImgMatches.filter(src => !/\/templates\/kinoger\/images\/ico\//i.test(src));

            if (nonLogoImgs.length > 0) {
                image = nonLogoImgs[0].trim();
            } else {
                image = allImgMatches.length ? allImgMatches[allImgMatches.length - 1].trim() : '';
            }
        }

        if (image && !image.startsWith('http')) image = `https://kinoger.com${image}`;

        results.push({ title, image, href });
    }

    console.log(JSON.stringify(results, null, 2));
    return JSON.stringify(results);
}

// searchResults("interstellar");
// extractDetails("https://kinoger.com/stream/1274-interstellar-2014.html");
// extractEpisodes("https://kinoger.com/stream/1274-interstellar-2014.html");
// extractStreamUrl("https://supervideo.cc/k/ej2l1x8jr7l0");

// searchResults("squid game");
// extractDetails("https://kinoger.com/stream/9719-squid-game-staffel-1-stream.html");
// extractEpisodes("https://kinoger.com/stream/9719-squid-game-staffel-1-stream.html");

// extractEpisodes("https://kinoger.com/stream/2267-breaking-bad-staffel-01-05-2013.html");

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

    console.log(JSON.stringify(details));
    return JSON.stringify(details);
}

// async function extractEpisodes(url) {
//     const response = await soraFetch(url);
//     const html = await response.text();

//     const episodes = [];

//     // Match each .show(x,[ [ ... ], [ ... ], ... ])
//     const showRegex = /\.show\(\d+,\s*\[(.*?)\]\s*\)/gs;
//     let match;

//     while ((match = showRegex.exec(html)) !== null) {
//         const allSeasons = match[1];

//         // Match each season array
//         const seasonRegex = /\[([^\]]+)\]/g;
//         let seasonMatch;
//         let seasonNum = 1;

//         while ((seasonMatch = seasonRegex.exec(allSeasons)) !== null) {
//             const seasonBlock = seasonMatch[1];

//             // Extract episode URLs from this season
//             const urlMatches = seasonBlock.match(/'([^']+)'/g);
//             if (urlMatches) {
//                 let epNum = 1;
//                 for (const raw of urlMatches) {
//                     const epUrl = raw.replace(/'/g, '').trim();

//                     episodes.push({
//                         number: epNum,
//                         href: `${url}|${epUrl}|${seasonNum}-${epNum}`,
//                     });
//                     epNum++;
//                 }
//             }
//             seasonNum++;
//         }
//     }

//     console.log("Episodes:", JSON.stringify(episodes, null, 2));
//     return JSON.stringify(episodes);
// }

async function extractEpisodes(url) {
    const response = await soraFetch(url);
    const html = await response.text();

    const episodes = [];

    const showRegex = /\.show\(\d+,\s*\[(.*?)\]\s*\)/gs;
    let match;

    while ((match = showRegex.exec(html)) !== null) {
        const allSeasons = match[1];

        const seasonRegex = /\[([^\]]+)\]/g;
        let seasonMatch;
        let seasonNum = 1;

        while ((seasonMatch = seasonRegex.exec(allSeasons)) !== null) {
            const seasonBlock = seasonMatch[1];

            const urlMatches = seasonBlock.match(/'([^']+)'/g);
            if (urlMatches && urlMatches.length > 0) {
                const raw = urlMatches[0];
                const epUrl = raw.replace(/'/g, '').trim();

                episodes.push({
                    number: 1,
                    href: `${url}|${epUrl}|${seasonNum}-1`,
                });

                return JSON.stringify(episodes);
            }
            seasonNum++;
        }
    }

    console.log("Episodes:", JSON.stringify(episodes, null, 2));
    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    console.log("URL: " + url);

    const [ urlYeah, epUrl, seasonAndEpisodeNumber ] = url.split("|");

    console.log("URL Yeah: " + urlYeah);
    console.log("Episode URL: " + epUrl);
    console.log("Season and Episode Number: " + seasonAndEpisodeNumber);

    // const streams = await networkFetch(urlYeah, 7, {
    //     waitForSelectors: ["span[data-id='1-2']"],
    //     clickSelectors: ["span[data-id='1-2']"],
    // });

    const streams = await networkFetch(urlYeah, 7, {}, ".m3u8");

    console.log("Vidlink streams: " + JSON.stringify(streams));

    if (streams.requests && streams.requests.length > 0) {
        const streamUrl = streams.requests.find(url => url.includes('.m3u8')) || "";
        // const matches = streams.requests.filter(url => url.includes('master.m3u8'));

        // console.log("Vidlink matches: " + JSON.stringify(matches));

        // const streamUrl = matches[2] || "";

        console.log("Vidlink streamUrl: " + streamUrl);

        const results = {
            streams: [{
                title: "Stream",
                streamUrl,
                headers: {},
            }],
            subtitles: ""
        }

        return JSON.stringify(results);
    } else {
        return "";
    }

    // const response = await soraFetch(url);
    // const html = await response.text();

    // const scriptMatch = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
    // if (!scriptMatch) {
    //     console.log("No packed script found");
    //     return JSON.stringify({ stream: 'N/A' });
    // }
   
    // const unpackedScript = unpack(scriptMatch[1]);
    
    // const streamMatch = unpackedScript.match(/(?<=file:")[^"]+/);
    // const stream = streamMatch ? streamMatch[0].trim() : 'N/A';
    
    // console.log(stream);
    // return stream;
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

function decodeHtmlEntities(text) {
    return text
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&hellip;/g, '…')
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '—');
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
