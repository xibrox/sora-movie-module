async function searchResults(keyword) {
    const uniqueResults = new Map();

    for (let i = 1; i <= 5; i++) {
        const url = `https://web6.topcinema.cam/search/?query=${keyword}&type=all&offset=${i}`;
        const response2 = await soraFetch(url);
        const html2 = await response2.text();

        const regex2 = /<a href="([^"]+)"[^>]*?title="([^"]+?)"[^>]*?>[\s\S]*?<img[^>]+data-src="([^"]+)"[\s\S]*?<ul class="liList">[\s\S]*?<li>.*?<\/li>\s*<li>([^<]+)<\/li>/g;

        let match2;
        while ((match2 = regex2.exec(html2)) !== null) {
            const rawTitle = match2[2].trim();

            // Normalize title: remove episode numbers, "والاخيرة", and extra spaces
            const cleanedTitle = rawTitle
                .replace(/الحلقة\s*\d+(\.\d+)?(-\d+)?/gi, '')
                .replace(/الحلقة\s*\d+/gi, '')
                .replace(/والاخيرة/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            const finalTitle = `${cleanedTitle} (${match2[4].trim()})`;

            if (!uniqueResults.has(cleanedTitle)) {
                uniqueResults.set(cleanedTitle, {
                    title: finalTitle,
                    href: match2[1].trim(),
                    image: match2[3].trim()
                });
            }
        }
    }

    const deduplicated = Array.from(uniqueResults.values());
    console.log(deduplicated);
    return JSON.stringify(deduplicated);
}

// searchResults("Interstellar");
// extractDetails("https://web6.topcinema.cam/%d9%81%d9%8a%d9%84%d9%85-interstellar-2014-%d9%85%d8%aa%d8%b1%d8%ac%d9%85-%d8%a7%d9%88%d9%86-%d9%84%d8%a7%d9%8a%d9%86/");
// extractEpisodes("https://web6.topcinema.cam/%d9%81%d9%8a%d9%84%d9%85-interstellar-2014-%d9%85%d8%aa%d8%b1%d8%ac%d9%85-%d8%a7%d9%88%d9%86-%d9%84%d8%a7%d9%8a%d9%86/");

// searchResults("Squid");
// extractEpisodes("https://web6.topcinema.cam/%d9%85%d8%b3%d9%84%d8%b3%d9%84-%d9%84%d8%b9%d8%a8%d8%a9-%d8%a7%d9%84%d8%ad%d8%a8%d8%a7%d8%b1-squid-game-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%a7%d9%88%d9%84-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1-%d9%85%d8%aa%d8%b1%d8%ac%d9%85%d8%a9/");
// extractStreamUrl("https://web6.topcinema.cam/%d9%85%d8%b3%d9%84%d8%b3%d9%84-%d9%84%d8%b9%d8%a8%d8%a9-%d8%a7%d9%84%d8%ad%d8%a8%d8%a7%d8%b1-squid-game-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%a7%d9%88%d9%84-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1-%d9%85%d8%aa%d8%b1%d8%ac%d9%85%d8%a9/watch/");

// extractEpisodes("https://web6.topcinema.cam/%d8%a7%d9%86%d9%85%d9%8a-naruto-shippuuden-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-500-%d9%88%d8%a7%d9%84%d8%a7%d8%ae%d9%8a%d8%b1%d8%a9-%d9%85%d8%aa%d8%b1%d8%ac%d9%85%d8%a9/");
// extractStreamUrl("https://web6.topcinema.cam/%d8%a7%d9%86%d9%85%d9%8a-naruto-shippuuden-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-500-%d9%88%d8%a7%d9%84%d8%a7%d8%ae%d9%8a%d8%b1%d8%a9-%d9%85%d8%aa%d8%b1%d8%ac%d9%85%d8%a9/");

// searchResults("One piece");
// extractEpisodes("https://web6.topcinema.cam/series/%d8%a7%d9%86%d9%85%d9%8a-one-piece-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ad%d8%a7%d8%af%d9%8a-%d9%88%d8%a7%d9%84%d8%b9%d8%b4%d8%b1%d9%88%d9%86-%d9%85%d8%aa%d8%b1%d8%ac%d9%85/");

async function extractDetails(url) {
    const results = [];
    const response = await soraFetch(url);
    const html = await response.text();

    const descriptionMatch = html.match(/<div class="story">\s*<p>([\s\S]*?)<\/p>/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'N/A';

    const airdateMatch = html.match(/<span>موعد الصدور\s*:<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
    const airdate = airdateMatch ? airdateMatch[1] : 'N/A';

    const aliasMatches = [];
    const aliasSectionMatch = html.match(/<ul class="RightTaxContent">([\s\S]*?)<\/ul>/);
    if (aliasSectionMatch) {
        const section = aliasSectionMatch[1];
        const items = [...section.matchAll(/<li[^>]*>[\s\S]*?<span>(.*?)<\/span>([\s\S]*?)<\/li>/g)];
        for (const [, label, content] of items) {
            if (label.includes("موعد الصدور")) continue;

            const values = [...content.matchAll(/<a[^>]*>(.*?)<\/a>/g)].map(m => m[1].trim());
            if (values.length === 0) {
                const strongValue = content.match(/<strong>(.*?)<\/strong>/);
                if (strongValue) values.push(strongValue[1].trim());
            }
            aliasMatches.push(`${label.trim()} ${values.join(', ')}`);
        }
    }

    results.push({
        description,
        aliases: aliasMatches.join('\n'),
        airdate
    });

    console.log(`Details: ${JSON.stringify(results)}`);
    return JSON.stringify(results);
}

async function extractEpisodes(url) {
    let results = [];

    const decodedUrl = decodeURIComponent(url);

    const seriesKeywords = ["مسلسل", "الموسم", "الحلقة"];

    const isSeries = seriesKeywords.some(keyword => decodedUrl.includes(keyword));

    const response = await soraFetch(url);
    const html = await response.text();

    if (isSeries) {
        const seasonRegex = /<div class="Small--Box Season">\s*<a href="(?<href>[^"]+)"[^>]*>.*?<div class="epnum"><span>الموسم<\/span>(?<number>\d+)<\/div>.*?data-src="(?<image>[^"]+)"[^>]*>.*?<h3 class="title">(?<title>[^<]+)<\/h3>/gs;
        const matches = [...html.matchAll(seasonRegex)];

        let seasonHrefs = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const seasonHref = match.groups.href;
            if (seasonHref) {
                seasonHrefs.push(seasonHref);
            }
        }

        for (let i = 0; i < seasonHrefs.length; i++) {
            const seasonRes = await soraFetch(seasonHrefs[i]);
            const seasonHtml = await seasonRes.text();

            const episodeRegex = /<a href="([^"]+?)"[^>]*?>\s*<div class="image">.*?<div class="epnum">\s*<span>الحلقة<\/span>\s*(\d+)/gs;
            let match;

            while ((match = episodeRegex.exec(seasonHtml)) !== null) {
                const episodeUrl = match[1].trim();
                const episodeNumber = parseInt(match[2], 10);

                if (episodeUrl) {
                    results.push({
                        href: episodeUrl,
                        number: episodeNumber
                    });
                }
            }
        }
    } else {
        const watchMatch = html.match(/<a class="watch" href="([^"]+)"/);
        if (watchMatch) {
            results.push({
                href: watchMatch[1].trim(),
                number: 1
            });
        }
    }

    results.reverse();

    console.log(`Episodes: ${JSON.stringify(results)}`);
    return JSON.stringify(results);
}

async function extractStreamUrl(url) {
    const responseText = await soraFetch(url);
    const htmlText = await responseText.text();
    const urlMatch = htmlText.match(/<a class="watch" href="([^"]+)"/);

    const response = await soraFetch(urlMatch[1]);
    const html = await response.text();

    const regex = /<li[^>]+data-id="([^"]+)"[^>]+data-server="([^"]+)"/g;

    const matches = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        matches.push({
            dataId: match[1],
            dataServer: match[2],
        });
    }

    let streamEmbeds = [];

    for (const match of matches) {
        const url2 = "https://web6.topcinema.cam/wp-content/themes/movies2023/Ajaxat/Single/Server.php";

        const headers = {
            "Host": "web6.topcinema.cam",
            "Origin": "https://web6.topcinema.cam",
            "Referer": "https://web6.topcinema.cam/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        };

        const response2 = await soraFetch(url2, { method: "POST", headers, body: `id=${match.dataId}&i=${match.dataServer}` });
        const html2 = await response2.text();

        const streamMatch = html2.match(/<iframe[^>]+src="([^"]+)"/);
        if (streamMatch) {
            streamEmbeds.push(streamMatch[1].trim());
        }
    }

    console.log(JSON.stringify(streamEmbeds));

    let streams = [];

    for (const streamEmbed of streamEmbeds) {
        // if (streamEmbed.includes("vidtube")) {
        //     const response3 = await soraFetch(streamEmbed);
        //     const html3 = await response3.text();
        //     const scriptMatch = html3.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
        //     if (!scriptMatch) continue;

        //     const unpackedScript = unpack(scriptMatch[1]);
        //     const regex = /file:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g;
        //     let match;
        //     while ((match = regex.exec(unpackedScript)) !== null) {
        //         streams.push({
        //             title: "VidTube " + match[2],
        //             streamUrl: match[1],
        //             headers: {}
        //         });
        //     }
        // } 
        if (streamEmbed.includes("updown")) {
            const response3 = await soraFetch(streamEmbed);
            const html3 = await response3.text();
            const scriptMatch = html3.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
            if (!scriptMatch) continue;

            const unpackedScript = unpack(scriptMatch[1]);
            const streamMatch = unpackedScript.match(/(?<=file:")[^"]+/);
            const stream = streamMatch ? streamMatch[0].trim() : '';

            streams.push({
                title: "UpDown",
                streamUrl: stream,
                headers: {}
            });
        } else if (streamEmbed.includes("streamwish")) {
            const response3 = await soraFetch(streamEmbed, { 
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://web6.topcinema.cam/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
                } 
            });

            const html3 = await response3.text();
            const scriptMatch = html3.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
            if (!scriptMatch) continue;

            const unpackedScript = unpack(scriptMatch[1]);

            const regex = /https:\/\/[^"'\s]+\/hls2\/[^"'\s]+/g;
            const matches = unpackedScript.match(regex);
            const stream = matches ? matches[0].trim() : '';

            streams.push({
                title: "StreamWish",
                streamUrl: stream,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://streamwish.fun/"
                }
            });
        } else if (streamEmbed.includes("vidhide")) {
            const response3 = await soraFetch(streamEmbed, { 
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://web6.topcinema.cam/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
                } 
            });

            const html3 = await response3.text();
            const scriptMatch = html3.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
            if (!scriptMatch) continue;

            const unpackedScript = unpack(scriptMatch[1]);

            const regex = /https:\/\/[^"'\s]+\/hls2\/[^"'\s]+/g;
            const matches = unpackedScript.match(regex);
            const stream = matches ? matches[0].trim() : '';

            streams.push({
                title: "Filelions",
                streamUrl: stream,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://vidhide.fun/"
                }
            });
        } 
        // else if (streamEmbed.includes("streamtape")) {
		// 	const response3 = await soraFetch(streamEmbed, { 
        //         headers: { 
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
        //             "Referer": "https://web6.topcinema.cam/",
        //             "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
        //         } 
        //     });

        //     const html3 = await response3.text();

        //     const regex = /<div id="ideoolink"[^>]*>([^<]+)<\/div>/;
		// 	   const match = html3.match(regex);
		// 	   const stream = `https:/${match[1].trim()}`

        //     streams.push({
        //         title: "Streamtape.cc",
        //         streamUrl: stream,
        //         headers: {
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
        //             "Referer": "https://streamtape.cc/"
        //         }
        //     });
		// } else if (streamEmbed.includes("luluvdo")) {
        //     const response3 = await soraFetch(streamEmbed, { 
        //         headers: { 
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
        //             "Referer": "https://web6.topcinema.cam/",
        //             "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
        //         } 
        //     });

        //     const html3 = await response3.text();

        //     const regex = /sources:\s*\[\{file:"([^"]+)"\}\]/;
        //     const match = html3.match(regex);
        //     const stream = match[1];

        //     streams.push({
        //         title: "LuluStream",
        //         streamUrl: stream,
        //         headers: {
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
        //             "Referer": "https://luluvdo.com/",
        //             "Origin": "https://luluvdo.com",
        //             "X-Requested-With": "XMLHttpRequest"
        //         }
        //     });
        // }
        else if (streamEmbed.includes("filemoon")) {
            const response3 = await soraFetch(streamEmbed, { 
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://web6.topcinema.cam/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
                } 
            });

            const html3 = await response3.text();
            const regex = /iframe src="([^"]+)"/;
            const match = html3.match(regex);
            if (!match) continue;
            const iframeEmbed = match[1];

            const response4 = await soraFetch(iframeEmbed, { 
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://filemoon.sx/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
                } 
            });

            const html4 = await response4.text();

            const scriptMatch = html4.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
            if (!scriptMatch) continue;

            const unpackedScript = unpack(scriptMatch[1]);

            const regex2 = /file:\s*"([^"]+)"/;
            const matches = unpackedScript.match(regex2);
            const stream = matches ? matches[1] : '';

            streams.push({
                title: "Filemoon",
                streamUrl: stream,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36"
                }
            });
        } else if (streamEmbed.includes("sendvid")) {
            const response3 = await soraFetch(streamEmbed, { 
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                    "Referer": "https://web6.topcinema.cam/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
                } 
            });

            const html3 = await response3.text();
            
            const regex = /var\s+video_source\s*=\s*"([^"]+)"/;
            const match = html3.match(regex);

            const stream = match ? match[1] : null;

            console.log("Stream URL:", stream);

            streams.push({
                title: "SendVid",
                streamUrl: stream,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36"
                }
            });
        }
        // else if (streamEmbed.includes("mixdrop")) {
		// 	const response3 = await soraFetch(streamEmbed, { 
        //         headers: { 
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
        //             "Referer": "https://web6.topcinema.cam/",
        //             "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" 
        //         } 
        //     });
        //     const html3 = await response3.text();

        //     const scriptBlocks = [...html3.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];

        //     let evalCode = null;
        //     for (const match of scriptBlocks) {
        //         const content = match[1];
        //         if (content.includes('eval(function(p,a,c,k,e,d)')) {
        //             evalCode = content.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*\)/)[0];
        //             break;
        //         }
        //     }

        //     if (!evalCode) {
        //         console.log("NO MATCH eval script with eval(function(p,a,c,k,e,d)) found");
        //         return;
        //     }

        //     console.log("Extracted eval code:", evalCode);

        //     const unpackedScript = unpack(evalCode);
        //     const regex = /MDCore\.wurl\s*=\s*"([^"]+)"/;
        //     const streamMatch = unpackedScript.match(regex);
        //     const stream = streamMatch ? `https:${streamMatch[1]}` : '';

        //     console.log("Stream URL:", stream);

        //     streams.push({
        //         title: "Mixdrop",
        //         streamUrl: stream,
        //         headers: {
        //             "Referer": "https://web6.topcinema.cam/",
        //             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
        //             "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        //         }
        //     });
		// }
    }

	const result = {
		streams,
		subtitles: ""
	};

	console.log(JSON.stringify(result));
	return JSON.stringify(result);
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