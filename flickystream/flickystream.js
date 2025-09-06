async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=adc48d20c0956934fb224de5c40bb85d&query=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://flickystream.com/player/movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://flickystream.com/player/tv/${result.id}/1/1`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://flickystream.com/player/tv/${result.id}/1/1`
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
            const match = url.match(/https:\/\/flickystream\.com\/player\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=adc48d20c0956934fb224de5c40bb85d`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/flickystream\.com\/player\/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=adc48d20c0956934fb224de5c40bb85d`);
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
            const match = url.match(/https:\/\/flickystream\.com\/player\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://flickystream.com/player/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/flickystream\.com\/player\/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=adc48d20c0956934fb224de5c40bb85d`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=adc48d20c0956934fb224de5c40bb85d`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://flickystream.com/player/tv/${showId}/${seasonNumber}/${episode.episode_number}`,
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
        if (url.includes('movie')) {
            const match = url.match(/https:\/\/flickystream\.com\/player\/movie\/([^\/]+)/);

            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];

            let streams = [];

            for (let i = 1; i <= 5; i++) {
                const apiUrl = `https://player.vidzee.wtf/api/server?id=${movieId}&sr=${i}`;
                const response = await soraFetch(apiUrl);
                const data = await response.json();

                if (data.url) {
                    const stream = data.url?.find(source => source.lang === 'English' || source.lang === 'english');

                    if (stream) {
                        const headers = {
                            'Origin': 'https://player.vidzee.wtf',
                            'Referer': data.headers.Referer
                        };

                        // streams.push(data.provider);
                        // streams.push(stream.link);
                        // streams.push(`headers: ${JSON.stringify(headers)}`);

                        streams.push({
                            title: data.provider,
                            streamUrl: stream.link,
                            headers: headers
                        });
                    }
                }
            }
            
            const subtitleTrackResponse = await soraFetch(`https://sub.wyzie.ru/search?id=${movieId}`);
            const subtitleTrackData = await subtitleTrackResponse.json();

            let subtitleTrack = subtitleTrackData.find(track =>
                track.display.includes('English') && (track.encoding === 'ASCII' || track.encoding === 'UTF-8')
            );

            if (!subtitleTrack) {
                subtitleTrack = subtitleTrackData.find(track => track.display.includes('English') && (track.encoding === 'CP1252'));
            }

            if (!subtitleTrack) {
                subtitleTrack = subtitleTrackData.find(track => track.display.includes('English') && (track.encoding === 'CP1250'));
            }
    
            if (!subtitleTrack) {
                subtitleTrack = subtitleTrackData.find(track => track.display.includes('English') && (track.encoding === 'CP850'));
            }

            subtitle = subtitleTrack ? subtitleTrack.url : '';

            const result = {
                streams,
                subtitles: subtitle
            };
            
            console.log("Final result:", result);
            return JSON.stringify(result);
        } else if (url.includes('tv')) {
            const match = url.match(/https:\/\/flickystream\.com\/player\/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            let streams = [];

            for (let i = 1; i <= 5; i++) {
                const apiUrl = `https://player.vidzee.wtf/api/server?id=${showId}&sr=${i}&ss=${seasonNumber}&ep=${episodeNumber}`;
                const response = await soraFetch(apiUrl);
                const data = await response.json();

                if (data.url) {
                    const stream = data.url?.find(source => source.lang === 'English' || source.lang === 'english');
                    
                    if (stream) {
                        const headers = {
                            'Origin': 'https://player.vidzee.wtf',
                            'Referer': data.headers.Referer
                        };

                        // streams.push(data.provider);
                        // streams.push(stream.link);
                        // streams.push(`headers: ${JSON.stringify(headers)}`);

                        streams.push({
                            title: data.provider,
                            streamUrl: stream.link,
                            headers: headers
                        });
                    }
                }
            }
            
            const subtitleTrackResponse = await soraFetch(`https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`);
            const subtitleTrackData = await subtitleTrackResponse.json();

            let subtitleTrack = subtitleTrackData.find(track =>
                track.display.includes('English') && (track.encoding === 'ASCII' || track.encoding === 'UTF-8')
            );

            if (!subtitleTrack) {
                subtitleTrack = subtitleTrackData.find(track => track.display.includes('English') && (track.encoding === 'CP1252'));
            }

            if (!subtitleTrack) {
                subtitleTrack = subtitleTrackData.find(track => track.display.includes('English') && (track.encoding === 'CP1250'));
            }
    
            if (!subtitleTrack) {
                subtitleTrack = subtitleTrackData.find(track => track.display.includes('English') && (track.encoding === 'CP850'));
            }

            subtitle = subtitleTrack ? subtitleTrack.url : '';

            const result = {
                streams,
                subtitles: subtitle
            };
            
            console.log("Final result:", result);
            return JSON.stringify(result);
        } else {
            throw new Error("Invalid URL format");
        }
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

// searchResults("Breaking Bad").then(console.log);
// extractDetails("https://flickystream.com/player/tv/1396/1/1").then(console.log);
// extractEpisodes("https://flickystream.com/player/tv/1396/1/1").then(console.log);
// extractStreamUrl("https://flickystream.com/player/tv/1396/1/1").then(console.log);

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
