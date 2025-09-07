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

    static async getLatest(filters) {
        let page = 0;
        let hasNextPage = true;
        const perPage = 50;
        const currentDate = new Date();

        filters.seasonYear = currentDate.getFullYear();
        filters.season = Anilist.monthToSeason(currentDate.getMonth());

        const results = [];

        do {
            page++;

            const query = `query (
                $page: Int,
                $perPage: Int,
                $sort: [MediaSort],
                $type: MediaType,
                $status: MediaStatus,
                $isAdult: Boolean,
                $seasonYear: Int,
                $season: MediaSeason
            ) {
                Page(page: $page, perPage: $perPage) {
                    media(
                        type: $type,
                        sort: $sort,
                        status: $status,
                        isAdult: $isAdult,
                        seasonYear: $seasonYear,
                        season: $season
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
                    pageInfo {
                        hasNextPage
                    }
                }
            }`;

            const variables = {
                "page": page,
                "perPage": perPage,
                "sort": [
                    "POPULARITY_DESC"
                ],
                "type": "ANIME",
                "status": "RELEASING",
                ...filters
            }

            const fetchResults = await Anilist.anilistFetch(query, variables);
            results.push(fetchResults);

            if(fetchResults?.Page?.pageInfo?.hasNextPage !== true) {
                hasNextPage = false;
            }

        } while(hasNextPage);

        const mergedObject = { Page: { media: []}};

        for(let page of results) {
            mergedObject.Page.media = mergedObject.Page.media.concat(page.Page.media);
        }

        return mergedObject;
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

    static monthToSeason(month) {
        // Month is 0 indexed
        const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
        if(month == 11) return seasons[0];
        if(month <= 1) return seasons[0];
        if(month <= 4) return seasons[1];
        if(month <= 7) return seasons[2];
        return seasons[3];
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchResults(keyword) {
    try {
        let aniData = null;
        let transformedResults = [];

        const keywordGroups = {
            anime: ["!anime", "!a", "/anime", "/a", "/"],
            trending: ["!trending", "!hot", "!tr", "!!"],
            topRatedMovie: ["!top-rated-movie", "!topmovie", "!tm", "??"],
            topRatedTV: ["!top-rated-tv", "!toptv", "!tt", "::"],
            popularMovie: ["!popular-movie", "!popmovie", "!pm", ";;"],
            popularTV: ["!popular-tv", "!poptv", "!pt", "++"],
        };

        const skipTitleFilter = Object.values(keywordGroups).flat();

        const otherMediaKeywords = [
            ...keywordGroups.trending,
            ...keywordGroups.topRatedMovie,
            ...keywordGroups.topRatedTV,
            ...keywordGroups.popularMovie,
            ...keywordGroups.popularTV,
        ];

        const shouldFilter = !matchesKeyword(keyword, skipTitleFilter);

        // --- AniList Section ---
        if (matchesKeyword(keyword, keywordGroups.anime)) {
            aniData = await Anilist.getLatest({ isAdult: false });
        } else if (
            !matchesKeyword(keyword, otherMediaKeywords)
        ) {
            aniData = await Anilist.search(keyword, { isAdult: false });
        }

        if (aniData?.Page?.media?.length > 0) {
            transformedResults = aniData.Page.media
            .map(result => ({
                title: result.title.english || result.title.romaji || result.title.native || "Untitled",
                image: result.coverImage.extraLarge || result.coverImage.large || result.coverImage.medium || "",
                href: `anime/${result.id}`,
            }))
            .filter(r => !shouldFilter || r.title.toLowerCase().includes(keyword.toLowerCase()));
        }

        // --- TMDB Section ---
        const encodedKeyword = encodeURIComponent(keyword);
        let baseUrl = null;

        if (matchesKeyword(keyword, keywordGroups.trending)) {
            baseUrl = `https://api.themoviedb.org/3/trending/all/week?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.topRatedMovie)) {
            baseUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.topRatedTV)) {
            baseUrl = `https://api.themoviedb.org/3/tv/top_rated?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.popularMovie)) {
            baseUrl = `https://api.themoviedb.org/3/movie/popular?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.popularTV)) {
            baseUrl = `https://api.themoviedb.org/3/tv/popular?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (!matchesKeyword(keyword, keywordGroups.anime)) {
            baseUrl = `https://api.themoviedb.org/3/search/multi?api_key=9801b6b0548ad57581d111ea690c85c8&query=${encodedKeyword}&include_adult=false&page=`;
        }

        let dataResults = [];

        if (baseUrl) {
            const pagePromises = Array.from({ length: 5 }, (_, i) =>
                soraFetch(baseUrl + (i + 1)).then(r => r.json())
            );
            const pages = await Promise.all(pagePromises);
            dataResults = pages.flatMap(p => p.results || []);
        }

        if (dataResults.length > 0) {
            transformedResults = transformedResults.concat(
                dataResults
                    .map(result => {
                        if (result.media_type === "movie" || result.title) {
                            return {
                                title: result.title || result.name || result.original_title || result.original_name || "Untitled",
                                image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
                                href: `movie/${result.id}`,
                            };
                        } else if (result.media_type === "tv" || result.name) {
                            return {
                                title: result.name || result.title || result.original_name || result.original_title || "Untitled",
                                image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
                                href: `tv/${result.id}/1/1`,
                            };
                        }
                    })
                    .filter(Boolean)
                    .filter(result => result.title !== "Overflow")
                    .filter(result => result.title !== "My Marriage Partner Is My Student, a Cocky Troublemaker")
                    .filter(r => !shouldFilter || r.title.toLowerCase().includes(keyword.toLowerCase()))
            );
        }

        console.log("Transformed Results: " + JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log("Fetch error in searchResults: " + error);
        return JSON.stringify([{ title: "Error", image: "", href: "" }]);
    }
}

function matchesKeyword(keyword, commands) {
    const lower = keyword.toLowerCase();
    return commands.some(cmd => lower.startsWith(cmd.toLowerCase()));
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

// searchResults("!trending");

// searchResults("/op");
// extractDetails("https://pixeldrain.net/l/VmpS467P");
// extractEpisodes("https://pixeldrain.net/l/VmpS467P");
// extractStreamUrl("pixeldrain/3Yuxg9Y9");

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
    try {
        const match = url.match(/^(movie|tv|anime|pixeldrain)\/([^?#]+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        let streams = [];
        let subtitles = "";

        // const streams2 = await networkFetch("https://vidnest.fun/movie/666243", 30, {}, ".m3u8");
        // const streams2 = await networkFetch("https://vidnest.fun/movie/666243", {
        //     timeoutSeconds: 10,
        //     clickSelectors: [".PlayButton_button__7mArI"],
        //     waitForSelectors: [".PlayButton_button__7mArI"],
        //     maxWaitTime: 5
        // });

        const streams2 = await networkFetchWithWaitAndClick(
            "https://vidnest.fun/movie/666243",
            [".PlayButton_button__7mArI"],           // Wait for this
            [".PlayButton_button__7mArI"],           // Click this
            { timeoutSeconds: 10 }
        );

        console.log("Vidnest.fun streams: " + JSON.stringify(streams2));
        console.log("Vidnest.fun streams: " + streams2);

        if (type === 'movie' || type === 'tv') {
            // --- Vidnest.fun ---
            // --- Movies and TV shows ---
            const fetchVidnest = async () => {
                try {
                    const proxyUrl = `https://proxy.nhdapi.xyz/proxy?url=`;
                    const headers = {
                        'Referer': 'https://vidnest.fun/',
                        'Origin': 'https://vidnest.fun'
                    };

                    const [showId, seasonNumber, episodeNumber] =
                        type === "tv" ? path.split("/") : [];

                    // helper to safely fetch JSON
                    const safeFetch = async (url, opts) => {
                        try {
                            const res = await soraFetch(url, opts);
                            return await res.json();
                        } catch (err) {
                            return null;
                        }
                    };

                    // build all endpoints
                    const endpoints = {
                        hollymovie: type === "movie"
                            ? `https://backend.vidnest.fun/hollymoviehd/movie/${path}`
                            : `https://backend.vidnest.fun/hollymoviehd/tv/${showId}/${seasonNumber}/${episodeNumber}`,

                        official: type === "movie"
                            ? `https://backend.vidnest.fun/official/movie/${path}`
                            : `https://backend.vidnest.fun/official/tv/${showId}/${seasonNumber}/${episodeNumber}`,

                        flixhq: type === "movie"
                            ? `https://backend.vidnest.fun/flixhq/movie/${path}`
                            : `https://backend.vidnest.fun/flixhq/tv/${showId}/${seasonNumber}/${episodeNumber}`,

                        allmovies: type === "movie"
                            ? `https://backend.vidnest.fun/allmovies/movie/${path}`
                            : `https://backend.vidnest.fun/allmovies/tv/${showId}/${seasonNumber}/${episodeNumber}`
                    };

                    // run everything in parallel
                    const [
                        hollyData, 
                        // officialData, 
                        flixhqData, 
                        allMoviesData
                    ] = await Promise.allSettled([
                            safeFetch(endpoints.hollymovie, { headers }),
                            // safeFetch(endpoints.official, { headers }),
                            safeFetch(endpoints.flixhq, { headers }),
                            safeFetch(endpoints.allmovies, { headers })
                        ]).then(results => results.map(r => r.status === "fulfilled" ? r.value : null));

                    let streams = [];

                    // --- HollymovieHD ---
                    if (hollyData?.sources && Array.isArray(hollyData.sources)) {
                        streams.push(
                            ...hollyData.sources
                                .filter(src => src?.file)
                                .map(src => ({
                                    title: `Vidnest - ${src.label || "Unknown"}`,
                                    streamUrl: `${proxyUrl}${src.file}`,
                                    headers
                                }))
                        );
                    }


                    // // --- Official ---
                    // if (officialData?.stream?.url) {
                    //     streams.push({
                    //         title: "Vidnest Official",
                    //         streamUrl: `${proxyUrl}${officialData.stream.url}`,
                    //         headers
                    //     });
                    // }

                    // --- FlixHQ ---
                    if (flixhqData?.url) {
                        streams.push({
                            title: "Vidnest FlixHQ",
                            streamUrl: flixhqData.url,
                            headers: flixhqData.headers || headers
                        });
                    }

                    // --- AllMovies ---
                    if (allMoviesData?.streams && Array.isArray(allMoviesData.streams)) {
                        streams.push(
                            ...allMoviesData.streams
                                .filter(s => s?.url)
                                .map(s => ({
                                    title: `Vidnest All Movies - ${s.language || "Unknown"}`,
                                    streamUrl: s.url,
                                    headers: s.headers || headers
                                }))
                        );
                    }

                    return streams;
                } catch (e) {
                    console.log("Vidnest stream extraction failed silently:", e);
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
                vidnestStreams,
                subtitleUrl
            ] = await Promise.allSettled([
                fetchVidnest(),
                fetchSubtitles()
            ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

            // Collect streams from all sources
            streams.push(...(vidnestStreams || []));

            if (subtitleUrl) {
                subtitles = subtitleUrl;
            }
        } else if (type === 'anime') {
            // --- Vidnest.fun ---
            // --- Anime ---
            const fetchVidnestAnime = async () => {
                try {
                    if (type === 'anime') {
                        const [anilistId, episodeNumber] = path.split('/');

                        const hosts = [
                            'zaza', 
                            'miko', 
                            'animez', 
                            'hd-1', 
                            'hd-2', 
                            'hd-3', 
                            'shiro'
                        ];
                        const types = ['sub', 'dub'];

                        const aniwaveHosts = [
                            'pahe', 
                            'wave', 
                            'lofi', 
                            'miku', 
                            'koto', 
                            'yuki',
                            'zone', 
                            'strix', 
                            'anya', 
                            'akane', 
                            'kami'
                        ];

                        const headers = {
                            'Referer': 'https://vidnest.fun/',
                            'Origin': 'https://vidnest.fun'
                        };

                        const requests = [];
                        let subtitleUrls = [];
                        let subtitleFound = false;

                        // --- First loop (main hosts) ---
                        for (const host of hosts) {
                            const hostTitle =
                                host === 'miko' ? 'Aniwave' :
                                host === 'zaza' ? 'Animepahe' :
                                host === 'shiro' ? 'AniZone' :
                                host === 'animez' ? 'AnimeZ' :
                                'Zoro';

                            for (const type of types) {
                                if (type === 'dub' && host === 'animez') continue;
                                const url = `https://backend.xaiby.sbs/sources?id=${anilistId}&ep=${episodeNumber}&host=${host}&type=${type}`;
                                requests.push(
                                    soraFetch(url, { headers })
                                        .then(res => res.json())
                                        .then(data => {
                                            if (!data?.sources?.url) return null;

                                            let subs = [];

                                            if (!subtitleFound) {
                                                if (data.sources?.subtitles && Array.isArray(data.sources?.subtitles)) {
                                                    subs = data.sources.subtitles;
                                                } else if (data.sources?.tracks && Array.isArray(data.sources?.tracks)) {
                                                    subs = data.sources.tracks;
                                                } else if (Array.isArray(data.subtitles)) {
                                                    subs = data.subtitles;
                                                }

                                                // English .vtt
                                                const found = subs.find(s =>
                                                    typeof (s.url || s.file) === "string" &&
                                                    /\.vtt$/i.test(s.url || s.file) &&
                                                    !/thumbnails\.vtt$/i.test(s.url || s.file) &&
                                                    (s.lang || s.label || "").toLowerCase().includes("english")
                                                );

                                                if (found) {
                                                    subtitleUrls = found.url || found.file;
                                                    subtitleFound = true;
                                                }
                                            }

                                            const proxyUrl = `https://proxy.nhdapi.xyz/proxy?url=`;
                                            const streamUrl = host === 'miko' ? data.sources.url
                                                : host === "animez" ? data.sources.url
                                                : host === "zaza" ? data.sources.url
                                                : `${proxyUrl}${encodeURIComponent(data.sources.url)}`;

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

                        // --- Second loop (aniwave hosts) ---
                        for (const host of aniwaveHosts) {
                            const hostTitle =
                                host === 'lofi' ? 'Strmup' :
                                host === 'anya' ? 'MegaCloud' :
                                host === 'akane' ? 'MegaPlay' :
                                host === 'koto' ? 'MegaPlay' :
                                host === 'miku' ? 'MegaCloud' :
                                host === 'zone' ? 'AniZone' :
                                host === 'kami' ? 'KickAssAnime' :
                                host === 'pahe' ? 'Animepahe' :
                                host === 'strix' ? 'AniXL' :
                                host === 'wave' ? 'Aniwave' :
                                host;

                            for (const type of types) {
                                const url = `https://backend.vidnest.fun/aniwave/${anilistId}/${episodeNumber}/${type}/${host}`;

                                console.log("Fetching: " + url);
                                requests.push(
                                    soraFetch(url, { headers })
                                        .then(res => res.json())
                                        .then(data => {
                                            if (!data?.streams[0]?.url) return null;

                                            let subs = [];

                                            if (!subtitleFound) {
                                                if (data.sources?.subtitles && Array.isArray(data.sources?.subtitles)) {
                                                    if (!data.sources.subtitles.includes("1oe.lostproject.club")) {
                                                        subs = data.sources.subtitles;
                                                    }
                                                } else if (data.sources?.tracks && Array.isArray(data.sources?.tracks)) {
                                                    if (!data.sources.tracks.includes("1oe.lostproject.club")) {
                                                        subs = data.sources.tracks;
                                                    }
                                                } else if (Array.isArray(data.subtitles)) {
                                                    if (!data.subtitles.includes("1oe.lostproject.club")) {
                                                        subs = data.subtitles;
                                                    }
                                                }

                                                // English .vtt
                                                const found = subs.find(s =>
                                                    typeof (s.url || s.file) === "string" &&
                                                    /\.vtt$/i.test(s.url || s.file) &&
                                                    !/thumbnails\.vtt$/i.test(s.url || s.file) &&
                                                    (s.lang || s.label || "").toLowerCase().includes("english")
                                                );

                                                if (found) {
                                                    subtitleUrls = found.url || found.file;
                                                    subtitleFound = true;
                                                }
                                            }

                                            // const subs = data.streams[0]?.subtitles || data.subtitles || [];
                                            const proxyUrl = `https://proxy.nhdapi.xyz/proxy?url=`;
                                            const streamUrl = host === 'wave' ? data.streams[0].url
                                                : host === 'lofi' ? data.streams[0].url
                                                : host === 'pahe' ? data.streams[0].url
                                                : host === 'miku' ? data.streams[0].url
                                                : `${proxyUrl}${encodeURIComponent(data.streams[0].url)}`;

                                            const stream = {
                                                title: `(Aniwave) ${hostTitle} - ${host.toUpperCase()} - ${type.toUpperCase()}`,
                                                streamUrl: streamUrl,
                                                headers: data.streams[0]?.headers
                                            };

                                            console.log("Aniwave stream fetched: " + stream);
                                            return stream;
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
                    }
                } catch (e) {
                    console.log("Vidnest Anime stream extraction failed silently:", e);
                    return { streams: [], subtitles: [] };
                }
            };

            // Run all fetches in parallel
            const [
                vidnestAnimeResult,
            ] = await Promise.allSettled([
                fetchVidnestAnime(),
            ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

            // Collect streams from all sources
            streams.push(...((vidnestAnimeResult?.streams) || []));

            if (vidnestAnimeResult?.subtitles?.length && vidnestAnimeResult?.subtitles) {
                subtitles = vidnestAnimeResult.subtitles;
            }
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