async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://ww.aniwave.se/filter?keyword=${encodedKeyword}`);
        const html = await responseText.text();

        const regex = /<div\s+class="item\s*">[\s\S]*?<a\s+href="([^"]+)">[\s\S]*?<img\s+src="([^"]+)"[^>]*>[\s\S]*?<a\s+class="name\s+d-title"[^>]*>([^<]+)<\/a>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            if (match[3].trim() === "Omiai Aite Wa Oshiego Tsuyokina Mondaiji") {
                continue;
            }

            results.push({
                title: match[3].trim(),
                image: match[2].trim(),
                href: `https://ww.aniwave.se${match[1].trim()}`
            });
        }

        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const descriptionMatch = html.match(/<div class="synopsis mb-3">[\s\S]*?<div class="content">(.*?)<\/div>/);
        const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description available';

        const aliasesMatch = html.match(/<div class="names font-italic mb-2">(.*?)<\/div>/);
        const aliases = aliasesMatch ? aliasesMatch[1].trim() : 'No aliases available';

        const airdateMatch = html.match(/Date aired:\s*<span><span[^>]*>(.*?)<\/span>/);
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
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/ww\.aniwave\.se\/anime-watch\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeSlug = match[1];

        const match2 = animeSlug.match(/([^-]+)/);

        const firstSlugWord = match2[1];

        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const episodesMatch = html.match(/Episodes:\s*<span>(\d+)<\/span>/);
        const episodesCount = episodesMatch ? parseInt(episodesMatch[1], 10) : 0;

        const transformedResults = [];

        if (episodesCount > 0) {
            for (let i = 1; i <= episodesCount; i++) {
                transformedResults.push({
                    href: `${url}/ep-${i}`,
                    number: i
                });
            }
        } else {
            const apiUrl = `https://ww.aniwave.se/filter?keyword=${firstSlugWord}`;

            const response = await soraFetch(apiUrl);
            const data = await response.text();

            const regex = new RegExp(
                `<a\\s+[^>]*href="\\/anime-watch\\/${animeSlug}"[^>]*>[\\s\\S]*?<span>Ep:\\s*(\\d+)<\\/span>`,
                'i'
            );
        
            const epMatch = data.match(regex);
            const episodesCount2 = epMatch ? parseInt(epMatch[1], 10) : 0;

            for (let i = 1; i <= episodesCount2; i++) {
                transformedResults.push({
                    href: `${url}/ep-${i}`,
                    number: i
                });
            }
        }

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/ww\.aniwave\.se\/anime-watch\/([^\/]+)\/ep-([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeSlug = match[1];
        const episodeNumber = match[2];
        const headers = {
            'Referer': url,
        };

        console.log(`Fetching stream URL for anime: ${animeSlug}, episode: ${episodeNumber}`);

        const apiUrl = `https://ww.aniwave.se/ajax/player/?ep=${animeSlug}-episode-${episodeNumber}&dub=false&sn=${animeSlug}&epn=${episodeNumber}&g=true&autostart=true`;
        const responseText = await soraFetch(apiUrl, { headers });
        const html = await responseText.text();

        const regex = /file"\s*:\s*"([^"]+\.m3u8)"/g;
        const subUrls = [];
        let match2;
        while ((match2 = regex.exec(html)) !== null) {
            subUrls.push(match2[1]);
        }

        console.log(subUrls[0]);

        const apiUrl2 = `https://ww.aniwave.se/ajax/player/?ep=${animeSlug}-episode-${episodeNumber}&dub=true&sn=${animeSlug}-dub&epn=${episodeNumber}&g=true&autostart=true`;
        const responseText2 = await soraFetch(apiUrl2, { headers });
        const html2 = await responseText2.text();

        const regex2 = /file"\s*:\s*"([^"]+\.m3u8)"/g;
        const dubUrls = [];
        let match3;
        while ((match3 = regex2.exec(html2)) !== null) {
            dubUrls.push(match3[1]);
        }

        console.log(dubUrls[0]);

        const streams = [];

        if (subUrls[0]) {
            streams.push({
                title: "SUB",
                streamUrl: subUrls[0],
                headers: {
                    'Referer': url,
                }
            });
        }

        if (dubUrls[0]) {
            streams.push({
                title: "DUB",
                streamUrl: dubUrls[0],
                headers: {
                    'Referer': url,
                }
            });
        }

        const result = {
            streams,
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);

        // const hlsSource = `https://hlsx3cdn.echovideo.to/${animeSlug}/${episodeNumber}/master.m3u8`;
        
        // console.log(`HLS Source: ${hlsSource}`);
        // return hlsSource;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);

        const result = {
            streams: "",
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
    }
}

// extractStreamUrl(`https://ww.aniwave.se/anime-watch/one-piece/ep-1`);

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
