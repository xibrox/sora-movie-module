function searchResults(html) {
    const results = [];
    // Capture from the beginning of the item block up to the <div class="fixyear"> sibling
    const filmListRegex = /<div id="mt-\d+" class="item">([\s\S]*?)(?=<div class="fixyear">)/g;
    const items = html.matchAll(filmListRegex);

    for (const item of items) {
        const itemHtml = item[1];

        const hrefMatch = itemHtml.match(/<a href="([^"]+)"/);

        // Extract title from <span class="tt">TITLE</span>
        const titleMatch = itemHtml.match(/<span class="tt">([\s\S]*?)<\/span>/);

        // Extract image URL from <img ... src="...">
        const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"/);

        if (hrefMatch && titleMatch && imgMatch) {
            const href = hrefMatch[1];
            const title = titleMatch[1];
            const imageUrl = imgMatch[1];
        
            results.push({
                title: title.trim(),
                image: imageUrl.trim(),
                href: href.trim(),
            });
        }
    }

    console.log(results);
    return results;
}

function extractDetails(html) {
    const details = [];

    // Extract description from the <div itemprop="description"> and remove any HTML tags
    const descriptionMatch = html.match(/<div itemprop="description">([\s\S]*?)<\/div>/);
    let description = descriptionMatch 
        ? descriptionMatch[1].replace(/<[^>]+>/g, '').trim() 
        : 'N/A';

    // Extract original name (alias) from its corresponding div
    const aliasMatch = html.match(/<div class="metadatac"><b>Firt air date<\/b><span[^>]*>([^<]+)<\/span>/);
    let alias = aliasMatch ? aliasMatch[1].trim() : 'N/A';

    // Extract airdate from the "Firt air date" field
    const airdateMatch = html.match(/<b>Firt air date<\/b><span[^>]*>([^<]+)<\/span>/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

    details.push({
        description: description,
        alias: alias,
        airdate: airdate
    });

    console.log(details);
    return details;
}


function extractEpisodes(html) {
    const episodes = [];

    // Attempt to extract episodes from the <ul class="episodios"> list
    const episodesMatch = html.match(/<ul class="episodios">([\s\S]*?)<\/ul>/);

    if (episodesMatch) {
        // Match all <li> items within the episodios list
        const liMatches = episodesMatch[1].match(/<li>([\s\S]*?)<\/li>/g);
        
        if (liMatches) {
            liMatches.forEach(li => {
                // Extract the href from the <a> tag
                const hrefMatch = li.match(/<a href="([^"]+)"/);
                // Extract the episode number from the <div class="numerando">
                const numMatch = li.match(/<div class="numerando">(\d+)<\/div>/);
                if (hrefMatch && numMatch) {
                    episodes.push({
                        href: hrefMatch[1].trim(),
                        number: numMatch[1].trim()
                    });
                }
            });
        }
    }

    // Reverse the order so episodes are in ascending order (if needed)
    episodes.reverse();

    console.log(episodes);
    return episodes;
}


function extractStreamUrl(html) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    // Match the <li> block that contains the stream link text, then non-greedily search for the first <a> href attribute.
    const streamMatch = html.match(/<li>Right click and choose "Save link as..." : &nbsp <a rel="nofollow" target="_blank" href="([^"]+)"/);
    const stream = streamMatch ? streamMatch[1].trim() : 'N/A';

    // Match the <li> block that contains the subtitle download text.
    const subtitlesMatch = html.match(/Download Subtitle :&nbsp  <a rel="nofollow" target="_blank" href="([^"]+)"/);
    const subtitles = subtitlesMatch ? subtitlesMatch[1].trim() : 'N/A';

    console.log(stream);
    console.log(subtitles);

    const result = {
        stream: stream,
        subtitles: subtitles
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

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}
