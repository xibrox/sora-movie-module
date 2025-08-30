async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=653bb8af90162bd98fc7ee32bcbbfb3d&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);


        const transformedResults = data.results.map(result => {
            // For movies, TMDB returns "title" and media_type === "movie"
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://letstream.site/stream/movie/${result.id}/1/1`
                };
            } else if(result.media_type === "tv" || result.name) {
                // For TV shows, TMDB returns "name" and media_type === "tv"
                return {
                    title: result.name || result.title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://letstream.site/stream/tv/${result.id}/1/1`
                };
            } else {
                // Fallback if media_type is not defined
                return {
                    title: result.title || result.name || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://letstream.site/stream/tv/${result.id}/1/1`
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
        if(url.includes('/stream/movie/')) {
            const match = url.match(/https:\/\/letstream\.site\/stream\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/stream/tv/')) {
            const match = url.match(/https:\/\/letstream\.site\/stream\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const data = JSON.parse(responseText);

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
        if(url.includes('/stream/movie/')) {
            const match = url.match(/https:\/\/letstream\.site\/stream\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const movieId = match[1];
            return JSON.stringify([
                { href: `https://letstream.site/stream/movie/${movieId}/1/1`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/stream/tv/')) {
            const match = url.match(/https:\/\/letstream\.site\/stream\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const showId = match[1];
            
            const showResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const showData = JSON.parse(showResponseText);
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
                const seasonData = JSON.parse(seasonResponseText);
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://letstream.site/stream/tv/${showId}/${seasonNumber}/${episode.episode_number}`,
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
    // "2embed",

    const providers = [
        "hindiscraper",
    ];

    try {
        if (url.includes('/stream/movie/')) {
            const match = url.match(/https:\/\/letstream\.site\/stream\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            for (let i = 0; i < providers.length; i++) {
                try {
                    const responseText = await fetch(`https://vidstream.site/api/getmovie?type=movie&id=${movieId}&server=${providers[i]}`);
                    const data = JSON.parse(responseText);

                    const responseSubtitle = await fetch(`https://demo.autoembed.cc/api/server?id=${movieId}&sr=1`);
                    const subtitleData = JSON.parse(responseSubtitle);

                    const subtitleTrack = subtitleData.tracks?.find(track =>
                        track.lang.startsWith('English')
                    );
                
                    if (data && data.newurl) {
                        const hlsResponse = await fetch(data.newurl);
                        const hlsSourceText = await hlsResponse;

                        const regex = /^\.\/(\d+)\/index\.m3u8$/gm;
                        const resolutionPaths = [];
                        let match;

                        while ((match = regex.exec(hlsSourceText)) !== null) {
                            const resNumber = parseInt(match[1], 10);

                            const path = `/${match[1]}/index.m3u8`;
                            resolutionPaths.push({ resolution: resNumber, path });
                        }

                        if (resolutionPaths.length === 0) {
                            console.error("No resolution paths found.");
                        } else {
                            resolutionPaths.sort((a, b) => b.resolution - a.resolution);
                            const highestResolutionPath = resolutionPaths[0].path;
                            console.log("Highest resolution path:", highestResolutionPath);

                            let newUrl = data.newurl;

                            newUrl = newUrl.replace(/i-cdn-0/g, 'cdn4506');

                            newUrl = newUrl.replace(/index\.m3u8[^\/]*\.m3u8$/, highestResolutionPath);
                            
                            console.log("Modified URL:", newUrl);

                            const result = {
                                stream: newUrl,
                                subtitles: subtitleTrack ? subtitleTrack.url : ""
                            };

                            console.log(result);
                    
                            return JSON.stringify(result);
                        }
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint https://vidstream.site/api/getmovie?type=movie&id=${movieId}&server=${providers[i]} for movie ${movieId}:`, err);
                }
            }              
        } else if (url.includes('/stream/tv/')) {
            const match = url.match(/https:\/\/letstream\.site\/stream\/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            for (let i = 0; i < providers.length; i++) {
                try {
                    const responseText = await fetch(`https://vidstream.site/api/getmovie?type=tv&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&server=${providers[i]}`);
                    const data = JSON.parse(responseText);

                    const responseSubtitle = await fetch(`https://demo.autoembed.cc/api/server?id=${showId}&sr=1&ep=${episodeNumber}&ss=${seasonNumber}`);
                    const subtitleData = JSON.parse(responseSubtitle);

                    const subtitleTrack = subtitleData.tracks?.find(track =>
                        track.lang.startsWith('English')
                    );
                
                    if (data && data.newurl) {
                        const hlsResponse = await fetch(data.newurl);
                        const hlsSourceText = await hlsResponse;

                        const regex = /^\.\/(\d+)\/index\.m3u8$/gm;
                        const resolutionPaths = [];
                        let match;

                        while ((match = regex.exec(hlsSourceText)) !== null) {
                            const resNumber = parseInt(match[1], 10);

                            const path = `/${match[1]}/index.m3u8`;
                            resolutionPaths.push({ resolution: resNumber, path });
                        }

                        if (resolutionPaths.length === 0) {
                            console.error("No resolution paths found.");
                        } else {
                            resolutionPaths.sort((a, b) => b.resolution - a.resolution);
                            const highestResolutionPath = resolutionPaths[0].path;
                            console.log("Highest resolution path:", highestResolutionPath);

                            let newUrl = data.newurl;

                            newUrl = newUrl.replace(/i-cdn-0/g, 'cdn4506');

                            newUrl = newUrl.replace(/index\.m3u8[^\/]*\.m3u8$/, highestResolutionPath);
                            
                            console.log("Modified URL:", newUrl);

                            const result = {
                                stream: newUrl,
                                subtitles: subtitleTrack ? subtitleTrack.url : ""
                            };

                            console.log(result);
                    
                            return JSON.stringify(result);
                        }
                    }
                } catch (err) {
                    console.log(`Fetch error on endpoint https://www.vidstream.site/api/getmovie?type=tv&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&server=hindiscraper for TV show ${showId} S${seasonNumber}E${episodeNumber}:`, err);
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
