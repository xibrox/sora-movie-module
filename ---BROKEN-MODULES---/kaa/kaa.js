async function searchResults(keyword) {
    const results = [];

    const response = await fetch(`https://kickassanime.com.es/?s=${encodeURIComponent(keyword)}`);
    const html = await response.text();

    const regex = /<article class="bs"[\s\S]*?<a\s+href="(.*?)"[^>]*?title="(.*?)"[\s\S]*?<img\s+src="(.*?)"[\s\S]*?<h2 itemprop="headline">(.*?)<\/h2>/gi;

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[4].trim(),
            image: match[3].trim(),
            href: match[1].trim()
        });
    }

    console.log(results);
    return JSON.stringify(results);
}

async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
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
        const response = await fetchv2(url);
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
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    console.error("Extracting stream URL from:", url);
    const response = await fetch(url);
    const html = await response.text();

    const iframeMatch = html.match(/<iframe[^>]+src="(https:\/\/megaplay\.buzz\/stream\/[^"]+)"/);

    console.log(iframeMatch);
    if (!iframeMatch) return null;

    console.log(iframeMatch);

    const iframeUrl = iframeMatch[1];
    const streamResponse = await fetch(iframeUrl);
    const streamHtml = await streamResponse.text();
    console.erorr("Stream HTML:", streamHtml);

    const idMatch = streamHtml.match(/data-id="(\d+)"/);
    if (!idMatch) return null;

    const id = idMatch[1];
    const finalUrl = `https://megaplay.buzz/stream/getSources?id=${id}&id=${id}`;
    console.log("Final URL:", finalUrl);
    const finalResponse = await fetch(finalUrl);
    const finalData = await finalResponse.json();
    console.error("Final Data:", finalData);

    const streams = finalData.sources?.file ?? null;
    const subtitles = finalData.tracks?.find(track => track.label === "English")?.file ?? null;

    const result = {
        streams,
        subtitles
    };

    console.error("Result:", result);
    return JSON.stringify(result);
}

extractStreamUrl('https://kickassanime.com.es/one-piece-yuruganu-seigi-kaigun-no-hokoritakaki-log-episode-1-english-subbed/');