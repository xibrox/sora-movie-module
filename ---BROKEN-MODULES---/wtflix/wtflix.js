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
                    href: `movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `tv/${result.id}/1/1`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `tv/${result.id}/1/1`
                };
            }
        });

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('movie')) {
            const match = url.match(/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            console.log(transformedResults);
            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            console.log(transformedResults);
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
            const match = url.match(/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            const movie = [
                { href: `movie/${movieId}`, number: 1, title: "Full Movie" }
            ];

            console.log(movie);
            return JSON.stringify(movie);
        } else if(url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            
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
                        href: `tv/${showId}/${seasonNumber}/${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            console.log(allEpisodes);
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
            const match = url.match(/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            const responseText = await fetchv2(`https://flix.1anime.app/movie/${movieId}`);
            const data = await responseText.json();

            let allStreams = [];
            let allSubtitles = [];

            for (const source of data) {
                if (source.source && source.source.files) {
                    const provider = source.source.provider || "Unknown";

                    const streams = source.source.files.map(file => ({
                        url: file.file,
                        quality: file.quality,
                        type: file.type,
                        provider: provider,
                        headers: source.source.headers || {}
                    }));
                    allStreams = allStreams.concat(streams);

                    if (source.source.subtitles && source.source.subtitles.length > 0) {
                        allSubtitles = allSubtitles.concat(source.source.subtitles.map(sub => ({
                            url: sub.url,
                            lang: sub.lang || sub.language,
                            type: sub.type
                        })));
                    }
                }
            }

            const validStreams = allStreams
                .filter(stream => stream.url && stream.url.trim() !== "")
                .map(stream => ({
                    title: `${stream.provider} - ${stream.quality}`,
                    streamUrl: stream.url,
                    headers: stream.headers || {}
                }));

            let subtitle = "";
            const englishSub = allSubtitles.find(sub => 
                (sub.lang === "english" || sub.lang === "en") && 
                (sub.type === "vtt" || sub.url.endsWith(".vtt"))
            );

            if (englishSub) {
                subtitle = englishSub.url;
            }

            const result = {
                streams: validStreams,
                subtitles: subtitle
            };

            console.log("Result:", result);
            return JSON.stringify(result);
        } else if (url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            const response = await fetchv2(`https://flix.1anime.app/tv/${showId}/${seasonNumber}/${episodeNumber}`);
            const data = await response.json();

            let allStreams = [];
            let allSubtitles = [];

            for (const source of data) {
                if (source.source && source.source.files) {
                    const provider = source.source.provider || "Unknown";
                    const streams = source.source.files.map(file => ({
                        url: file.file,
                        quality: file.quality,
                        type: file.type,
                        provider: provider,
                        headers: source.source.headers || {}
                    }));
                    allStreams = allStreams.concat(streams);

                    if (source.source.subtitles && source.source.subtitles.length > 0) {
                        allSubtitles = allSubtitles.concat(source.source.subtitles.map(sub => ({
                            url: sub.url,
                            lang: sub.lang || sub.language,
                            type: sub.type
                        })));
                    }
                }
            }

            const validStreams = allStreams
                .filter(stream => stream.url && stream.url.trim() !== "")
                .map(stream => ({
                    title: `${stream.provider} - ${stream.quality}`,
                    streamUrl: stream.url,
                    headers: stream.headers || {}
                }));

            let subtitle = "";
            const englishSub = allSubtitles.find(sub =>
                (sub.lang === "english" || sub.lang === "en") &&
                (sub.type === "vtt" || (sub.url && sub.url.endsWith(".vtt")))
            );

            if (englishSub) {
                subtitle = englishSub.url;
            } else {
                 const anyEnglishSub = allSubtitles.find(sub =>
                     (sub.lang === "english" || sub.lang === "en") && sub.url
                 );
                 if (anyEnglishSub) {
                     subtitle = anyEnglishSub.url;
                 }
            }

            const result = {
                streams: validStreams,
                subtitles: subtitle
            };

            console.log("Result:", result);
            return JSON.stringify(result);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}