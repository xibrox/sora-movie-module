async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=68e094699525b18a70bab2f86b1fa706&query=${encodedKeyword}`);
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
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
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
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
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
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
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

            const responseText = await soraFetch(`https://vidsrc.xyz/embed/movie/${movieId}`);
            const html = await responseText.text();

            const iframeMatch = html.match(/<div id="the_frame">[\s\S]*?<iframe[^>]*src=["']([^"']+)["']/);
            const iframeSrc = iframeMatch ? iframeMatch[1] : null;

            const fullUrl = iframeSrc.startsWith("//") ? "https:" + iframeSrc : iframeSrc;

            const response = await soraFetch(fullUrl);
            const html2 = await response.text();

            const match2 = html2.match(/src:\s*['"]([^'"]+)['"]/);

            const relativeUrl = match2[1];
            const fullUrl2 = `https://cloudnestra.com${relativeUrl}`;
            console.log(fullUrl2);

            const response2 = await soraFetch(fullUrl2, { headers: { 'Referer': 'https://vidsrc.xyz/' } });
            const html3 = await response2.text();

            const match3 = html3.match(/file:\s*['"]([^'"]+)['"]/);

            const fileUrl = match3[1];
            console.log("File URL: " + fileUrl);

            const responseM3U8 = await soraFetch(fileUrl);
            const masterM3u8 = await responseM3U8.text();

            const match4 = fileUrl.match(/^(https?:\/\/[^\/]+)/);
            const baseUrl = match4 ? match4[1] : null;

            const regex = /#EXT-X-STREAM-INF:[^\n]*RESOLUTION=(\d+)x(\d+)[^\n]*\n([^\n]+)/g;

            let match5;
            let best = { width: 0, height: 0, url: '' };

            while ((match5 = regex.exec(masterM3u8)) !== null) {
                const width = parseInt(match5[1]);
                const height = parseInt(match5[2]);
                const url = match5[3];

                if ((width * height) > (best.width * best.height)) {
                    best = { width, height, url };
                }
            }

            const finalUrl = baseUrl + best.url;

            // const result = {
            //     stream,
            //     subtitles
            // }

            console.log('Result: ' + finalUrl);
            return JSON.stringify(finalUrl);
        } else if (url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            const responseText = await soraFetch(`https://vidsrc.xyz/embed/tv/${showId}/${seasonNumber}-${episodeNumber}`);
            const html = await responseText.text();

            const iframeMatch = html.match(/<div id="the_frame">[\s\S]*?<iframe[^>]*src=["']([^"']+)["']/);
            const iframeSrc = iframeMatch ? iframeMatch[1] : null;

            const fullUrl = iframeSrc.startsWith("//") ? "https:" + iframeSrc : iframeSrc;

            const response = await soraFetch(fullUrl);
            const html2 = await response.text();

            const match2 = html2.match(/src:\s*['"]([^'"]+)['"]/);

            const relativeUrl = match2[1];
            const fullUrl2 = `https://cloudnestra.com${relativeUrl}`;
            console.log(fullUrl2);

            const response2 = await soraFetch(fullUrl2, { headers: { 'Referer': 'https://vidsrc.xyz/' } });
            const html3 = await response2.text();

            const match3 = html3.match(/file:\s*['"]([^'"]+)['"]/);

            const fileUrl = match3[1];
            console.log("File URL: " + fileUrl);

            const responseM3U8 = await soraFetch(fileUrl);
            const masterM3u8 = await responseM3U8.text();

            const match4 = fileUrl.match(/^(https?:\/\/[^\/]+)/);
            const baseUrl = match4 ? match4[1] : null;

            const regex = /#EXT-X-STREAM-INF:[^\n]*RESOLUTION=(\d+)x(\d+)[^\n]*\n([^\n]+)/g;

            let match5;
            let best = { width: 0, height: 0, url: '' };

            while ((match5 = regex.exec(masterM3u8)) !== null) {
                const width = parseInt(match5[1]);
                const height = parseInt(match5[2]);
                const url = match5[3];

                if ((width * height) > (best.width * best.height)) {
                    best = { width, height, url };
                }
            }

            const finalUrl = baseUrl + best.url;

            // const result = {
            //     stream,
            //     subtitles
            // }

            console.log('Result: ' + finalUrl);
            return JSON.stringify(finalUrl);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}

// extractStreamUrl("tv/1396/1/1");
// extractStreamUrl("movie/157336");

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