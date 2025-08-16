class Anilist {
    static async search(keyword, filters = {}) {
        const query = `query (
                $search: String,
                $page: Int,
                $perPage: Int,
                $sort: [MediaSort],
                $genre_in: [String],
                $tag_in: [String],
                $type: MediaType,
                $format: MediaFormat,
                $status: MediaStatus,
                $countryOfOrigin: CountryCode,
                $isAdult: Boolean,
                $season: MediaSeason,
                $startDate_like: String,
                $source: MediaSource,
                $averageScore_greater: Int,
                $averageScore_lesser: Int
            ) {
                Page(page: $page, perPage: $perPage) {
                media(
                    search: $search,
                    type: $type,
                    sort: $sort,
                    genre_in: $genre_in,
                    tag_in: $tag_in,
                    format: $format,
                    status: $status,
                    countryOfOrigin: $countryOfOrigin,
                    isAdult: $isAdult,
                    season: $season,
                    startDate_like: $startDate_like,
                    source: $source,
                    averageScore_greater: $averageScore_greater,
                    averageScore_lesser: $averageScore_lesser
                ) {
                    id
                    idMal
                    averageScore
                    title {
                        romaji
                        english
                        native
                    }
                    episodes
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
                    status
                    genres
                    format
                    description
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    popularity
                    coverImage {
                        color
                        large
                        extraLarge
                    }
                }
            }
        }`;

        const variables = {
            "page": 1,
            "perPage": 50,
            "sort": [
                "SEARCH_MATCH",
                "TITLE_ENGLISH_DESC",
                "TITLE_ROMAJI_DESC"
            ],
            "search": keyword,
            "type": "ANIME",
            ...filters
        }

        // console.log(filters, variables);

        return Anilist.anilistFetch(query, variables);
    }

    static async lookup(filters) {
        const query = `query (
                $id: Int,
                $idMal: Int
            ) {
                Page(page: 1, perPage: 1) {
                media(
                    id: $id,
                    idMal: $idMal
                ) {
                    id
                    idMal
                    averageScore
                    title {
                        romaji
                        english
                        native
                    }
                    episodes
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
                    status
                    genres
                    format
                    description
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    popularity
                    coverImage {
                        color
                        large
                        extraLarge
                    }
                }
            }
        }`;

        const variables = {
            "type": "ANIME",
            ...filters
        }

        return Anilist.anilistFetch(query, variables);
    }

    static async getLatest() {

    }

    static async anilistFetch(query, variables) {
        const url = 'https://graphql.anilist.co/';
        const extraTimeoutMs = 250;

        try {
            const response = await soraFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            });

            if (response.status !== 200) {
                if (response.status === 429) {
                    console.info('=== RATE LIMIT EXCEEDED, SLEEPING AND RETRYING ===');
                    const retryTimeout = response.headers.get('Retry-After');
                    const timeout = Math.ceil((parseInt(retryTimeout))) * 1000 + extraTimeoutMs;
                    await sleep(timeout);
                    return await AnilistFetch(query, variables);

                }

                console.error('Error fetching Anilist data:', response.statusText);
                return null;
            }

            const json = await response.json();
            if (json?.errors) {
                console.error('Error fetching Anilist data:', json.errors);
            }

            return json?.data;

        } catch (error) {
            console.error('Error fetching Anilist data:', error);
            return null;
        }
    }

    static convertAnilistDateToDateStr(dateObject) {
        if (dateObject.year == null) {
            return null;
        }
        if (dateObject.month == null || parseInt(dateObject.month) < 1) {
            dateObject.month = 1;
        }
        if (dateObject.day == null || parseInt(dateObject.day) < 1) {
            dateObject.day = 1;
        }
        return dateObject.year + "-" + (dateObject.month).toString().padStart(2, '0') + "-" + (dateObject.day).toString().padStart(2, '0');
    }


    // Yes it's stupid, but I kinda love it which is why I'm not optimizing this
    static nextAnilistAirDateToCountdown(timestamp) {
        if (timestamp == null) return null;

        const airDate = new Date((timestamp * 1000));
        const now = new Date();

        if (now > airDate) return null;

        let [days, hourRemainder] = (((airDate - now) / 1000) / 60 / 60 / 24).toString().split('.');
        let [hours, minRemainder] = (parseFloat("0." + hourRemainder) * 24).toString().split('.');
        let minutes = Math.ceil((parseFloat("0." + minRemainder) * 60));

        return `Next episode will air in ${days} days, ${hours} hours and ${minutes} minutes at ${airDate.getFullYear()}-${(airDate.getMonth() + 1).toString().padStart(2, '0')}-${(airDate.getDate()).toString().padStart(2, '0')} ${airDate.getHours()}:${airDate.getMinutes()}`;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);

        // Fetch AniList results first
        const aniData = await Anilist.search(keyword, { "isAdult": false });

        let transformedResults = [];

        if (aniData && aniData.Page && aniData.Page.media && aniData.Page.media.length > 0) {
            transformedResults = aniData.Page.media.map(result => {
                return {
                    title: result.title.english || result.title.romaji || result.title.native || "Untitled",
                    image: result.coverImage.extraLarge || result.coverImage.large || result.coverImage.medium || "",
                    href: `anime/${result.id}`
                };
            });
        }

        // Fetch TMDB results after AniList
        const data = await soraFetch(
            `https://api.themoviedb.org/3/search/multi?api_key=9801b6b0548ad57581d111ea690c85c8&query=${encodedKeyword}&include_adult=false`
        ).then(r => r.json());

        if (data && data.results && data.results.length > 0) {
            transformedResults = transformedResults.concat(
                data.results.map(result => {
                    if (result.media_type === "movie" || result.title) {
                        return {
                            title: result.title || result.name || result.original_title || result.original_name || "Untitled",
                            image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
                            href: `movie/${result.id}`
                        };
                    } else if (result.media_type === "tv" || result.name) {
                        return {
                            title: result.name || result.title || result.original_name || result.original_title || "Untitled",
                            image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
                            href: `tv/${result.id}/1/1`
                        };
                    }
                })
                .filter(result => result.title !== "Overflow")
                .filter(result => result.title !== "My Marriage Partner Is My Student, a Cocky Troublemaker")
            );
        }

        console.log('Transformed Results: ' + JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);

    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
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

            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)/);
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
        } else if (url.includes('anime')) {
            const match = url.match(/anime\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const animeId = parseInt(match[1]);

            const aniData = await Anilist.lookup({ id: animeId });
            const anime = aniData.Page.media[0];

            const cleanDescription = anime.description
                ? anime.description.replace(/<[^>]+>/g, '').trim()
                : 'No description available';

            const transformedResults = [{
                description: cleanDescription,
                aliases: `Duration: ${anime.episodes ? 24 + " minutes" : 'Unknown'}`, // default 24 mins per episode
                airdate: `Aired: ${anime.startDate.year ? Anilist.convertAnilistDateToDateStr(anime.startDate) : 'Unknown'}`
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
        } else if(url.includes('anime')) {
            const match = url.match(/anime\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const animeId = parseInt(match[1]);
            const aniData = await Anilist.lookup({ id: animeId });
            const anime = aniData.Page.media[0];

            console.log(anime);

            if (!anime) return JSON.stringify([]);

            const episodesCount = anime.episodes || (anime.nextAiringEpisode.episode - 1) || 1;
            const episodesArray = [];
            for (let i = 1; i <= episodesCount; i++) {
                episodesArray.push({
                    href: `anime/${animeId}/${i}`,
                    number: i,
                    title: `Episode ${i}`
                });
            }

            console.log(episodesArray);
            return JSON.stringify(episodesArray);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

// searchResults("clannad");
// extractDetails("tv/24835/1/1");
// extractEpisodes("tv/24835/1/1");
// extractStreamUrl("tv/24835/1/1");

// extractDetails("anime/2167");
// extractEpisodes("anime/2167");
// extractStreamUrl("anime/130003/1");

// searchResults("One piece");
// extractEpisodes("anime/21");

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const match = url.match(/(movie|tv|anime)\/(.+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        let streams = [];
        let subtitles = "";

        // --- Vidzee fetch (parallel 5 servers) ---
        const fetchVidzee = async () => {
            const vidzeePromises = Array.from({ length: 5 }, (_, i) => {
                const sr = i + 1;
                let apiUrl;

                if (type === 'movie') {
                    apiUrl = `https://player.vidzee.wtf/api/server?id=${path}&sr=${sr}`;
                } else if (type === 'tv') {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    apiUrl = `https://player.vidzee.wtf/api/server?id=${showId}&sr=${sr}&ss=${seasonNumber}&ep=${episodeNumber}`;
                } else {
                    return null;
                }

                return soraFetch(apiUrl)
                    .then(res => res.json())
                    .then(data => {
                        if (!data.url) return null;
                        const stream = data.url.find(source =>
                            source.lang?.toLowerCase() === 'english'
                        );
                        if (!stream) return null;

                        return {
                            title: `Vidzee - ${data.provider}`,
                            streamUrl: stream.link,
                            headers: {
                                'Origin': 'https://player.vidzee.wtf',
                                'Referer': data.headers?.Referer || ''
                            }
                        };
                    })
                    .catch(() => null);
            });

            const results = await Promise.allSettled(vidzeePromises);
            return results
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);
        };

        // --- XPrime fetches ---
        const fetchXPrime = async () => {
            const xprimeStreams = [];
            const xprimeBaseUrl = 'https://xprime.tv/watch';
            const xprimeServers = [
                'primebox', 'phoenix', 'primenet', 'kraken', 'harbour', 'volkswagen', 'fendi'
            ];

            let xprimeMetadata;
            if (type === 'movie') {
                const metadataRes = await soraFetch(`https://api.themoviedb.org/3/movie/${path}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
                xprimeMetadata = await metadataRes.json();

                for (const server of xprimeServers) {
                    let apiUrl = '';
                    const name = xprimeMetadata.title || xprimeMetadata.name || xprimeMetadata.original_title || xprimeMetadata.original_name || '';

                    if (server === xprimeServers[0]) {
                        if (xprimeMetadata.release_date) {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&fallback_year=${xprimeMetadata.release_date.split('-')[0]}`;
                        } else {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}`;
                        }
                    } else {
                        if (xprimeMetadata.release_date) {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&year=${xprimeMetadata.release_date.split('-')[0]}&id=${path}&imdb=${xprimeMetadata.imdb_id || ''}`;
                        } else {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&id=${path}&imdb=${xprimeMetadata.imdb_id || ''}`;
                        }
                    }

                    xprimeStreams.push(
                        soraFetch(apiUrl)
                            .then(res => res.json())
                            .then(data => {
                                if (server === 'volkswagen' && data?.url) {
                                    return {
                                        title: `XPrime - ${server} (German)`,
                                        streamUrl: data.url,
                                        headers: { Referer: "https://xprime.tv/" }
                                    };
                                } else if (server === 'fendi' && data?.url) {
                                    if (data?.subtitles?.length) {
                                        const engSub = data.subtitles.find(sub => sub.language === 'eng' && (sub.name === 'English' || sub.name === 'English [CC]'));
                                        if (engSub) {
                                            subtitles = engSub.url;
                                        }
                                    }
                                    return {
                                        title: `XPrime - ${server} (Italian)`,
                                        streamUrl: data.url,
                                        headers: { Referer: "https://xprime.tv/" }
                                    };
                                } else if (data?.url) {
                                    if (data?.subtitle) subtitles = data.subtitle;
                                    return {
                                        title: `XPrime - ${server}`,
                                        streamUrl: data.url,
                                        headers: { Referer: "https://xprime.tv/" }
                                    };
                                }
                                return null;
                            })
                            .catch(() => null)
                    );
                }
            } else if (type === 'tv') {
                const [showId, season, episode] = path.split('/');
                const metadataRes = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
                xprimeMetadata = await metadataRes.json();

                for (const server of xprimeServers) {
                    let apiUrl = '';
                    const name = xprimeMetadata.title || xprimeMetadata.name || xprimeMetadata.original_title || xprimeMetadata.original_name || '';

                    if (server === xprimeServers[0]) {
                        if (xprimeMetadata.first_air_date) {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&fallback_year=${xprimeMetadata.first_air_date.split('-')[0]}&season=${season}&episode=${episode}`;
                        } else {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&season=${season}&episode=${episode}`;
                        }
                    } else {
                        if (xprimeMetadata.first_air_date) {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&year=${xprimeMetadata.first_air_date.split('-')[0]}&id=${showId}&imdb=${xprimeMetadata.imdb_id || ''}&season=${season}&episode=${episode}`;
                        } else {
                            apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&id=${showId}&imdb=${xprimeMetadata.imdb_id || ''}&season=${season}&episode=${episode}`;
                        }
                    }

                    xprimeStreams.push(
                        soraFetch(apiUrl)
                            .then(res => res.json())
                            .then(data => {
                                if (server === 'volkswagen' && data?.url) {
                                    return {
                                        title: `XPrime - ${server} (German)`,
                                        streamUrl: data.url,
                                        headers: { Referer: "https://xprime.tv/" }
                                    };
                                } else if (server === 'fendi' && data?.url) {
                                    if (data?.subtitles?.length) {
                                        const engSub = data.subtitles.find(sub => sub.language === 'eng' && (sub.name === 'English' || sub.name === 'English [CC]'));
                                        if (engSub) {
                                            subtitles = engSub.url;
                                        }
                                    }
                                    return {
                                        title: `XPrime - ${server} (Italian)`,
                                        streamUrl: data.url,
                                        headers: { Referer: "https://xprime.tv/" }
                                    };
                                } else if (data?.url) {
                                    if (data?.subtitle) subtitles = data.subtitle;
                                    return {
                                        title: `XPrime - ${server}`,
                                        streamUrl: data.url,
                                        headers: { Referer: "https://xprime.tv/" }
                                    };
                                }
                                return null;
                            })
                            .catch(() => null)
                    );
                }
            }

            const settledResults = await Promise.allSettled(xprimeStreams);
            return settledResults
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);
        };

        // --- VixSrc fetch ---
        const fetchVixSrc = async () => {
            try {
                let vixsrcUrl;

                if (type === 'movie') {
                    vixsrcUrl = `https://vixsrc.to/movie/${path}`;
                } else if (type === 'tv') {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    vixsrcUrl = `https://vixsrc.to/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                } else {
                    return null;
                }

                const html = await soraFetch(vixsrcUrl).then(res => res.text());

                let vixStreams = [];

                if (html.includes('window.masterPlaylist')) {
                    const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
                    const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
                    const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);

                    if (urlMatch && tokenMatch && expiresMatch) {
                        const baseUrl = urlMatch[1];
                        const token = tokenMatch[1];
                        const expires = expiresMatch[1];

                        const streamUrl = baseUrl.includes('?b=1')
                            ? `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`
                            : `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;

                        vixStreams.push({
                            title: `VixSrc`,
                            streamUrl,
                            headers: { Referer: "https://vixsrc.to/" }
                        });
                    }
                }

                if (!vixStreams.length) {
                    const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
                    if (m3u8Match) {
                        vixStreams.push({
                            title: `VixSrc`,
                            streamUrl: m3u8Match[1],
                            headers: { Referer: "https://vixsrc.to/" }
                        });
                    }
                }

                if (!vixStreams.length) {
                    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
                    if (scriptMatches) {
                        for (const script of scriptMatches) {
                            const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
                            if (streamMatch) {
                                vixStreams.push({
                                    title: `VixSrc`,
                                    streamUrl: streamMatch[1],
                                    headers: { Referer: "https://vixsrc.to/" }
                                });
                                break;
                            }
                        }
                    }
                }

                if (!vixStreams.length) {
                    const videoMatch = html.match(/(?:src|source|url)['"]?\s*[:=]\s*['"]?(https?:\/\/[^'"\s]+(?:\.mp4|\.m3u8|\.mpd)[^'"\s]*)/);
                    if (videoMatch) {
                        vixStreams.push({
                            title: `VixSrc`,
                            streamUrl: videoMatch[2] || videoMatch[1],
                            headers: { Referer: "https://vixsrc.to/" }
                        });
                    }
                }

                return vixStreams;
            } catch {
                console.log('VixSrc failed silently');
                return [];
            }
        };

        // --- Vidapi fetch ---
        const fetchVidapi = async () => {
            try {
                let vidapiUrl;

                if (type === 'movie') {
                    vidapiUrl = `https://vidapi.xyz/embed/movie/${path}`;
                } else if (type === 'tv') {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    vidapiUrl = `https://vidapi.xyz/embed/tv/${showId}&s=${seasonNumber}&e=${episodeNumber}`;
                } else {
                    return [];
                }

                const headers = { 'Referer': 'https://vidapi.xyz/' };
                const html = await soraFetch(vidapiUrl, { headers }).then(res => res.text());

                const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/);
                if (!iframeMatch) return [];

                let iframeSrc = iframeMatch[1].trim();
                if (!iframeSrc.startsWith("http")) {
                    iframeSrc = "https://uqloads.xyz/e/" + iframeSrc;
                }

                let allStreams = [];

                // --- uqloads.xyz direct ---
                if (iframeSrc.includes("uqloads.xyz")) {
                    const iframeHtml = await soraFetch(iframeSrc, { headers }).then(res => res.text());

                    const packedScriptMatch = iframeHtml.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                    if (packedScriptMatch) {
                        const unpackedScript = unpack(packedScriptMatch[1]);

                        const streamRegex = /"hls[1-9]":\s*"([^"]+)"/g;
                        let match;
                        while ((match = streamRegex.exec(unpackedScript)) !== null) {
                            const streamUrl = match[1].trim();
                            if (streamUrl.startsWith("https://") && (streamUrl.includes(".m3u8") || streamUrl.includes(".mp4"))) {
                                allStreams.push(streamUrl);
                            }
                        }
                    }
                }

                // --- player4u.xyz multi-res ---
                else if (iframeSrc.includes("player4u.xyz")) {
                    const playerHtml = await soraFetch(iframeSrc, { headers }).then(res => res.text());

                    const liRegex = /<li class="slide-toggle">([\s\S]*?)<\/li>/g;
                    let liMatch;
                    while ((liMatch = liRegex.exec(playerHtml)) !== null) {
                        const liContent = liMatch[1];
                        const urlMatch = liContent.match(/onclick="go\('([^']+)'\)"/);
                        if (!urlMatch) continue;

                        const fullUrl = "https://player4u.xyz" + urlMatch[1];
                        try {
                            const innerHtml = await soraFetch(fullUrl, { headers }).then(res => res.text());

                            const innerIframeMatch = innerHtml.match(/<iframe[^>]+src=["']([^"']+)["']/);
                            if (!innerIframeMatch) continue;

                            let iframeSrc2 = innerIframeMatch[1].trim();
                            if (!iframeSrc2.startsWith("http")) {
                                iframeSrc2 = "https://uqloads.xyz/e/" + iframeSrc2;
                            }

                            const iframeHtml2 = await soraFetch(iframeSrc2, { headers }).then(res => res.text());
                            const packedScriptMatch = iframeHtml2.match(/(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                            if (!packedScriptMatch) continue;

                            const unpackedScript = unpack(packedScriptMatch[1]);

                            const streamRegex = /"hls[1-9]":\s*"([^"]+)"/g;
                            let match;
                            while ((match = streamRegex.exec(unpackedScript)) !== null) {
                                const streamUrl = match[1].trim();
                                if (streamUrl.startsWith("https://") && (streamUrl.includes(".m3u8") || streamUrl.includes(".mp4"))) {
                                    allStreams.push(streamUrl);
                                }
                            }
                        } catch (err) {
                            console.log("Error fetching inner player4u stream:", err);
                            continue;
                        }
                    }
                }

                // --- Format results ---
                if (allStreams.length === 0) return [];

                return allStreams.map((url, i) => ({
                    title: `Vidapi - ${i + 1}`,
                    streamUrl: url,
                    headers,
                }));
            } catch (e) {
                console.log("Vidapi stream extraction failed:", e);
                return [];
            }
        };

        // --- RgShows fetch ---
        // const fetchRgShows = async () => {
        //     try {
        //         let rgShowsUrl;

        //         if (type === 'movie') {
        //             rgShowsUrl = `https://api.rgshows.me/main/movie/${path}`
        //         } else if (type === 'tv') {
        //             const [showId, seasonNumber, episodeNumber] = path.split('/');
        //             rgShowsUrl = `https://api.rgshows.me/main/tv/${showId}/${seasonNumber}/${episodeNumber}`;
        //         } else {
        //             return null;
        //         }

        //         const headers = {
        //             'Origin': 'https://www.vidsrc.wtf',
        //             'Referer': 'https://www.vidsrc.wtf/'
        //         };

        //         const rgShowsResponse = await soraFetch(rgShowsUrl, { headers });
        //         const rgShowsData = await rgShowsResponse.json();

        //         if (rgShowsData && rgShowsData.stream) {
        //             return [{
        //                 title: `RgShows`,
        //                 streamUrl: rgShowsData.stream.url,
        //                 headers: { Referer: "https://www.vidsrc.wtf/" }
        //             }];
        //         }
        //     } catch (e) {
        //         console.log('RgShows fetch failed silently:', e);
        //     }
        //     return [];
        // };

        // --- Vidnest.fun ---
        // --- Movies and TV shows ---
        const fetchVidnest = async () => {
            try {
                let vidnestUrl;

                if (type === 'movie') {
                    vidnestUrl = `https://embed.madaraverse.online/hollymoviehd/movie/${path}`
                } else if (type === 'tv') {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    vidnestUrl = `https://embed.madaraverse.online/hollymoviehd/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                } else {
                    return null;
                }

                const headers = {
                    'Referer': 'https://vidnest.fun/',
                    'Origin': 'https://vidnest.fun'
                };
                const data = await soraFetch(vidnestUrl, { headers }).then(res => res.json());

                if (!data?.sources || !Array.isArray(data.sources)) {
                    return [];
                }
                const vidnestStreamList = data.sources.map(source => source.file).filter(Boolean);

                if (vidnestStreamList?.length === 1) {
                    return [{
                        title: 'Vidnest',
                        streamUrl: `https://proxy-2.madaraverse.online/proxy?url=${vidnestStreamList[0]}`,
                        headers
                    }];
                } else {
                    return vidnestStreamList?.map((url, i) => ({
                        title: `Vidnest - ${i + 1}`,
                        streamUrl: `https://proxy-2.madaraverse.online/proxy?url=${url}`,
                        headers
                    }));
                }
            } catch (e) {
                console.log("Vidnest stream extraction failed silently:", e);
                return [];
            }
        };

        // --- Vidnest.fun ---
        // --- Anime ---
        const fetchVidnestAnime = async () => {
            try {
                if (type === 'anime') {
                    const [anilistId, episodeNumber] = path.split('/');
                
                    const hosts = ['animez', 'zaza', 'miko', 'hd-1', 'hd-2', 'hd-3', 'shiro'];
                    const types = ['sub', 'dub'];

                    const headers = {
                        'Referer': 'https://vidnest.fun/',
                        'Origin': 'https://vidnest.fun'
                    };

                    // Build all requests
                    const requests = [];
                    let subtitleUrls = [];

                    for (const host of hosts) {
                        const hostTitle = 
                            host === 'miko' ? 'Aniwave' : 
                            host === 'zaza' ? 'Animepahe' : 
                            host === 'shiro' ? 'AniZone' : 
                            host === 'animez' ? 'AnimeZ' : 
                            'Zoro';

                        for (const type of types) {
                            const url = `https://backend.xaiby.sbs/sources?id=${anilistId}&ep=${episodeNumber}&host=${host}&type=${type}`;
                            requests.push(
                                soraFetch(url, { headers })
                                    .then(res => res.json())
                                    .then(data => {
                                        if (!data?.sources?.url) return null;

                                        let subs = [];

                                        if (data.sources?.subtitles && Array.isArray(data.sources?.subtitles)) {
                                            subs = data.sources.subtitles;
                                        } else if (data.sources?.tracks && Array.isArray(data.sources?.tracks)) {
                                            subs = data.sources.tracks;
                                        } else if (Array.isArray(data.subtitles)) {
                                            subs = data.subtitles;
                                        }

                                        // Find the first English .vtt that is not a thumbnail
                                        const found = subs.find(s =>
                                            typeof (s.url || s.file) === "string" &&
                                            /\.vtt$/i.test(s.url || s.file) &&
                                            !/thumbnails\.vtt$/i.test(s.url || s.file) &&
                                            (s.lang || s.label || "").toLowerCase().includes("english")
                                        );

                                        if (found) {
                                            subtitleUrls = found.url || found.file;
                                        }

                                        const streamUrl = host === 'miko' ? data.sources.url
                                            : host === "animez" ? data.sources.url
                                            : `https://proxy-2.madaraverse.online/proxy?url=${encodeURIComponent(data.sources.url)}`;

                                        return {
                                            title: `${hostTitle} - ${host.toUpperCase()} - ${type.toUpperCase()}`,
                                            streamUrl,
                                            headers: { Referer: data.sources?.headers?.Referer || 'https://vidnest.fun/' }
                                        };
                                    })
                                    .catch(() => null)
                            );
                        }
                    }

                    const results = await Promise.all(requests);

                    return {
                        streams: results.filter(Boolean),
                        subtitles: subtitleUrls
                    };

                    // const results = await Promise.all(requests);
                    // return results.filter(Boolean);
                }
            } catch (e) {
                console.log("Vidnest Anime stream extraction failed silently:", e);
                return [];
            }
        };

        // --- Vidrock.net ---
        const fetchVidrock = async () => {
            try {
                let vidrockUrl;

                if (type === 'movie') {
                    // Do nothing
                    vidrockUrl = `https://vidrock.net/api/movie/${path}`;
                } else if (type === 'tv') {
                    // TV format: episode-season-reversedShowId
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    const transformed = `${episodeNumber}-${seasonNumber}-${showId.split("").reverse().join("")}`;
                    const encodedOnce = btoa(unescape(encodeURIComponent(transformed)));
                    const encodedTwice = btoa(encodedOnce);

                    vidrockUrl = `https://vidrock.net/api/tv/${encodedTwice}`;
                } else {
                    return null;
                }

                const headers = {
                    'Referer': 'https://vidrock.net/',
                    'Origin': 'https://vidrock.net'
                };
                const data = await soraFetch(vidrockUrl, { headers }).then(res => res.json());

                if (!data || typeof data !== 'object') return [];

                const vidrockStreamList = Object.entries(data)
                    .filter(([key, s]) => s?.url && s.language?.toLowerCase() === 'english')
                    .map(([key, s]) => {
                        const match = key.match(/source(\d+)/i);
                        const sourceNum = match ? match[1] : 'Unknown';
                        return {
                            title: `Vidrock - ${sourceNum}`,
                            streamUrl: s.url,
                            headers
                        };
                    });

                return vidrockStreamList;
            } catch (e) {
                console.log("Vidrock stream extraction failed silently:", e);
                return [];
            }
        };

        // --- CloudStream Pro fetch ---
        const fetchCloudStreamPro = async () => {
            try {
                let cloudStreamUrl;

                if (type === 'movie') {
                    cloudStreamUrl = `https://cdn.moviesapi.club/embed/movie/${path}`
                } else if (type === 'tv') {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    cloudStreamUrl = `https://cdn.moviesapi.club/embed/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                } else {
                    return null;
                }

                const html = await soraFetch(cloudStreamUrl).then(res => res.text());
                const embedRegex = /<iframe[^>]*src="([^"]+)"[^>]*>/g;
                const embedUrl = Array.from(html.matchAll(embedRegex), m => m[1].trim()).find(Boolean);

                if (!embedUrl) return [];

                const completedUrl = embedUrl.startsWith('http') ? embedUrl : `https:${embedUrl}`;
                const html2 = await soraFetch(completedUrl).then(res => res.text());
                const match2 = html2.match(/src:\s*['"]([^'"]+)['"]/);

                if (!match2 || !match2[1]) return [];

                const src = `https://cloudnestra.com${match2[1]}`;
                const html3 = await soraFetch(src).then(res => res.text());
                const match3 = html3.match(/file:\s*['"]([^'"]+)['"]/);

                if (!match3 || !match3[1]) return [];

                return [{
                    title: "CloudStream Pro",
                    streamUrl: match3[1],
                    headers: {}
                }];
            } catch (e) {
                console.log('CloudStream Pro fallback failed silently');
                return [];
            }
        };

        // --- Subtitle fetch ---
        const fetchSubtitles = async () => {
            try {
                let subtitleApiUrl;

                if (type === 'movie') {
                    subtitleApiUrl = `https://sub.wyzie.ru/search?id=${path}`
                } else if (type === 'tv') {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    subtitleApiUrl = `https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`;
                } else {
                    return "";
                }

                const subtitleTrackResponse = await soraFetch(subtitleApiUrl);
                const subtitleTrackData = await subtitleTrackResponse.json();

                let subtitleTrack = subtitleTrackData.find(track =>
                    track.display.includes('English') && ['ASCII', 'UTF-8'].includes(track.encoding)
                ) || subtitleTrackData.find(track =>
                    track.display.includes('English') && track.encoding === 'CP1252'
                ) || subtitleTrackData.find(track =>
                    track.display.includes('English') && track.encoding === 'CP1250'
                ) || subtitleTrackData.find(track =>
                    track.display.includes('English') && track.encoding === 'CP850'
                );

                if (subtitleTrack) {
                    return subtitleTrack.url;
                }
            } catch {
                console.log('Subtitle extraction failed silently.');
            }
            return "";
        };

        // Run all fetches in parallel
        const [
            vidzeeStreams,
            xprimeStreams,
            vixSrcStreams,
            vidapiStreams,
            // rgShowsStreams,
            vidnestStreams,
            vidnestAnimeResult,
            vidrockStreams,
            cloudStreamProStreams,
            subtitleUrl
        ] = await Promise.allSettled([
            fetchVidzee(),
            fetchXPrime(),
            fetchVixSrc(),
            fetchVidapi(),
            // fetchRgShows(),
            fetchVidnest(),
            fetchVidnestAnime(),
            fetchVidrock(),
            fetchCloudStreamPro(),
            fetchSubtitles()
        ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

        // Collect streams from all sources
        streams.push(...(vidzeeStreams || []));
        streams.push(...(xprimeStreams || []));
        streams.push(...(vixSrcStreams || []));
        streams.push(...(vidapiStreams || []));
        // streams.push(...(rgShowsStreams || []));
        streams.push(...(vidnestStreams || []));
        streams.push(...((vidnestAnimeResult?.streams) || []));
        streams.push(...(vidrockStreams || []));
        streams.push(...(cloudStreamProStreams || []));

        if (vidnestAnimeResult?.subtitles?.length) {
            subtitles = vidnestAnimeResult.subtitles;
        }

        if (subtitleUrl) {
            subtitles = subtitleUrl;
        }

        const result = { streams, subtitles };
        console.log('Result: ' + JSON.stringify(result));
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return JSON.stringify({ streams: [], subtitles: "" });
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

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}

class Unbaser {
    constructor(base) {
        /* Functor for a given base. Will efficiently convert
          strings to natural numbers. */
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        // fill elements 37...61, if necessary
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        // If base can be handled by int() builtin, let it do it for us
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            // Build conversion dictionary cache
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        /* Decodes a value to an integer. */
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}

function detect(source) {
    /* Detects whether `source` is P.A.C.K.E.R. coded. */
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
}

function unpack(source) {
    /* Unpacks P.A.C.K.E.R. packed js code. */
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        /* Look up symbols in the synthetic symtab. */
        const word = match;
        let word2;
        if (radix == 1) {
            //throw Error("symtab unknown");
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        /* Juice from a source file the four args needed by decoder. */
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            //const args = re.search(juicer, source, re.DOTALL);
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                    //don't know what it is
                    // a = list(a);
                    // a[1] = 62;
                    // a = tuple(a);
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        /* Strip string lookup table (list) and replace values in source. */
        /* Need to work on this. */
        return source;
    }
}