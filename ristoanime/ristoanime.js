async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const response = await soraFetch(`https://ristoanime.org/?s=${encodedKeyword}`);
        const html = await response.text();

        const regex = /<div class="MovieItem">[\s\S]*?<a href="([^"]+)"[\s\S]*?background-image:\s*url\(([^)]+)\)[\s\S]*?<h4>(.*?)<\/h4>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: match[2].trim(),
                href: match[1].trim()
            });
        }

        return JSON.stringify(results);
    } catch (error) {
        console.log("Fetch error in searchResults: " + error);
        return JSON.stringify([{ title: "Error", image: "", href: "" }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const descriptionMatch = html.match(/<div class="StoryArea">[\s\S]*?<p>(.*?)<\/p>/);
        const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description available';

        const aliasesMatch = html.match(/<h1 class="PostTitle">[\s\S]*?<a[^>]*>(.*?)<\/a>/);
        const aliases = aliasesMatch ? aliasesMatch[1].trim() : 'No aliases available';

        const airdateMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-calendar"><\/i>\s*<\/div>\s*<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*>\s*(\d{4})\s*<\/a>/);
        const airdate = airdateMatch ? `Aired: ${airdateMatch[1].trim()}` : 'Aired: Unknown';

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'No aliases available',
            airdate: 'Aired: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
        const episodes = [];
        let match;

        while ((match = episodeRegex.exec(html)) !== null) {
            const href = match[1].trim();
            const number = match[2].trim();

            episodes.push({
                href: `${href}watch/`,
                number: Number(number)
            });
        }

        if (episodes.length > 0 && episodes[0].number !== "1") {
            episodes.reverse();
        }

        return JSON.stringify(episodes);
    } catch (error) {
        console.log("Fetch error in extractEpisodes:", error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    console.log("Ristoanime URL: " + url);

    try {
        const streams = await networkFetch(url, 7, {}, ".m3u8");

        console.log("Ristoanime streams: " + JSON.stringify(streams));
        console.log("Ristoanime streams: " + streams.requests.find(url => url.includes('.m3u8')));

        if (streams.requests && streams.requests.length > 0) {
            const streamUrl = streams.requests.find(url => url.includes('.m3u8')) || "";

            const results = {
                streams: [{
                    title: "Stream",
                    streamUrl,
                    headers: {
                        "Referer": "https://vidmoly.net/",
                        "Origin": "https://vidmoly.net"
                    },
                }],
                subtitles: ""
            }

            return JSON.stringify(results);
        } else {
            return "";
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);
        return null;
    }
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }

    return text;
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
