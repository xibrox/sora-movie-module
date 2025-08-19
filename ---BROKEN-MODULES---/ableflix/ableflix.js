async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetchv2(`https://api.themoviedb.org/3/search/multi?api_key=653bb8af90162bd98fc7ee32bcbbfb3d&query=${encodedKeyword}&include_adult=false`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://ableflix.cc/movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://ableflix.cc/tv/${result.id}`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://ableflix.cc/tv/${result.id}`
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
            const match = url.match(/https:\/\/ableflix\.cc\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/movie/${movieId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/ableflix\.cc\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
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
            const match = url.match(/https:\/\/ableflix\.cc\/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://ableflix.cc/watch/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/ableflix\.cc\/tv\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await fetchv2(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://ableflix.cc/watch/tv/${showId}/${seasonNumber}/${episode.episode_number}`,
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
            const match = url.match(/https:\/\/ableflix\.cc\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            
            const responseText = await fetchv2(`https://vidsrc.icu/embed/movie/${movieId}`);
            const html = await responseText.text();

            const videoRegex = /iframe id="videoIframe" src="([\s\S]+?)"/;
            const videoMatch = html.match(videoRegex);
            if(videoMatch == null) {
                console.log('Error video match failed');
                return null;
            }
            const videoUrl = videoMatch[1];

            const videoResponse = await fetchv2(videoUrl);
            const videoHtml = await videoResponse.text();

            console.log(videoUrl);

            const iframeRegex = /id="player_iframe"[\s\S]+?src="([\s\S]+?)"/;
            const iframeMatch = videoHtml.match(iframeRegex);
            if(iframeMatch == null) {
                console.log('Error iframe match failed');
                return null;
            }
            const iframeUrl = iframeMatch[1];
            const iframeFullUrl = 'https:' + iframeUrl;

            const iframeResponse = await fetchv2(iframeFullUrl);
            const iframeHtml = await iframeResponse.text();
            
            const iframe2Regex = /src: '([\s\S]+?)'/;
            const iframe2Match = iframeHtml.match(iframe2Regex);
            if(iframe2Match == null) {
                console.log('Error iframe2 match failed');
                return null;
            }

            const index = iframeFullUrl.indexOf('/rcp');
            const baseUrl = iframeFullUrl.substring(0, index);
            const iframe2Url = baseUrl + iframe2Match[1];

            const iframe2Response = await fetchv2(iframe2Url, { headers: { 'Referer': iframeFullUrl } });
            const iframe2Html = await iframe2Response.text();

            const sourceRegex = /id:"player_parent", file: '([\s\S]+?)'/;
            const sourceMatch = iframe2Html.match(sourceRegex);
            if(sourceMatch == null) {
                console.log('Error source match failed');
                return null;
            }

            const source = sourceMatch[1];

            const thisThing = await fetchv2(`https://tmstr4.shadowlandschronicles.com/rt_ping.php`);

            console.log(source);
            return JSON.stringify(source);

            // const masterPlaylist = await fetchv2(source);
            // const masterPlaylistText = await masterPlaylist.text();

            // const matches = [...masterPlaylistText.matchAll(/#EXT-X-STREAM-INF:.*RESOLUTION=(\d+)x(\d+)[\s\S]*?\n([^\n]+)/g)];

            // if (matches.length === 0) throw new Error("No stream variants found.");

            // const bestStream = matches
            // .map(m => ({
            //     width: parseInt(m[1]),
            //     height: parseInt(m[2]),
            //     url: m[3].trim()
            // }))
            // .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

            // const baseUrlForFullUrl = new URL(masterPlaylist.url).origin;
            // const fullUrl = new URL(bestStream.url, masterPlaylist.url).href;

            // console.log("Highest resolution stream URL:", fullUrl);
            // return JSON.stringify(fullUrl);
        } else if (url.includes('tv')) {
            const match = url.match(/https:\/\/ableflix\.cc\/watch\/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            const responseText = await fetchv2(`https://vidsrc.icu/embed/tv/${showId}/${seasonNumber}/${episodeNumber}`);
            const html = await responseText.text();

            const videoRegex = /iframe id="videoIframe" src="([\s\S]+?)"/;
            const videoMatch = html.match(videoRegex);
            if(videoMatch == null) {
                console.log('Error video match failed');
                return null;
            }
            const videoUrl = videoMatch[1];

            const videoResponse = await fetchv2(videoUrl);
            const videoHtml = await videoResponse.text();

            console.log(videoUrl);

            const iframeRegex = /id="player_iframe"[\s\S]+?src="([\s\S]+?)"/;
            const iframeMatch = videoHtml.match(iframeRegex);
            if(iframeMatch == null) {
                console.log('Error iframe match failed');
                return null;
            }
            const iframeUrl = iframeMatch[1];
            const iframeFullUrl = 'https:' + iframeUrl;

            const iframeResponse = await fetchv2(iframeFullUrl);
            const iframeHtml = await iframeResponse.text();
            
            const iframe2Regex = /src: '([\s\S]+?)'/;
            const iframe2Match = iframeHtml.match(iframe2Regex);
            if(iframe2Match == null) {
                console.log('Error iframe2 match failed');
                return null;
            }

            const index = iframeFullUrl.indexOf('/rcp');
            const baseUrl = iframeFullUrl.substring(0, index);
            const iframe2Url = baseUrl + iframe2Match[1];

            const iframe2Response = await fetchv2(iframe2Url, { headers: { 'Referer': iframeFullUrl } });
            const iframe2Html = await iframe2Response.text();

            const sourceRegex = /id:"player_parent", file: '([\s\S]+?)'/;
            const sourceMatch = iframe2Html.match(sourceRegex);
            if(sourceMatch == null) {
                console.log('Error source match failed');
                return null;
            }

            const source = sourceMatch[1];

            const thisThing = await fetchv2(`https://tmstr4.shadowlandschronicles.com/rt_ping.php`);

            console.log(source);
            return JSON.stringify(source);
            
            // const masterPlaylist = await fetchv2(source);
            // const masterPlaylistText = await masterPlaylist.text();

            // const matches = [...masterPlaylistText.matchAll(/#EXT-X-STREAM-INF:.*RESOLUTION=(\d+)x(\d+)[\s\S]*?\n([^\n]+)/g)];

            // if (matches.length === 0) throw new Error("No stream variants found.");

            // const bestStream = matches
            // .map(m => ({
            //     width: parseInt(m[1]),
            //     height: parseInt(m[2]),
            //     url: m[3].trim()
            // }))
            // .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

            // // Combine with base URL
            // const baseUrlForFullUrl = new URL(masterPlaylist.url).origin;
            // const fullUrl = new URL(bestStream.url, masterPlaylist.url).href;

            // console.log("Highest resolution stream URL:", fullUrl);
            // return JSON.stringify(fullUrl);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}

// extractStreamUrl(`https://ableflix.cc/watch/tv/1396/1/1`);