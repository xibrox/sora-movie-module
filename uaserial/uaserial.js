async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://uaserial.me/search?query=${encodedKeyword}`);
        const html = await responseText.text();

        const regex = /<a\s+href="([^"]+)"\s+title="([^"]+)">[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<\/a>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[2].trim(),
                image: `https://uaserial.me${match[3].trim()}`,
                href: `https://uaserial.me${match[1].trim()}`
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
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const descriptionMatch = htmlText.match(/<div class="player__description description bordered">[\s\S]*?<div class="text">([\s\S]*?)<\/div>/);
        const description = descriptionMatch ? descriptionMatch[1].replace(/<br\s*\/?>/g, '\n').trim() : 'No description available';

        const airdateMatch = htmlText.match(/<div class="movie-data-item movie-data-item--date flex start">[\s\S]*?<span>(\d{1,2}\s[^\s<]+)<\/span>[\s\S]*?selection\/anime\/year-(\d{4})/);
        const airdate = airdateMatch ? `Дата релізу: ${airdateMatch[1]} ${airdateMatch[2]}` : 'Дата релізу: Unknown';

        const countryMatch = htmlText.match(/<div class="type color-text">Країна:<\/div>\s*<div class="value">\s*<a [^>]+>(.*?)<\/a>/);
        const studioMatch = htmlText.match(/<div class="type color-text">Студія:<\/div>\s*<div class="value">(.*?)<\/div>/);
        const timeMatch = htmlText.match(/<div class="type color-text">Час:<\/div>\s*<div class="value">(.*?)<\/div>/);
        const statusMatch = htmlText.match(/<div class="type color-text">Статус:<\/div>\s*<div class="value">(.*?)<\/div>/);
        const ratingMatch = htmlText.match(/<div class="type color-text">Рейтинг:<\/div>\s*<div class="value">(.*?)<\/div>/);

        const aliases = `
Країна: ${countryMatch ? countryMatch[1] : 'Unknown'}
Студія: ${studioMatch ? studioMatch[1] : 'Unknown'}
Час: ${timeMatch ? timeMatch[1] : 'Unknown'}
Статус: ${statusMatch ? statusMatch[1] : 'Unknown'}
Рейтинг: ${ratingMatch ? ratingMatch[1] : 'Unknown'}
        `.trim();

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
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const episodeOptions = [...html.matchAll(
            /<option[^>]*?data-series-number="(\d+)"[^>]*?value="([^"]+)"[^>]*?>([^<]+)<\/option>/g
        )];

        if (episodeOptions.length > 0) {
            const episodes = episodeOptions.map(([, number, value, label]) => ({
                href: value.startsWith('http') ? value : `https://uaserial.me${value}`,
                number: parseInt(number, 10),
                title: label.trim()
            }));

            console.log('Show episodes:', episodes);
            return JSON.stringify(episodes);
        }

        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i);

        if (iframeMatch) {
            const iframeSrc = iframeMatch[1];
            const movieEpisode = {
                href: iframeSrc.startsWith('http') ? iframeSrc : `https://uaserial.me${iframeSrc}`,
                number: 1,
                title: "Серія 1"
            };

            console.log('Movie episode:', movieEpisode);
            return JSON.stringify([movieEpisode]);
        }

        console.log('No episodes or iframe found');
        return JSON.stringify([]);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/uaserial\.me\/embed\/([^\/]+)\/season-([^\/]+)\/episode-([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const seasonNumber = match[2];
        const episodeNumber = match[3];

        const response = await soraFetch(url);
        const htmlText = await response.text();

        const episodesMatch = htmlText.match(/episodes\s*:\s*(\[[\s\S]*?\])\s*,?\s*\n/);
        if (!episodesMatch) {
            console.log("No episodes block found.");
            return null;
        }

        let rawJson = episodesMatch[1]
            .replace(/\\'/g, "'")
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');

        const episodes = JSON.parse(rawJson);
        const resultStreams = [];
        let subtitleUrl = "";

        // Try to match episode for series
        let targetEpisode = episodes.find(ep => {
            const title = ep.title || "";
            return title.includes(`Серія ${episodeNumber}`) || title.includes(`Серия ${episodeNumber}`);
        });

        // If not found (movie), fallback to entry with ashdi.vip links
        if (!targetEpisode) {
            targetEpisode = episodes.find(ep => {
                const sources = Array.isArray(ep.src) ? ep.src : ep.src?.ashdi ?? [];
                return sources.some(s => s.link && s.link.includes("ashdi.vip"));
            });

            if (!targetEpisode) {
                console.log(`Episode ${episodeNumber} or ashdi sources not found.`);
                return null;
            }
        }

        // Use proper source extraction
        const srcArray = Array.isArray(targetEpisode.src)
            ? targetEpisode.src
            : targetEpisode.src?.ashdi ?? [];

        for (const source of srcArray) {
            if (!source.link.includes("ashdi.vip")) continue;

            const streamRes = await soraFetch(source.link);
            const streamHtml = await streamRes.text();

            const fileMatch = streamHtml.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/);
            const subtitleMatch = streamHtml.match(/subtitle\s*:\s*"([^"]*)"/);

            if (fileMatch) {
                resultStreams.push({
                    title: source.name || targetEpisode.title || "",
                    streamUrl: fileMatch[1],
                    headers: {}
                });

                if (!subtitleUrl && subtitleMatch && subtitleMatch[1]) {
                    const fullSubtitle = subtitleMatch[1];
                    const cleanedSubtitle = fullSubtitle.match(/https?:\/\/[^\s"\]]+/)?.[0] || "";
                    subtitleUrl = cleanedSubtitle;
                }
            }
        }

        if (resultStreams.length === 0) {
            console.log("No ashdi.vip links found.");
            return null;
        }

        const result = {
            streams: resultStreams,
            subtitles: subtitleUrl
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


// extractStreamUrl('https://uaserial.me/embed/naruto/season-1/episode-2');
// extractStreamUrl('https://uaserial.me/embed/naruto-legend-of-the-stone-of-gelel/season-1/episode-1');

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
