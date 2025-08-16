async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://sudatchi-api.vercel.app/api/search?q=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.media.map(result => {
            return {
                title: result.title.english || result.title.romaji || result.title.native,
                image: result.coverImage.large || result.coverImage.extraLarge || result.coverImage.medium,
                href: `https://sudatchi.com/anime/${result.id}`
            };
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const responseText = await soraFetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = await responseText.json();

        const transformedResults = [{
            description: data.description || 'No description available',
            aliases: `Duration: ${data.duration ? data.duration : "Unknown"}`,
            airdate: `Aired: ${data.startDate.day}.${data.startDate.month}.${data.startDate.year}` || 'Aired: Unknown'
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
            
        if (!match) throw new Error("Invalid URL format");
            
        const showId = match[1];
        const responseText = await soraFetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = await responseText.json();

        const transformedResults = data.episodes.map(episode => {
            return {
                href: `https://sudatchi.com/watch/${showId}/${episode.number}`,
                number: episode.number,
                title: episode.title || ""
            };
        });
        
        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/watch\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const episodeNumber = match[2];

        try {
            const episodesApiUrl = `https://sudatchi.com/api/episode/${showId}/${episodeNumber}`;

            const responseTextEpisodes = await soraFetch(episodesApiUrl);
            const episodesData = await responseTextEpisodes.json();

            const episode = episodesData?.episodes?.find(episode => String(episode.number) === episodeNumber);

            const streamApiUrl = `https://sudatchi.com/api/streams?episodeId=${episode.id}`;
            
            // const responseTextStream = await soraFetch(streamApiUrl);
            // const streamData = await responseTextStream.text();

            // console.log(streamData);



            
            // const hlsSource = `https://sudatchi.com/${streamData.url}`;

            // const responseFile = await fetch(hlsSource);
            // const fileData = await responseFile.text();

            // console.log(fileData);

            // const audioRegex = /#EXT-X-MEDIA:[^\n]*TYPE=AUDIO[^\n]*URI="(https?:\/\/[^"]+)"/;
            // const audioMatch = fileData.match(audioRegex);

            // if (audioMatch && audioMatch[1]) {
            //     const audioUrl = audioMatch[1];

            //     console.log(audioUrl);

            //     return audioUrl;
            // }

            // const subtitleTrack = episodesData.subtitlesMap["1"];

            // const result = {
            //     stream: hlsSource ? hlsSource : null,
            //     subtitles: subtitleTrack ? `https://ipfs.sudatchi.com${subtitleTrack}` : null,
            // };
            
            console.log(streamApiUrl);
            return streamApiUrl;
        } catch (err) {
            console.log(`Fetch error for show ${showId}:`, err);
        }
        
        return null;
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

// extractStreamUrl(`https://sudatchi.com/watch/167143/1`);

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
