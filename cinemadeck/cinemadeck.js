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

            const headers = {
                'Origin': 'https://www.vidsrc.wtf',
                'Referer': 'https://www.vidsrc.wtf/'
            };

            const responseText = await fetchv2(`https://api.rgshows.me/main/movie/${movieId}`, headers, "GET");
            const data = await responseText.json();

            const subtitleTrackResponse = await fetchv2(`https://sub.wyzie.ru/search?id=${movieId}`);
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

            const hlsSource = data.stream;

            const result = {
                stream: hlsSource.url || "",
                subtitles: subtitleTrack ? subtitleTrack.url : ""
            };

            console.log(JSON.stringify(result));
            return JSON.stringify(result);

            // if (hlsSource) {
            //     const playlistResponse = await fetchv2(hlsSource.url);
            //     const playlistText = await playlistResponse.text();

            //     console.log(playlistText);

            //     const streamMatches = playlistText.match(/#EXT-X-STREAM-INF:.*?RESOLUTION=(\d+x\d+).*?\n(.*?)(?:\n|$)/g);

            //     if (streamMatches) {
            //         const streams = streamMatches
            //             .map(matchStr => {
            //                 const resolutionMatch = matchStr.match(/RESOLUTION=(\d+)x(\d+)/);
            //                 const lines = matchStr.split('\n').filter(Boolean);
            //                 const relativeUrl = lines[1];
            //                 if (resolutionMatch && relativeUrl) {
            //                     return {
            //                         width: parseInt(resolutionMatch[1], 10),
            //                         height: parseInt(resolutionMatch[2], 10),
            //                         url: relativeUrl
            //                     };
            //                 }
            //                 return null;
            //             })
            //             .filter(Boolean)
            //             .sort((a, b) => b.width - a.width);

            //         const highestResStream = streams[0];

            //         console.log(highestResStream);

            //         if (highestResStream) {
            //             const parts = hlsSource.url.split('/');
            //             const baseUrl = parts[0] + '//' + parts[2] + '/';

            //             const finalStreamUrl = baseUrl + highestResStream.url;

            //             const result = {
            //                 stream: finalStreamUrl || "",
            //                 subtitles: subtitleTrack ? subtitleTrack.url : ""
            //             };

            //             console.log(result);
            //             return JSON.stringify(result);
            //         }
            //     }
            // } else {
            //     const result = {
            //         stream: hlsSource.url || "",
            //         subtitles: subtitleTrack ? subtitleTrack.url : ""
            //     };

            //     console.log(JSON.stringify(result));
            //     return JSON.stringify(result);
            // }
        } else if (url.includes('/tv/')) {
            const match = url.match(/https:\/\/cinemadeck\.com\/play\/tv\/([^\/]+)\?s=([^\/]+)&e=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            const headers = {
                'Origin': 'https://www.vidsrc.wtf',
                'Referer': 'https://www.vidsrc.wtf/'
            };

            const responseText = await fetchv2(`https://api.rgshows.me/main/tv/${showId}/${seasonNumber}/${episodeNumber}`, headers, "GET");
            const data = await responseText.json();

            const subtitleTrackResponse = await fetchv2(`https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`);
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

            const hlsSource = data.stream;

            const result = {
                stream: hlsSource.url || "",
                subtitles: subtitleTrack ? subtitleTrack.url : ""
            };

            console.log(JSON.stringify(result));
            return JSON.stringify(result);

            // if (hlsSource) {
            //     const playlistResponse = await fetchv2(hlsSource.url);
            //     const playlistText = await playlistResponse.text();

            //     console.log(playlistText);

            //     const streamMatches = playlistText.match(/#EXT-X-STREAM-INF:.*?RESOLUTION=(\d+x\d+).*?\n(.*?)(?:\n|$)/g);

            //     if (streamMatches) {
            //         const streams = streamMatches
            //             .map(matchStr => {
            //                 const resolutionMatch = matchStr.match(/RESOLUTION=(\d+)x(\d+)/);
            //                 const lines = matchStr.split('\n').filter(Boolean);
            //                 const relativeUrl = lines[1];
            //                 if (resolutionMatch && relativeUrl) {
            //                     return {
            //                         width: parseInt(resolutionMatch[1], 10),
            //                         height: parseInt(resolutionMatch[2], 10),
            //                         url: relativeUrl
            //                     };
            //                 }
            //                 return null;
            //             })
            //             .filter(Boolean)
            //             .sort((a, b) => b.width - a.width);

            //         const highestResStream = streams[0];

            //         console.log(highestResStream);

            //         if (highestResStream) {
            //             const parts = hlsSource.url.split('/');
            //             const baseUrl = parts[0] + '//' + parts[2] + '/';

            //             const finalStreamUrl = baseUrl + highestResStream.url;

            //             const result = {
            //                 stream: finalStreamUrl || "",
            //                 subtitles: subtitleTrack ? subtitleTrack.url : ""
            //             };

            //             console.log(result);
            //             return JSON.stringify(result);
            //         }
            //     }
            // } else {
            //     const result = {
            //         stream: hlsSource.url || "",
            //         subtitles: subtitleTrack ? subtitleTrack.url : ""
            //     };

            //     console.log(JSON.stringify(result));
            //     return JSON.stringify(result);
            // }
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