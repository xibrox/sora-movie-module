async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=aad3fab1607b552befd9a2ac37e556af&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        // Filter results to include only movies
        const transformedResults = data.results
            .filter(result => result.media_type === "movie") // Ensure only movies
            .map(result => ({
                title: result.title || result.name,
                image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                href: `https://c.hopmarks.com/movie/${result.id}`
            }));

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/c\.hopmarks\.com\/movie\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const movieId = match[1];
        const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=aad3fab1607b552befd9a2ac37e556af`);
        const data = JSON.parse(responseText);

        const transformedResults = [{
            description: data.overview || 'No description available',
            aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
            airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
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
        const match = url.match(/https:\/\/c\.hopmarks\.com\/movie\/([^\/]+)/);
        
        if (!match) throw new Error("Invalid URL format");
        
        const movieId = match[1];
        
        return JSON.stringify([
            { href: `https://c.hopmarks.com/movie/${movieId}`, number: 1, title: "Full Movie" }
        ]);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    const servicesWithCaption = [
        "ghost",
    ];
  
    const servicesWithoutCaption = [
        "guru",
        "halo",
        "g1",
        "g2",
        "alpha",
        "fastx",
        "astra",
        "anime",
        "ninja",
        "catflix",
        "hyvax",
        "vidcloud",
        "filmxyz",
        "shadow",
        "kaze",
        "asiacloud",
        "zenith",
        "kage",
        "filmecho",
        "kinoecho",
        "ee3",
        "putafilme",
        "ophim",
    ];

    const secretKey = ["I", "3LZu", "M2V3", "4EXX", "s4", "yRy", "oqMz", "ysE", "RT", "iSI", "zlc", "H", "YNp", "5vR6", "h9S", "R", "jo", "F", "h2", "W8", "i", "sz09", "Xom", "gpU", "q", "6Qvg", "Cu", "5Zaz", "VK", "od", "FGY4", "eu", "D5Q", "smH", "11eq", "QrXs", "3", "L3", "YhlP", "c", "Z", "YT", "bnsy", "5", "fcL", "L22G", "r8", "J", "4", "gnK"];

    try {
        let subtitles = "";

        const match = url.match(/https:\/\/c\.hopmarks\.com\/movie\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const movieId = match[1];

        // Try services with captions
        loopWithCaptions:
        for (let i = 0; i < servicesWithCaption.length; i++) {
            for (let j = 0; j < secretKey.length; j++) {
                const service = servicesWithCaption[i];
                const apiUrl = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                
                try {
                    const responseText = await fetch(apiUrl);
                    const data = JSON.parse(responseText);
                    
                    if (data && data.error !== "Internal Server Error") {
                        const hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                        const subtitleTrack = data.data?.captions?.find(track =>
                            track.label.startsWith('English')
                        );

                        subtitles = subtitleTrack ? subtitleTrack.file : "";

                        if (hlsSource?.url) {
                            const checkedUrl = await fetch(hlsSource.url);
                            const html = checkedUrl;

                            const titleRegex = /<title>400 Bad Request<\/title>/i;
                            const match = html.match(titleRegex);

                            if (match) {
                                console.log("Error: 400 Bad Request");
                                continue loopWithCaptions;
                            } else {
                                console.log(html);
                            }

                            const result = {
                                stream: hlsSource ? hlsSource.url : "",
                                subtitles: subtitles
                            };
    
                            return JSON.stringify(result);
                        }
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint ${apiUrl} for movie ${movieId}:`, err);
                }
            }
        }

        // Try services without captions
        loopWithoutCaptions:
        for (let i = 0; i < servicesWithoutCaption.length; i++) {
            for (let j = 0; j < secretKey.length; j++) {
                const service = servicesWithoutCaption[i];
                const apiUrl = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                
                try {
                    const responseText = await fetch(apiUrl);
                    const data = JSON.parse(responseText);

                    if (data && data.error !== "Internal Server Error") {
                        const hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                        
                        if (hlsSource?.url) {
                            const checkedUrl = await fetch(hlsSource.url);
                            const html = checkedUrl;

                            const titleRegex = /<title>400 Bad Request<\/title>/i;
                            const match = html.match(titleRegex);

                            if (match) {
                                console.log("Error: 400 Bad Request");
                                continue loopWithoutCaptions;
                            } else {
                                console.log(html);
                            }

                            const result = {
                                stream: hlsSource ? hlsSource.url : "",
                                subtitles: subtitles
                            };

                            return JSON.stringify(result);
                        }
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint ${apiUrl} for movie ${movieId}:`, err);
                }
            }
        }

        return null;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}