async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=9801b6b0548ad57581d111ea690c85c8&query=${encodedKeyword}&include_adult=false`);
        const data = await responseText.json();

        const transformedResults = [
            {
                title: "Use External Player",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/net3lix/UseExternalPlayer.png",
                href: ""
            },
            ...data.results.map(result => {
                const image = result.poster_path
                    ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
                    : "";

                if (result.media_type === "movie") {
                    return {
                        title: result.title || result.original_title || result.name || result.original_name || "Untitled",
                        image,
                        href: `https://net3lix.world/watch/movie/${result.id}`
                    };
                }

                if (result.media_type === "tv") {
                    return {
                        title: result.name || result.original_name || result.title || result.original_title || "Untitled",
                        image,
                        href: `https://net3lix.world/watch/tv/${result.id}/1/1`
                    };
                }
            })
        ];

        console.log('Transformed Results: ' + transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('/movie/')) {
            const match = url.match(/https:\/\/net3lix\.world\/watch\/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/net3lix\.world\/watch\/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            console.log(JSON.stringify(transformedResults));
            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Details error: ' + error);
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
            const match = url.match(/https:\/\/net3lix\.world\/watch\/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://net3lix.world/watch/movie/${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('/tv/')) {
            const match = url.match(/https:\/\/net3lix\.world\/watch\/tv\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                if (!season.season_number || season.season_number < 1) continue;

                const seasonNumber = season.season_number;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map((episode, i) => {
                        const episodeNumber = i + 1;

                        return {
                            href: `https://net3lix.world/watch/tv/${showId}/${seasonNumber}/${episode.episode_number}`,
                            number: episodeNumber,
                            title: episode.name || ""
                        };
                    });
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            console.log('All Episodes: ' + JSON.stringify(allEpisodes));
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

// searchResults('One piece');
// extractDetails('https://net3lix.world/watch/tv/37854/1/1');
// extractEpisodes('https://net3lix.world/watch/tv/37854/1/1');
// extractStreamUrl('https://net3lix.world/watch/tv/37854/2/65');

async function extractStreamUrl(url) {
    try {
        const match = url.match(/net3lix\.world\/watch\/(movie|tv)\/(.+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        const url2 = type === 'movie'
        ? `https://cdn.moviesapi.club/embed/movie/${path}`
        : (() => {
            const [showId, season, episode] = path.split('/');
            return `https://cdn.moviesapi.club/embed/tv/${showId}/${season}/${episode}`;
            })();

        const html = await soraFetch(url2).then(res => res.text());

        const embedRegex = /<iframe[^>]*src="([^"]+)"[^>]*>/g;
        const embedUrl = Array.from(html.matchAll(embedRegex), m => m[1].trim()).find(Boolean);
        const completedUrl = `https:${embedUrl}`;

        console.log('Embed URL: ' + completedUrl);

        const html2 = await soraFetch(completedUrl).then(res => res.text());

        const match2 = html2.match(/src:\s*['"]([^'"]+)['"]/);
        const src = `https://cloudnestra.com${match2[1]}`;

        console.log(src);

        const html3 = await soraFetch(src).then(res => res.text());

        const match3 = html3.match(/file:\s*['"]([^'"]+)['"]/);

        console.log(match3[1]);

        const embedUrl2 = type === 'movie'
        ? `https://vidsrc.su/embed/movie/${path}`
        : (() => {
            const [showId, season, episode] = path.split('/');
            return `https://vidsrc.su/embed/tv/${showId}/${season}/${episode}`;
            })();

        const data2 = await soraFetch(embedUrl2).then(res => res.text());

        console.log('Embed URL:', embedUrl2);
        console.log('Data:', data2);

        const urlRegex = /^(?!\s*\/\/).*url:\s*(['"])(.*?)\1/gm;
        const subtitleRegex = /"url"\s*:\s*"([^"]+)"[^}]*"format"\s*:\s*"([^"]+)"[^}]*"encoding"\s*:\s*"([^"]+)"[^}]*"display"\s*:\s*"([^"]+)"[^}]*"language"\s*:\s*"([^"]+)"/g;

        let streams = [];

        streams.push("CloudStream Pro", match3[1]);

        streams.push(...Array.from(data2.matchAll(urlRegex), m => m[2]).filter(Boolean));

        const subtitleMatches = [];
        let subtitleMatch;
        while ((subtitleMatch = subtitleRegex.exec(data2)) !== null) {
            subtitleMatches.push({
                url: subtitleMatch[1],
                format: subtitleMatch[2],
                encoding: subtitleMatch[3],
                display: subtitleMatch[4],
                language: subtitleMatch[5]
            });
        }

        const subtitleUrls = subtitleMatches.map(item => item.url);
        console.log("Subtitle URLs:", subtitleUrls);

        let firstSubtitle = subtitleMatches.find(subtitle => subtitle.display.includes('English') && (subtitle.encoding === 'ASCII' || subtitle.encoding === 'UTF-8'));

        if (!firstSubtitle) {
            firstSubtitle = subtitleMatches.find(subtitle => subtitle.display.includes('English') && (subtitle.encoding === 'CP1252'));
        }

        if (!firstSubtitle) {
            firstSubtitle = subtitleMatches.find(subtitle => subtitle.display.includes('English') && (subtitle.encoding === 'CP1250'));
        }

        if (!firstSubtitle) {
            firstSubtitle = subtitleMatches.find(subtitle => subtitle.display.includes('English') && (subtitle.encoding === 'CP850'));
        }

        const result = {
            streams,
            subtitles: firstSubtitle ? firstSubtitle.url : ""
        }

        console.log('Result: ' + JSON.stringify(result));
        return JSON.stringify(result);
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

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null, encoding: 'utf-8' }) {
    try {
        return await fetchv2(
            url,
            options.headers ?? {},
            options.method ?? 'GET',
            options.body ?? null,
            true,
            options.encoding ?? 'utf-8'
        );
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}
