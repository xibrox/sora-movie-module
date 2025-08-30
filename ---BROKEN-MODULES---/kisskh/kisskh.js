async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://kisskh.co/api/DramaList/Search?q=${encodedKeyword}&type=0`);
        const data = JSON.parse(responseText);

        const transformedResults = data.map(result => {
            const editedTitle = result.title.replace(/[\s()']/g, '-');

            return {
                title: result.title,
                image: result.thumbnail,
                href: `https://kisskh.co/Drama/${editedTitle}?id=${result.id}`
            };
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/kisskh\.co\/Drama\/([^\/]+)\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[2];
        const responseText = await fetch(`https://kisskh.co/api/DramaList/Drama/${showId}?isq=false`);
        const data = JSON.parse(responseText);

        const transformedResults = [{
            description: data.description || 'No description available',
            // Movies use runtime (in minutes)
            aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
            airdate: `Released: ${data.releaseDate ? data.releaseDate : 'Unknown'}`
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
        const match = url.match(/https:\/\/kisskh\.co\/Drama\/([^\/]+)\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
        const showId = match[2];
        
        const showResponseText = await fetch(`https://kisskh.co/api/DramaList/Drama/${showId}?isq=false`);
        const showData = JSON.parse(showResponseText);

        const episodes = showData.episodes?.map(episode => ({
            href: `https://kisskh.co/Drama/True-Beauty/Episode-${episode.number}?id=${showId}&ep=${episode.id}`,
            number: episode.number,
            title: episode.name || `Episode ${episode.number}` ||  ""
        }));

        const reversedEpisodes = episodes.reverse();

        console.log(reversedEpisodes);
    
        return JSON.stringify(reversedEpisodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/kisskh\.co\/Drama\/([^\/]+)\/Episode-([^\/]+)\?id=([^\/]+)\&ep=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showTitle = match[1];
        const episodeNumber = match[2];
        const showId = match[3];

        const streamUrls = [
            `https://hls12.kisskh.cloud/hls12/${showTitle}.Ep${episodeNumber}/index.m3u8`,
            `https://hls12.kisskh.cloud/hls12/${showTitle}-Ep${episodeNumber}/index.m3u8`,
            `https://hls.streamsub.top/hls07/${showId}/Ep${episodeNumber}_index.m3u8`,
            `https://hls03.loadfast.site/${showTitle}Ep${episodeNumber}.m3u8`,
            `https://hls03.videodelivery.top/${showId}/${showTitle}.Ep${episodeNumber}.mp4`,
            `https://videodelivery.top/${showTitle}.Ep${episodeNumber}.mp4`,
            `https://hls12.kisskh.cloud/hls12/${showTitle}-episode-${episodeNumber}.v0/index.m3u8`,
            `https://hls03.loadfast.site/${showTitle}Ep${episodeNumber}.m3u8`,
        ];

        try {
            const result = {
                stream: `https://hls.streamsub.top/hls07/${showId}/Ep${episodeNumber}_index.m3u8`,
                subtitles: `https://sub.streamsub.top/${showTitle}.Ep${episodeNumber}.en.srt` ||  "",
            };

            console.log(result);
            
            return JSON.stringify(result);
        } catch (err) {
            console.log(`Fetch error on endpoint https://hls.streamsub.top/hls07/${showId}/Ep${episodeNumber}_index.m3u8 for show ${showId}:`, err);
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}
