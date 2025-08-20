async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://anizone.to/anime?search=${encodedKeyword}`);
        const html = await responseText.text();

        const regex = /<img\s+src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]+?<a[^>]+href="([^"]+)"\s+title="([^"]+)"/g;

        const results = [];
        let match;

        results.push({
            title: "Use External Player",
            image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/anizone/UseExternalPlayer.png",
            href: ""
        });

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[4].trim(),
                image: match[1].trim(),
                href: match[3].trim()
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

        const descriptionMatch = htmlText.match(/<h3 class="sr-only">Synopsis<\/h3>\s*<div>([\s\S]*?)<\/div>/);
        const description = descriptionMatch ? descriptionMatch[1].replace(/\s+/g, ' ').trim() : 'No description available';

        const yearMatch = htmlText.match(/>\s*(\d{4})\s*</);
        const airdate = yearMatch ? `Released: ${yearMatch[1]}` : 'Released: Unknown';

        const typeMatch = htmlText.match(/>\s*(TV Series|Movie|ONA|OVA|Special|Music)\s*</i);
        const mediaType = typeMatch ? typeMatch[1].trim() : 'Unknown';

        const statusMatch = htmlText.match(/>\s*(Completed|Ongoing|Upcoming)\s*</i);
        const status = statusMatch ? statusMatch[1].trim() : 'Unknown';

        const episodeMatch = htmlText.match(/>\s*(\d+)\s*Episodes?\s*</i);
        const episodeCount = episodeMatch ? episodeMatch[1].trim() : 'Unknown';

        const genreRegex = /<a[^>]+title="([^"]+)"[^>]*class="[^"]*bg-gray-600[^"]*">[^<]+<\/a>/g;
        let genreList = [];
        let match;
        while ((match = genreRegex.exec(htmlText)) !== null) {
            genreList.push(match[1].trim());
        }

        const aliases = `
Type: ${mediaType}
Status: ${status}
Episodes: ${episodeCount}
Genres: ${genreList.join(', ') || 'Unknown'}
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

        const episodeMatch = html.match(/>\s*(\d+)\s*Episodes?\s*</i);
        const episodeCount = episodeMatch ? episodeMatch[1].trim() : 'Unknown';

        let episodes = [];

        for (let i = 1; i <= episodeCount; i++) {
            const episodeUrl = `${url}/${i}`;
            const episodeTitle = `Episode ${i}`;

            episodes.push({
                title: episodeTitle,
                href: episodeUrl,
                number: i
            });
        }

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const streamMatch = htmlText.match(/<media-player[^>]*\s+src="([^"]+\.m3u8)"/);
        const resultStreams = streamMatch ? streamMatch[1] : null;

        const subtitleMatch = htmlText.match(/<track[^>]+src=([^\s>"]+\.srt)[^>]*label="([^"]*?)"[^>]*>/gi);
        let subtitleUrl = null;

        if (subtitleMatch) {
            for (const track of subtitleMatch) {
                const match = track.match(/src=([^\s>"]+\.srt)[^>]*label="([^"]*?)"/i);
                if (match && !/song/i.test(match[2])) {
                    subtitleUrl = match[1];
                    break;
                }
            }
        }

        const result = {
            stream: resultStreams,
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
