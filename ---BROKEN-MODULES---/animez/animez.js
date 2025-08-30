async function searchResults(keyword) {
    let results = [];

    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://animez.org/?act=search&f[status]=all&f[sortby]=lastest-chap&f[keyword]=${encodedKeyword}`, {
            headers: {
                'referer': 'https://animez.org/one-piece-7096/'
            }
        });
        const html = await responseText.text();

        console.log(html);

        const itemBlocks = html.match(/<li class="TPostMv">[\s\S]*?<\/li>/g);
        
        if (!itemBlocks) return results;
        
        itemBlocks.forEach(block => {
            const hrefMatch = block.match(/<a href="([^"]+)"/);
            const titleMatch = block.match(/<h2 class="Title">(.*?)<\/h2>/);
            const imgMatch = block.match(/<img[^>]+src="([^"]+)"/);
        
            if (hrefMatch && titleMatch && imgMatch) {
                const title = titleMatch[1].trim();
                const image = "https://animez.org/" + imgMatch[1].trim();
                const href = "https://animez.org" + hrefMatch[1].trim();
        
                results.push({ title, image, href });
            }
        });
        
        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<p[^>]*>(.*?)<\/p>/s);
    let description = descriptionMatch 
        ? decodeHTMLEntities(descriptionMatch[1].trim()) 
        : 'N/A';

    const aliasMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-clock"><\/i>\s*<\/div>\s*<span>\s*مدة العرض\s*:\s*<\/span>\s*<a[^>]*>\s*(\d+)\s*<\/a>/);
    let alias = aliasMatch ? aliasMatch[1].trim() : 'N/A';

    const airdateMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-calendar"><\/i>\s*<\/div>\s*<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*?>\s*(\d{4})\s*<\/a>/);
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
    
    const episodeRegex = /<a href="([^"]+)">\s*(\d+(?:-Dub)?)\s*<\/a>/g;
    let match;
    
    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1].trim() + "/watch/";
        const number = match[2].trim();
    
        episodes.push({
            href: href,
            number: number
        });
    }
    
    if (episodes.length > 0 && episodes[0].number !== "1") {
        episodes.reverse();
    }
    
    console.log(episodes);
    return episodes;
}


async function extractStreamUrl(html) {
    const serverMatch = html.match(/<li[^>]+data-watch="([^"]+mp4upload\.com[^"]+)"/);
    const embedUrl = serverMatch ? serverMatch[1].trim() : 'N/A';

    let streamUrl = "";

    if (embedUrl !== 'N/A') {
        const response = await fetch(embedUrl);
        const fetchedHtml = await response;
        
        const streamMatch = fetchedHtml.match(/player\.src\(\{\s*type:\s*["']video\/mp4["'],\s*src:\s*["']([^"']+)["']\s*\}\)/i);
        if (streamMatch) {
            streamUrl = streamMatch[1].trim();
        }
    }

    console.log(streamUrl);
    return streamUrl;
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

searchResults("https://animez.org/?act=search&f[status]=all&f[sortby]=lastest-chap&f[keyword]=naruto");

// extractEpisodes(`<nav class="mb-3">
//                                     <ul class="version-chap" id="list_chapter_id_detail">
//                                         <li class="wp-manga-chapter">
//                                             <a href="/naruto-9467/epi-220-116771/">220</a>
//                                             <span class="chapter-release-date"></span>
//                                         </li>
//                                         <li class="wp-manga-chapter">
//                                             <a href="/naruto-9467/epi-220dub-165487/">220-Dub</a>
//                                             <span class="chapter-release-date"></span>
//                                         </li>
//                                         <li class="wp-manga-chapter">
//                                             <a href="/naruto-9467/epi-219-116770/">219</a>
//                                             <span class="chapter-release-date"></span>
//                                         </li>
//                                         <li class="wp-manga-chapter">
//                                             <a href="/naruto-9467/epi-219dub-165488/">219-Dub</a>
//                                             <span class="chapter-release-date"></span>
//                                         </li>`);