async function searchResults(keyword) {
    const response = await soraFetch(`https://animeztoon.com/search/?s_keyword=${keyword}`);
    const html = await response.text();

    const linkRegex = /<a\s+href="(https:\/\/animeztoon\.com\/[^"]+?)"[^>]*>[\s\S]*?<span\s+data-en-title>(.*?)<\/span>/g;

    const imageRegex = /<img[^>]+src='([^']+)'/g;

    let links = [];
    let images = [];

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        links.push({
            href: match[1],
            title: match[2],
        });
    }

    while ((match = imageRegex.exec(html)) !== null) {
        images.push(match[1]);
    }

    const results = links.map((item, index) => ({
        ...item,
        image: images[index] || null,
    }));

    console.log(results);
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await soraFetch(url);
    const html = await response.text();

    const descriptionMatch = html.match(/نظرة عامة:<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'N/A';

    const seasonMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*موسم:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const season = seasonMatch ? seasonMatch[1].trim() : 'N/A';

    const originalTitleMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*أصلي:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const originalTitle = originalTitleMatch ? originalTitleMatch[1].trim() : 'N/A';

    const englishTitleMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*English:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const englishTitle = englishTitleMatch ? englishTitleMatch[1].trim() : 'N/A';

    const durationMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*المدة الزمنية:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const duration = durationMatch ? durationMatch[1].trim() : 'N/A';

    const episodesMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*الحلقات:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const episodes = episodesMatch ? episodesMatch[1].trim() : 'N/A';

    const statusMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*الحالة:\s*<\/span>\s*<span[^>]*class="leading-6"[^>]*>\s*<span[^>]*class="font-normal[^"]*"[^>]*>\s*([^<]+)\s*<\/span>/);
    const status = statusMatch ? statusMatch[1].trim() : 'N/A';

    const genresBlockMatch = html.match(/<span[^>]*class="font-semibold[^"]*"[^>]*>\s*النوع:\s*<\/span>\s*<span[^>]*class="leading-6"[^>]*>([\s\S]*?)<\/span>/);
    let genres = 'N/A';
    if (genresBlockMatch) {
        const genreLinks = [...genresBlockMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)];
        const genreNames = genreLinks.map(m => m[1].trim());
        if (genreNames.length) {
            genres = genreNames.join(', ');
        }
    }

    const aliasesString =
        `Season: ${season}\nOriginal title: ${originalTitle}\nEnglish title: ${englishTitle}\nDuration: ${duration}\nEpisodes: ${episodes}\nStatus: ${status}\nGenres: ${genres}`;

    results.push({
        description,
        aliases: aliasesString,
        airdate: ''
    });

    console.log(results);
    return JSON.stringify(results);
}

async function extractEpisodes(url) {
    const response = await soraFetch(url);
    const html = await response.text();

    const regex = /<a\s+href="([^"]+)"[^>]*title="[^"]* الحلقة (\d+)"[^>]*>/g;

    let match;
    const episodes = [];

    while ((match = regex.exec(html)) !== null) {
        const href = match[1];
        const number = +match[2];
        episodes.push({ number, href });
    }

    episodes.sort((a, b) => a.number - b.number);

    console.log(episodes);
    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    const response = await soraFetch(url);
    const html = await response.text();

    const allMatches = [...html.matchAll(/<div class="player-selection player-(dub|sub)[^>]*">([\s\S]*?)<\/div>/g)];
    const streams = [];

    for (const [, type, sectionHtml] of allMatches) {
        const embedRegex = /<span[^>]*data-embed-id="([^"]+)"[^>]*>([^<]+)<\/span>/g;

        let match;
        while ((match = embedRegex.exec(sectionHtml)) !== null) {
            const fullValue = match[1];
            const label = match[2].trim();

            const afterColon = fullValue.split(":")[1];
            if (!afterColon) continue;

            let decodedUrl;
            try {
                decodedUrl = atob(afterColon);
            } catch {
                continue;
            }

            // iframe containing mp4
            if (decodedUrl.startsWith("<iframe")) {
                const mp4Match = decodedUrl.match(/video_url=([^&#"]+\.mp4)/);
                if (mp4Match) {
                    const decodedMp4 = decodeURIComponent(mp4Match[1]);
                    if (decodedMp4.startsWith("http")) {
                        streams.push({
                            title: label,
                            streamUrl: decodedMp4,
                            headers: {}
                        });
                    }
                }
            }

            // 4shared embed
            else if (decodedUrl.includes("4shared.com")) {
                try {
                const embedRes = await soraFetch(decodedUrl);
                const embedHtml = await embedRes.text();
                if (/This file is not available/.test(embedHtml)) continue;

                const srcMatch = embedHtml.match(/<source[^>]+src="([^"]+\.mp4)"/i);
                if (srcMatch && srcMatch[1].startsWith("http")) {
                    streams.push({
                        title: label,
                        streamUrl: srcMatch[1],
                        headers: {
                            "Referer": "https://4shared.com/"
                        }
                    });
                }
                } catch {
                    continue;
                }
            }
        }
    }

    const results = {
        streams,
        subtitles: ""
    };

    console.log(results);
    return JSON.stringify(results);
}

// searchResults("المحقق");
// extractDetails("https://animeztoon.com/anime/%d9%85%d8%b4%d8%a7%d9%87%d8%af%d8%a9-%d8%a7%d9%84%d9%85%d8%ad%d9%82%d9%82-%d9%83%d9%88%d9%86%d8%a7%d9%86-%d8%a7%d9%84%d8%ac%d8%b2%d8%a1-%d8%a7%d9%84%d8%ad%d8%a7%d8%af%d9%8a-%d8%b9%d8%b4%d8%b1-%d9%85/");
// extractEpisodes("https://animeztoon.com/anime/%d8%a7%d9%84%d9%85%d8%ad%d9%82%d9%82-%d9%83%d9%88%d9%86%d8%a7%d9%86-%d8%a7%d9%84%d8%ac%d8%b2%d8%a1-%d8%a7%d9%84%d8%ae%d8%a7%d9%85%d8%b3-%d9%88%d8%a7%d9%84%d8%b9%d8%b4%d8%b1%d9%88%d9%86-%d9%85%d8%af/");
// extractStreamUrl("https://animeztoon.com/watch/%d8%a7%d9%84%d9%85%d8%ad%d9%82%d9%82-%d9%83%d9%88%d9%86%d8%a7%d9%86-%d8%a7%d9%84%d8%ac%d8%b2%d8%a1-%d8%a7%d9%84%d8%ad%d8%a7%d8%af%d9%8a-%d8%b9%d8%b4%d8%b1-%d9%85%d8%af%d8%a8%d9%84%d8%ac-%d8%a7%d9%84/");
// extractStreamUrl("https://animeztoon.com/watch/%d8%a7%d9%84%d9%85%d8%ad%d9%82%d9%82-%d9%83%d9%88%d9%86%d8%a7%d9%86-%d8%a7%d9%84%d8%ac%d8%b2%d8%a1-%d8%a7%d9%84%d8%ae%d8%a7%d9%85%d8%b3-%d9%88%d8%a7%d9%84%d8%b9%d8%b4%d8%b1%d9%88%d9%86-%d9%85%d8%af-62/");

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
