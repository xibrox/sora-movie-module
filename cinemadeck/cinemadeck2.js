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
                    href: `https://cinemadeck.com/movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://cinemadeck.com/tv/${result.id}`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://cinemadeck.com/tv/${result.id}`
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
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/movie\/([^\/]+)/);
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
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/tv\/([^\/]+)/);
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
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://cinemadeck.com/play/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/tv\/([^\/]+)/);
            
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
                        href: `https://cinemadeck.com/play/tv/${showId}?s=${seasonNumber}&e=${episode.episode_number}`,
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
        if (url.includes('/movie/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/play\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            const responseImdb = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885&append_to_response=external_ids`);
            const dataImdbId = JSON.parse(responseImdb);

            const imdbId = dataImdbId.external_ids.imdb_id;

            const headers = {
                'Origin': 'https://vidify.top',
                'Referer': 'https://vidify.top/'
            };

            const responseText = await fetchv2(`https://indian-movie-api.onrender.com/api/v1/mediaInfo?id=${imdbId}`, headers, "GET");
            const data = await responseText.json();

            const requestBody = JSON.stringify({
                file: data.data.playlist,
                id: data.data.playlist,
                key: data.data.key
            })

            const response = await fetchv2(`https://indian-movie-api.onrender.com/api/v1/getStream`, headers, "POST", requestBody);

            const subtitleTrackResponse = await fetchv2(`https://sub.wyzie.ru/search?id=${movieId}`);
            const subtitleTrackData = await subtitleTrackResponse.json();

            const subtitleTrack = subtitleTrackData.find(track =>
                track.display.startsWith('English')
            );

            const hlsSource = data.stream;

            if (hlsSource) {
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
        } else if (url.includes('/tv/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/play\/tv\/([^\/]+)\?s=([^\/]+)&e=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            const responseImdb = await fetch(`https://api.themoviedb.org/3/movie/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885&append_to_response=external_ids`);
            const dataImdbId = JSON.parse(responseImdb);

            const imdbId = dataImdbId.external_ids.imdb_id;

            const headers = {
                'Origin': 'https://vidify.top',
                'Referer': 'https://vidify.top/'
            };

            const responseText = await fetchv2(`https://indian-movie-api.onrender.com/api/v1/mediaInfo?id=${imdbId}`, headers, "GET");
            const data = await responseText.json();

            const seasonIndex = parseInt(seasonNumber) - 1;
            const episodeIndex = parseInt(episodeNumber) - 1;

            const requestBody = JSON.stringify({
                file: data.data.playlist[seasonIndex].folder[episodeIndex][1].file,
                id: data.data.playlist[seasonIndex].folder[episodeIndex][1].id,
                key: data.data.key
            })

            const response = await fetchv2(`https://indian-movie-api.onrender.com/api/v1/getStream`, headers, "POST", requestBody);
            const data2 = await response.json();

            const subtitleTrackResponse = await fetchv2(`https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`);
            const subtitleTrackData = await subtitleTrackResponse.json();

            const subtitleTrack = subtitleTrackData.find(track =>
                track.display.startsWith('English')
            );

            const hlsSource = data2.data.link;

            if (hlsSource) {
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
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}