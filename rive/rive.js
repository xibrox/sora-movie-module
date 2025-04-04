async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetchv2(`https://api.themoviedb.org/3/search/multi?api_key=68e094699525b18a70bab2f86b1fa706&query=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://rivestream.org/watch?type=movie&id=${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://rivestream.org/watch?type=tv&id=${result.id}&season=1&episode=1`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://rivestream.org/watch?type=tv&id=${result.id}&season=1&episode=1`
                };
            }
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('movie')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=movie&id=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=tv&id=([^\/]+)&season=([^\/]+)&episode=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
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
        if(url.includes('movie')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=movie&id=([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://rivestream.org/watch?type=movie&id=${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=tv&id=([^\/]+)&season=([^\/]+)&episode=([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://rivestream.org/watch?type=tv&id=${showId}&season=${seasonNumber}&episode=${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    // "hyvax" is with .srt captions
  
    // const servicesWithCaption = [
    //     "ghost",
    // ];
  
    const servicesWithoutCaption = [
        "guru",
        // "halo",
        // "g1",
        // "g2",
        // "alpha",
        // "fastx",
        // "astra",
        // "anime",
        // "ninja",
        // "catflix",
        // "hyvax",
        // "vidcloud",
        // "filmxyz",
        // "shadow",
        // "kaze",
        // "asiacloud",
        // "zenith",
        // "kage",
        // "filmecho",
        // "kinoecho",
        // "ee3",
        // "putafilme",
        // "ophim",
    ];

    const secretKey = ["I", "3LZu", "M2V3", "4EXX", "s4", "yRy", "oqMz", "ysE", "RT", "iSI", "zlc", "H", "YNp", "5vR6", "h9S", "R", "jo", "F", "h2", "W8", "i", "sz09", "Xom", "gpU", "q", "6Qvg", "Cu", "5Zaz", "VK", "od", "FGY4", "eu", "D5Q", "smH", "11eq", "QrXs", "3", "L3", "YhlP", "c", "Z", "YT", "bnsy", "5", "fcL", "L22G", "r8", "J", "4", "gnK"];

    try {
        if (url.includes('movie')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=movie&id=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            for (let i = 0; i < servicesWithoutCaption.length; i++) {
                for (let j = 0; j < secretKey.length; j++) {
                    const service = servicesWithoutCaption[i];
                    const apiUrl = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    // const apiUrl2 = `https://scrapper.rivestream.org/api/embed?provider=vidsrcrip&id=${movieId}&api_key=d64117f26031a428449f102ced3aba73`;

                    try {
                        const subtitleTrackResponse = await fetchv2(`https://sub.wyzie.ru/search?id=${movieId}`);
                        const subtitleTrackData = await subtitleTrackResponse.json();

                        const subtitleTrack = subtitleTrackData.find(track =>
                            track.display.startsWith('English')
                        );
                        
                        const response = await fetchv2(apiUrl);
                        const data = await response.json();

                        if (data && data.error !== "Internal Server Error") {
                            const preferredQualities = ['HLS 1', 'HLS 7', 'HLS 10', 'HLS 13', 'HLS 15', 'HLS 4'];
                            let hlsSource;

                            for (const quality of preferredQualities) {
                                hlsSource = data.data?.sources?.find(source => source.format === 'hls' && source.quality === quality);
                                if (hlsSource) break;
                            }

                            if (!hlsSource) {
                                hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                            }

                            console.log("URL:" + JSON.stringify(hlsSource?.url));

                            if (hlsSource?.url && !hlsSource.url.includes("uwu")) {
                                const playlistResponse = await fetchv2(hlsSource.url);
                                const playlistText = await playlistResponse.text();

                                console.log(playlistText);

                                const streamMatches = playlistText.match(/#EXT-X-STREAM-INF:.*?RESOLUTION=(\d+x\d+).*?\n(.*?)(?:\n|$)/g);

                                if (streamMatches) {
                                    const streams = streamMatches
                                        .map(matchStr => {
                                            const resolutionMatch = matchStr.match(/RESOLUTION=(\d+)x(\d+)/);
                                            const lines = matchStr.split('\n').filter(Boolean);
                                            const relativeUrl = lines[1];
                                            if (resolutionMatch && relativeUrl) {
                                                return {
                                                    width: parseInt(resolutionMatch[1], 10),
                                                    height: parseInt(resolutionMatch[2], 10),
                                                    url: relativeUrl
                                                };
                                            }
                                            return null;
                                        })
                                        .filter(Boolean)
                                        .sort((a, b) => b.width - a.width);

                                    const highestResStream = streams[0];

                                    console.log(highestResStream);

                                    if (highestResStream) {
                                        const parts = hlsSource.url.split('/');
                                        const baseUrl = parts[0] + '//' + parts[2] + '/';

                                        const finalStreamUrl = baseUrl + highestResStream.url;

                                        const result = {
                                            stream: finalStreamUrl || "",
                                            subtitles: subtitleTrack ? subtitleTrack.url : ""
                                        };

                                        console.log(result);
                                        return JSON.stringify(result);
                                    }
                                }
                            } else {
                                const result = {
                                    stream: hlsSource.url || "",
                                    subtitles: subtitleTrack ? subtitleTrack.url : ""
                                };

                                console.log(JSON.stringify(result));
                                return JSON.stringify(result);
                            }
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${apiUrl} for movie ${movieId}:`, err);
                    }
                }
            }
        } else if (url.includes('tv')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=tv&id=([^\/]+)&season=([^\/]+)&episode=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            for (let i = 0; i < servicesWithoutCaption.length; i++) {
                for (let j = 0; j < secretKey.length; j++) {
                    const service = servicesWithoutCaption[i];
                    const apiUrl = `https://rivestream.org/api/backendfetch?requestID=tvVideoProvider&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&service=${service}&secretKey=${secretKey[j]}&proxyMode=noProxy`;
                    // const apiUrl2 = `https://scrapper.rivestream.org/api/embed?provider=vidsrcrip&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&api_key=d64117f26031a428449f102ced3aba73`

                    try {
                        const subtitleTrackResponse = await fetchv2(`https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`);
                        const subtitleTrackData = await subtitleTrackResponse.json();

                        const subtitleTrack = subtitleTrackData.find(track =>
                            track.display.startsWith('English')
                        );
                        
                        const response = await fetchv2(apiUrl);
                        const data = await response.json();

                        if (data && data.error !== "Internal Server Error") {
                            const preferredQualities = ['HLS 1', 'HLS 7', 'HLS 10', 'HLS 13', 'HLS 15', 'HLS 4'];
                            let hlsSource;

                            for (const quality of preferredQualities) {
                                hlsSource = data.data?.sources?.find(source => source.format === 'hls' && source.quality === quality);
                                if (hlsSource) break;
                            }

                            if (!hlsSource) {
                                hlsSource = data.data?.sources?.find(source => source.format === 'hls');
                            }

                            if (hlsSource?.url && !hlsSource.url.includes("uwu")) {
                                const playlistResponse = await fetchv2(hlsSource.url);
                                const playlistText = await playlistResponse.text();

                                console.log(playlistText);

                                const streamMatches = playlistText.match(/#EXT-X-STREAM-INF:.*?RESOLUTION=(\d+x\d+).*?\n(.*?)(?:\n|$)/g);

                                if (streamMatches) {
                                    const streams = streamMatches
                                        .map(matchStr => {
                                            const resolutionMatch = matchStr.match(/RESOLUTION=(\d+)x(\d+)/);
                                            const lines = matchStr.split('\n').filter(Boolean);
                                            const relativeUrl = lines[1];
                                            if (resolutionMatch && relativeUrl) {
                                                return {
                                                    width: parseInt(resolutionMatch[1], 10),
                                                    height: parseInt(resolutionMatch[2], 10),
                                                    url: relativeUrl
                                                };
                                            }
                                            return null;
                                        })
                                        .filter(Boolean)
                                        .sort((a, b) => b.width - a.width);

                                    const highestResStream = streams[0];

                                    console.log(highestResStream);

                                    if (highestResStream) {
                                        const parts = hlsSource.url.split('/');
                                        const baseUrl = parts[0] + '//' + parts[2] + '/';

                                        const finalStreamUrl = baseUrl + highestResStream.url;

                                        const result = {
                                            stream: finalStreamUrl || "",
                                            subtitles: subtitleTrack ? subtitleTrack.url : ""
                                        };

                                        console.log(result);
                                        return JSON.stringify(result);
                                    }
                                }
                            } else {
                                const result = {
                                    stream: hlsSource.url || "",
                                    subtitles: subtitleTrack ? subtitleTrack.url : ""
                                };

                                console.log(result);
                                return JSON.stringify(result);
                            }
                        }
                    } catch (err) {
                        console.log(`Fetch error on endpoint ${apiUrl} for show ${showId}:`, err);
                    }
                }
            }
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}

function btoa(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(input);
    let output = '';

    for (let block = 0, charCode, i = 0, map = chars;
        str.charAt(i | 0) || (map = '=', i % 1);
        output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))) {
        charCode = str.charCodeAt(i += 3 / 4);
        if (charCode > 0xFF) {
            throw new Error("btoa failed: The string contains characters outside of the Latin1 range.");
        }
        block = (block << 8) | charCode;
    }

    return output;
}