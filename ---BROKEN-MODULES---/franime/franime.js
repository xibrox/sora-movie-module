async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        // const response = await fetch(`https://franime.to/?do=search&subaction=search&search_start=0&full_search=0&story=${encodedKeyword}`);
        // const html = await response.text();

        const url = "https://sora-passthrough.vercel.app/form";
        const data = {
            "url": "https://franime.to/",
            "form": {
                "do": "search",
                "subaction": "search",
                "story": keyword
            },
            "headers": {
                "Host": "franime.to",
                "Referer": "https://franime.to/",
                "Origin": "https://franime.to",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0"
            }
        };

        const response = await soraFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        console.log(response);
        const html = await response.text();
        // console.log(html);

        const regex = /<a[^>]+href="([^"]+)"[^>]*?>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*?alt="([^"]+)"[\s\S]*?<\/a>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: `https://franime.to${match[2].trim()}`,
                href: match[1].startsWith('http') ? match[1].trim() : `https://franime.to${match[1].trim()}`
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await soraFetch(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const descriptionMatch = htmlText.match(/<div class="ftext full-text cleasrfix">[\s\S]*?<h2 class="fsubtitle">Synopsis<\/h2>\s*([\s\S]*?)<\/div>/);
        const description = descriptionMatch ? descriptionMatch[1].replace(/<[^>]+>/g, '').trim() : 'No description available';

        const airdateMatch = htmlText.match(/<li><span>Date de Sortie:<\/span>\s*(\d{4}-\d{2}-\d{2})<\/li>/);
        const airdate = airdateMatch ? `Date de Sortie: ${airdateMatch[1]}` : 'Date de Sortie: Unknown';

        const genreMatch = htmlText.match(/<li><span>Genre:<\/span>\s*<span[^>]*itemprop="genre"[^>]*>\s*([^<]+)\s*<\/span>/);
        const genres = genreMatch ? genreMatch[1].replace(/&amp;/g, '&').trim() : 'Unknown';

        const studioMatch = htmlText.match(/<li><span>Studio:<\/span>\s*([^<]+)<\/li>/);
        const studio = studioMatch ? studioMatch[1].trim() : 'Unknown';

        const timeMatch = htmlText.match(/<li><span>Durée:<\/span>\s*([^<]+)<\/li>/);
        const duration = timeMatch ? timeMatch[1].trim() : 'Unknown';

        const ratingMatch = htmlText.match(/<div class="mrating">([\d.]+)\/10 TMDB<\/div>/);
        const rating = ratingMatch ? ratingMatch[1] : 'Unknown';

        const aliases = `
Genre: ${genres}
Studio: ${studio}
Durée: ${duration}
TMDB: ${rating}
        `.trim();

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/franime\.to\/(\d+)-/);
        const showId = match ? match[1] : null;
        if (!showId) throw new Error("Show ID not found in URL");

        const response = await soraFetch(`https://franime.to/engine/ajax/controller.php?mod=iframe_player&post_id=${showId}`);
        const json = await response.json();

        const matches = [...json.selectors.matchAll(/<option value="(\d+)"[^>]*?>épisode \d+<\/option>/g)];
        const episodes = matches.map(match => match[1]);

        let allEpisodes = [];

        for (let i = 0; i < episodes.length; i++) {
            const episode = episodes[i];
            const epNum = Number(episode);
            allEpisodes.push({
                href: `${showId}/${episode}`,
                number: epNum,
                title: `Episode ${episode}`
            });
        }

        console.log(allEpisodes);
        return JSON.stringify(allEpisodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }
}

// extractEpisodes("https://franime.to/233-naruto.html");

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const match = url.match(/^(\d+)\/(\d+)$/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const episodeNumber = match[2];

        console.log("SHOW ID: " + showId);
        console.log("EPISODE NUMBER: " + episodeNumber);

        const response = await fetch(`https://franime.to/engine/ajax/controller.php?mod=iframe_player&post_id=${showId}&select=series=${episodeNumber}`);
        const json = await response.json();

        console.log("JSON: " + json);

        const embedUrlMatch = json.player.match(/<iframe[^>]+src="([^"]+)"/);
        const embedUrl = embedUrlMatch ? embedUrlMatch[1] : null;

        console.log("EMBED URL: " + embedUrl);

        const responseText = await fetch(embedUrl);
        const html = await responseText.text();

        console.log("HTML: " + html);

        const mp4UrlMatch = html.match(/src:\s*"([^"]+\.mp4)"/);
        const mp4Url = mp4UrlMatch ? mp4UrlMatch[1] : null;

        console.log("MP4 URL: " + mp4Url);

        const stream = `https://video.sibnet.ru${mp4Url}`;

        // const result = {
        //     streams: [
        //         {
        //             title: "YES?",
        //             streamUrl: stream,
        //             headers: {
        //                 "Referer": embedUrl
        //             }
        //         }
        //     ]
        // };

        console.log(stream);
        return stream;
    } catch (error) {
        console.log("Fetch error in extractStreamUrl: " + error);
        return "";
    }
}

// extractStreamUrl('233/100');

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
