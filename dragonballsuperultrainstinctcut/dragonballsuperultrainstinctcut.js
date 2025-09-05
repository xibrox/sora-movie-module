async function searchResults(keyword) {
    const results = [];

    results.push({
        title: "Dragon Ball Super: Ultra Instinct Cut",
        image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/dragonballsuperultrainstinctcut/icon.png",
        href: "https://archive.org/details/dragon-ball-super-ultra-instinct-cut/"
    });
    
    console.log(`Results: ${JSON.stringify(results)}`);
    return JSON.stringify(results);
}

// searchResults();
// extractDetails();
// extractEpisodes();
// extractStreamUrl("https://archive.org/download/dragon-ball-recut/Dragon.Ball.Recut.E82.v2.I.Did.It--The.Strongest.Man.on.Earth.mp4|EP81");

async function extractDetails(url) {
    try {
        const transformedResults = [{
            description: "",
            aliases: "",
            airdate: ""
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
        const responseText = await soraFetch(`https://archive.org/details/dragon-ball-super-ultra-instinct-cut`);
        const html = await responseText.text();

        const regex = /playlist='(\[.*?\])'/s;
        const match = html.match(regex);

        const transformedResults = [];

        if (match) {
            try {
                const playlist = JSON.parse(match[1]);
                console.log(JSON.stringify(playlist));

                for (let i = 0; i < playlist.length; i++) {
                    const episode = playlist[i];
                    console.log(`Episode ${i + 1}: ${episode.title}`);

                    transformedResults.push({
                        href: `https://archive.org${episode.sources[0].file}|EP${i}`,
                        number: i + 1
                    });
                }

                console.log(JSON.stringify(transformedResults));
                return JSON.stringify(transformedResults);
            } catch (e) {
                console.error("JSON parse failed:", e);
            }
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const [streamUrl, episodeNumber] = url.split("|");

        const result = {
            streams: [
                {
                    title: "Dragon Ball Super: Ultra Instinct Cut " + episodeNumber,
                    streamUrl,
                    headers: {}
                }
            ],
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
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
