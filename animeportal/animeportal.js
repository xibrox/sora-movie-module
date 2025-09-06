async function searchResults(keyword) {
    try {
        const responseText = await soraFetch(`https://anime-portal.su/search/one/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `do=search&subaction=search&from_page=0&story=${keyword}`,
        });
        const html = await responseText.text();

        // Parse results from HTML (not JSON)
        // Each result is an <a href="..."><div class="mov">...</div></a>
        const regex = /<a\s+href="([^"]+)">\s*<div class="mov">[\s\S]*?<img\s+src="([^"]+)"[^>]*>[\s\S]*?<div class="name">([\s\S]*?)<\/div>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: `https://anime-portal.su${match[2].trim()}`,
                href: match[1].startsWith('http') ? match[1].trim() : `https://anime-portal.su${match[1].trim()}`
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        // Description
        const descMatch = html.match(/<div class="page__text full-text clearfix"[^>]*>([\s\S]*?)<\/div>/);
        const description = descMatch
            ? descMatch[1]
                .replace(/<\/p>\s*<p>/gi, ' ')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim()
            : 'Описание недоступно';

        // Aliases
        // Duration
        const durationMatch = html.match(/Тип аниме:<\/div>\s*<div class="mov-desc">([^<]+)<\/div>/);
        const duration = durationMatch ? `Длительность: ${durationMatch[1]}` : null;

        // Studio
        const studioMatch = html.match(/Студия:<\/div>\s*<div class="mov-desc"><a[^>]*>([^<]+)<\/a>/);
        const studio = studioMatch ? `Студия: ${studioMatch[1]}` : null;

        // Genres
        const genresMatch = html.match(/Жанры:<\/div>\s*<div class="mov-desc">([\s\S]*?)<\/div>/);
        let genres = null;
        if (genresMatch) {
            const genreList = Array.from(genresMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)).map(m => m[1]);
            genres = `Жанры: ${genreList.join(', ')}`;
        }

        // Rating (World-Art)
        const waRatingMatch = html.match(/<div class="pmovie__rating pmovie__rating--kp">\s*<div class="pmovie__rating-content">([\d.]+)<\/div>/);
        const rating = waRatingMatch ? `Оценка: ${waRatingMatch[1]}` : null;

        const aliasesParts = [duration, genres, studio, rating].filter(Boolean);
        const aliases = aliasesParts.length ? aliasesParts.join('\n') : 'Информация недоступна';

        // Airdate
        const airdateMatch = html.match(/Год:<\/div>\s*<div class="mov-desc"[^>]*><a[^>]*>(\d{4})<\/a>/);
        const airdate = airdateMatch ? `Год выхода: ${airdateMatch[1]}` : 'Год выхода: неизвестен';

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Ошибка загрузки описания',
            aliases: 'Информация недоступна',
            airdate: 'Год выхода: неизвестен'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        // Find the videodb JSON object in the HTML
        const videodbMatch = html.match(/var\s+videodb\s*=\s*({[\s\S]+?});/);
        if (!videodbMatch) throw new Error("videodb not found");

        const videodb = JSON.parse(videodbMatch[1]);
        const translators = videodb.translators || {};

        const results = [];

        for (const translatorBlock of Object.values(translators)) {
            const seasons = translatorBlock.seasons || {};
            for (const [seasonNum, episodesArr] of Object.entries(seasons)) {
                for (const ep of episodesArr) {
                    // Avoid duplicates
                    if (!results.some(e => e.href === `${url}|${seasonNum}|${ep.num}`)) {
                        results.push({
                            href: `${url}|${seasonNum}|${ep.num}`,
                            number: Number(ep.num)
                        });
                    }
                }
            }
        }

        // Sort by season and episode number
        results.sort((a, b) => {
            const [ , seasonA, epA ] = a.href.split('|').map(Number);
            const [ , seasonB, epB ] = b.href.split('|').map(Number);
            return seasonA - seasonB || epA - epB;
        });

        console.log(`Episodes: ${JSON.stringify(results)}`);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

// searchResults('one punch');
// extractDetails('https://anime-portal.su/4900-klinok-rassekajushhij-demonov.html');
// extractEpisodes('https://anime-portal.su/4900-klinok-rassekajushhij-demonov.html');
// extractStreamUrl('https://anime-portal.su/4900-klinok-rassekajushhij-demonov.html|1|1');

async function extractStreamUrl(url) {
    try {
        const [url2, season, episode] = url.split('|');

        const responseText = await soraFetch(url2);
        const html = await responseText.text();

        // Find the videodb JSON object in the HTML
        const videodbMatch = html.match(/var\s+videodb\s*=\s*({[\s\S]+?});/);
        if (!videodbMatch) throw new Error("videodb not found");

        const videodb = JSON.parse(videodbMatch[1]);

        // Get all translators
        const translators = videodb.translators || {};
        const translatorKeys = Object.keys(translators);
        if (translatorKeys.length === 0) throw new Error("No translators found");

        let streams = [];

        for (const translatorKey of translatorKeys) {
            const translatorBlock = translators[translatorKey];
            const seasons = translatorBlock.seasons || {};
            const episodesArr = seasons[season];
            if (!episodesArr) continue;

            // Get all episodes for this season and translator
            for (const episodeObj of episodesArr) {
                // Only use hls.m3u8
                if (episodeObj.hls !== "hls.m3u8" && !episodeObj.hls.endsWith(".m3u8")) continue;

                // If a specific episode is requested, skip others
                if (episode && String(episodeObj.num) !== String(episode)) continue;

                const queryString = episodeObj.quality
                    .map(q => `quality%5B%5D=${q}`)
                    .join("&");

                const response = await soraFetch(`https://anime-portal.su/engine/videodb/sources.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0',
                        'Referer': url2
                    },
                    body: `sub=${episodeObj.sub}&allsubs=${encodeURIComponent(episodeObj.allsubs)}&num=${episodeObj.num}&hls=${episodeObj.hls}&hash=${episodeObj.hash}&${queryString}&type=animetvseries`
                });

                const data = await response.json();

                streams.push({
                    title: translatorKey,
                    streamUrl: data.hls,
                    headers: {}
                });
            }
        }

        const result = {
            streams,
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);

        const result = {
            streams: [],
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
    }
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
