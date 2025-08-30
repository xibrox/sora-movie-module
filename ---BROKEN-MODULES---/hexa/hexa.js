async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=71fdb081b0133511ac14ac0cc10fd307&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        const transformedResults = data.results.map(result => {
            // For movies, TMDB returns "title" and media_type === "movie"
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://hexa.watch/watch/movie/iframe/${result.id}`
                };
            }
            // For TV shows, TMDB returns "name" and media_type === "tv"
            else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    // Using default season/episode numbers (1/1)
                    href: `https://hexa.watch/watch/tv/iframe/${result.id}/1/1`
                };
            } else {
                // Fallback if media_type is not defined
                return {
                    title: result.title || result.name || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://hexa.watch/watch/tv/iframe/${result.id}/1/1`
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
        if(url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/movie\/iframe\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=71fdb081b0133511ac14ac0cc10fd307&append_to_response=videos,credits`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                // Movies use runtime (in minutes)
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/watch/tv/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/tv\/iframe\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=71fdb081b0133511ac14ac0cc10fd307&append_to_response=seasons`);
            const data = JSON.parse(responseText);

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') : 'Unknown'}`,
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
        if(url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/movie\/iframe\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const movieId = match[1];
            return JSON.stringify([
                { href: `https://hexa.watch/watch/movie/iframe/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/watch/tv/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/tv\/iframe\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            const showId = match[1];
            
            const showResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=71fdb081b0133511ac14ac0cc10fd307`);
            const showData = JSON.parse(showResponseText);
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=71fdb081b0133511ac14ac0cc10fd307`);
                const seasonData = JSON.parse(seasonResponseText);
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://hexa.watch/watch/tv/iframe/${showId}/${seasonNumber}/${episode.episode_number}`,
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
    try {
        if (url.includes('/watch/movie/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/movie\/iframe\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            try {
                const responseText = await fetch(`https://demo.autoembed.cc/api/server?id=${movieId}&sr=1`);
                const data = JSON.parse(responseText);

                const hlsSource = data.url?.find(source => source.type === 'playlist');
                const subtitleTrack = data.tracks?.find(track =>
                    track.lang.startsWith('English')
                );

                const responseFile = await fetch(hlsSource.link);
                const fileData = responseFile;

                const regex = /#EXT-X-STREAM-INF:.*RESOLUTION=(\d+x\d+)[\r\n]+(https?:\/\/[^\r\n]+)/g;

                let match;
                const streams = [];

                // Loop over all matches
                while ((match = regex.exec(fileData)) !== null) {
                    const resolutionStr = match[1]; // e.g., "1920x1080"
                    const url = match[2];

                    // Convert resolution into numbers for comparison.
                    const [width, height] = resolutionStr.split('x').map(Number);

                    streams.push({ width, height, url });
                }

                if (streams.length > 0) {
                    // Calculate pixel count to compare resolution sizes.
                    streams.sort((a, b) => (b.width * b.height) - (a.width * a.height));

                    const highestStreamUrl = streams[0].url;

                    const result = {
                        stream: highestStreamUrl,
                        subtitles: subtitleTrack ? subtitleTrack.url : ""
                    };

                    console.log(result);
                    
                    return JSON.stringify(result);
                }
            } catch (err) {
                console.log(`Fetch error on endpoint https://demo.autoembed.cc/api/server for movie ${movieId}:`, err);
            }
        } else if (url.includes('/watch/tv/')) {
            const match = url.match(/https:\/\/hexa\.watch\/watch\/tv\/iframe\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            try {
                const responseText = await fetch(`https://demo.autoembed.cc/api/server?id=${showId}&sr=1&ep=${episodeNumber}&ss=${seasonNumber}`);
                const data = JSON.parse(responseText);

                const hlsSource = data.url?.find(source => source.type === 'playlist');
                const subtitleTrack = data.tracks?.find(track =>
                    track.lang.startsWith('English')
                );

                const responseFile = await fetch(hlsSource.link);
                const fileData = await responseFile;

                console.log(fileData);

                const regex = /#EXT-X-STREAM-INF:.*RESOLUTION=(\d+x\d+)[\r\n]+(https?:\/\/[^\r\n]+)/g;

                let match;
                const streams = [];

                // Loop over all matches
                while ((match = regex.exec(fileData)) !== null) {
                    const resolutionStr = match[1]; // e.g., "1920x1080"
                    const url = match[2];

                    // Convert resolution into numbers for comparison.
                    const [width, height] = resolutionStr.split('x').map(Number);

                    streams.push({ width, height, url });
                }

                if (streams.length > 0) {
                    // Calculate pixel count to compare resolution sizes.
                    streams.sort((a, b) => (b.width * b.height) - (a.width * a.height));

                    const highestStreamUrl = streams[0].url;

                    const result = {
                        stream: highestStreamUrl,
                        subtitles: subtitleTrack ? subtitleTrack.url : ""
                    };

                    console.log(result);
                    
                    return JSON.stringify(result);
                }
            } catch (err) {
                console.log(`Fetch error on endpoint https://demo.autoembed.cc/api/server for TV show ${showId} S${seasonNumber}E${episodeNumber}:`, err);
            }
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}

extractStreamUrl(`https://hexa.watch/watch/tv/iframe/95557/1/1`);