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

        // --- AniList Search ---
        if (keyword.startsWith('!anime') || keyword.startsWith('!a') || keyword.startsWith('!')) {
            aniData = await Anilist.getLatest({ isAdult: false });
        } else {
            aniData = await Anilist.search(keyword, { isAdult: false });
        }

        let transformedResults = [];

        if (aniData?.Page?.media?.length > 0) {
            transformedResults = aniData.Page.media.map(result => ({
                title:
                    result.title.english ||
                    result.title.romaji ||
                    result.title.native ||
                    "Untitled",
                image:
                    result.coverImage.extraLarge ||
                    result.coverImage.large ||
                    result.coverImage.medium ||
                    "",
                href: `anime/${result.id}`,
            }));
        }

        console.log("Transformed Results: " + JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log("Fetch error in searchResults: " + error);
        return JSON.stringify([{ title: "Error", image: "", href: "" }]);
    }
}

async function extractDetails(url) {
    try {
        if (url.includes('anime')) {
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
        if(url.includes('anime')) {
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
        const match = url.match(/(movie|tv|anime)\/(.+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        let streams = [];
        let subtitles = "";

        // --- Lunar Anime ---
        const fetchLunarAnime = async () => {
            try {
                if (type === 'anime') {
                    const [anilistId, episodeNumber] = path.split('/');
                    const types = ['sub', 'dub'];

                    const apiUrl = `https://2ndprovider.lunaranime.ru/vermillion/episodes?id=${anilistId}`;
                    const response = await soraFetch(apiUrl);
                    const data = await response.json();

                    const sources = data.data.episodes;

                    let requests = [];
                    let subtitleUrl = "";

                    for (const source of sources) {
                        const providerId = source.providerId;

                        if (providerId === "yuki" || providerId === "zone" || providerId === "akane" || providerId === "strix" || providerId === "kami") {
                            continue;
                        }

                        const episode = source.episodes.find(e => e.number === Number(episodeNumber));

                        if (!episode) {
                            console.warn(`Episode ${episodeNumber} not found for provider ${providerId}`);
                            continue;
                        }

                        const buildRequest = (subType) => {
                            const streamProviderUrl = `https://2ndprovider.lunaranime.ru/vermillion/sources?id=${anilistId}&provider=${providerId}&epId=${episode.id}&epNum=${episode.number}&subType=${subType}`;
                            return soraFetch(streamProviderUrl)
                                .then(res => res.json())
                                .then(data => {
                                    if (!data?.data?.sources) return null;

                                    // collect subs
                                    let subs = [];
                                    if (Array.isArray(data.data.subtitles)) {
                                        subs = data.data.subtitles;
                                    } else if (Array.isArray(data.data.tracks)) {
                                        subs = data.data.tracks;
                                    }

                                    const found = subs.find(s =>
                                        typeof (s.url || s.file) === "string" &&
                                        /\.vtt$/i.test(s.url || s.file) &&
                                        !/thumbnails\.vtt$/i.test(s.url || s.file) &&
                                        (s.lang || s.label || "").toLowerCase().includes("english")
                                    );

                                    if (found) {
                                        subtitleUrl = found.url || found.file;
                                    }

                                    return data.data.sources
                                        .filter(src => src.isM3U8 !== false)
                                        .map(src => ({
                                            title: `${providerId.toUpperCase()} - ${subType.toUpperCase()}${src.quality ? ` - ${src.quality}` : ""}`,
                                            streamUrl: `https://cluster.lunaranime.ru/api/proxy/hls/custom?url=${src.url}${data.data.headers ? `&referer=${data.data.headers?.Referer}` : ''}`,
                                            headers: data.data.headers || {}
                                        }));
                                })
                                .catch(() => null);
                        };

                        if (episode.hasDub) {
                            for (const t of types) {
                                requests.push(buildRequest(t));
                            }
                        } else {
                            requests.push(buildRequest("sub"));
                        }
                    }

                    const results = await Promise.all(requests);
                    return {
                        streams: results.flat().filter(Boolean),
                        subtitles: subtitleUrl
                    };
                }
                return { streams: [], subtitles: "" };
            } catch (e) {
                console.log("Lunar Anime stream extraction failed silently:", e);
                return { streams: [], subtitles: "" };
            }
        };

        // Run all fetches in parallel
        const [
            lunarAnimeResult,
        ] = await Promise.allSettled([
            fetchLunarAnime()
        ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : { streams: [], subtitles: "" }));

        // Collect streams from all sources
        streams.push(...((lunarAnimeResult?.streams) || []));

        if (lunarAnimeResult?.subtitles) {
            subtitles = lunarAnimeResult.subtitles;
        }

        const result = { streams, subtitles };
        console.log('Result: ' + JSON.stringify(result));
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return JSON.stringify({ streams: [], subtitles: "" });
    }
}


// async function extractStreamUrl(url) {
//     try {
//         const match = url.match(/(movie|tv|anime)\/(.+)/);
//         if (!match) throw new Error('Invalid URL format');
//         const [, type, path] = match;

//         let streams = [];
//         let subtitles = "";

//         // --- Lunar Anime ---
//         const fetchLunarAnime = async () => {
//             try {
//                 if (type === 'anime') {
//                     const [anilistId, episodeNumber] = path.split('/');
                    
//                     // const hosts = ['zaza', 'miko', 'animez', 'hd-1', 'hd-2', 'hd-3', 'shiro'];
//                     const types = ['sub', 'dub'];
                    
//                     // const headers = {
//                     //     'Referer': 'https://vidnest.fun/',
//                     //     'Origin': 'https://vidnest.fun'
//                     // };

//                     const apiUrl = `https://2ndprovider.lunaranime.ru/vermillion/episodes?id=${anilistId}`;
//                     const response = await soraFetch(apiUrl);
//                     const data = await response.json();

//                     const sources = data.data.episodes;

//                     console.log(sources);

//                     let requests = [];
//                     let subtitleUrls = [];

//                     for (const source of sources) {
//                         console.log(source);

//                         const providerId = source.providerId;
//                         const episode = source.episodes.find(e => e.number === Number(episodeNumber));

//                         if (!episode) {
//                             console.warn(`Episode ${episodeNumber} not found for provider ${providerId}`);
//                             continue; // skip this provider
//                         }

//                         console.log(episode);

//                         if (episode.hasDub) {
//                             const subStreamProviderUrl = `https://2ndprovider.lunaranime.ru/vermillion/sources?id=${anilistId}&provider=${providerId}&epId=${episode.id}&epNum=${episode.number}&subType=sub`;
//                             const dubStreamProviderUrl = `https://2ndprovider.lunaranime.ru/vermillion/sources?id=${anilistId}&provider=${providerId}&epId=${episode.id}&epNum=${episode.number}&subType=dub`;
                        
//                             for (const type of types) {
//                                 const streamProviderUrl = type === 'sub' ? subStreamProviderUrl : dubStreamProviderUrl;
//                                 const response = await soraFetch(streamProviderUrl);
//                                 const data = await response.json();
                                
//                                 const sources = data.data.sources;
                                
//                                 requests.push(

//                                 )
//                             }
//                         } else {
//                             const subStreamProviderUrl = `https://2ndprovider.lunaranime.ru/vermillion/sources?id=${anilistId}&provider=${providerId}&epId=${episode.id}&epNum=${episode.number}&subType=sub`;
//                             const response = await soraFetch(subStreamProviderUrl);
//                             const data = await response.json();

//                             const sources = data.data.sources;
//                         }
//                     }

//                     // // Build all requests
//                     // const requests = [];
//                     // let subtitleUrls = [];

//                     // for (const host of hosts) {
//                     //     const hostTitle = 
//                     //         host === 'miko' ? 'Aniwave' : 
//                     //         host === 'zaza' ? 'Animepahe' : 
//                     //         host === 'shiro' ? 'AniZone' : 
//                     //         host === 'animez' ? 'AnimeZ' : 
//                     //         'Zoro';

//                     //     for (const type of types) {
//                     //         if (type === 'dub' && host === 'animez') continue;
//                     //         const url = `https://backend.xaiby.sbs/sources?id=${anilistId}&ep=${episodeNumber}&host=${host}&type=${type}`;
//                     //         requests.push(
//                     //             soraFetch(url, { headers })
//                     //                 .then(res => res.json())
//                     //                 .then(data => {
//                     //                     if (!data?.sources?.url) return null;

//                     //                     let subs = [];

//                     //                     if (data.sources?.subtitles && Array.isArray(data.sources?.subtitles)) {
//                     //                         subs = data.sources.subtitles;
//                     //                     } else if (data.sources?.tracks && Array.isArray(data.sources?.tracks)) {
//                     //                         subs = data.sources.tracks;
//                     //                     } else if (Array.isArray(data.subtitles)) {
//                     //                         subs = data.subtitles;
//                     //                     }

//                     //                     // Find the first English .vtt that is not a thumbnail
//                     //                     const found = subs.find(s =>
//                     //                         typeof (s.url || s.file) === "string" &&
//                     //                         /\.vtt$/i.test(s.url || s.file) &&
//                     //                         !/thumbnails\.vtt$/i.test(s.url || s.file) &&
//                     //                         (s.lang || s.label || "").toLowerCase().includes("english")
//                     //                     );

//                     //                     if (found) {
//                     //                         subtitleUrls = found.url || found.file;
//                     //                     }

//                     //                     const streamUrl = host === 'miko' ? data.sources.url
//                     //                         : host === "animez" ? data.sources.url
//                     //                         : `https://proxy-2.madaraverse.online/proxy?url=${encodeURIComponent(data.sources.url)}`;

//                     //                     return {
//                     //                         title: `${hostTitle} - ${host.toUpperCase()} - ${type.toUpperCase()}`,
//                     //                         streamUrl,
//                     //                         headers: { Referer: data.sources?.headers?.Referer || 'https://vidnest.fun/' }
//                     //                     };
//                     //                 })
//                     //                 .catch(() => null)
//                     //         );
//                     //     }
//                     // }

//                     // const results = await Promise.all(requests);

//                     // return {
//                     //     streams: results.filter(Boolean),
//                     //     subtitles: subtitleUrls
//                     // };

//                     // const results = await Promise.all(requests);
//                     // return results.filter(Boolean);
//                 }
//             } catch (e) {
//                 console.log("Vidnest Anime stream extraction failed silently:", e);
//                 return [];
//             }
//         };

//         // Run all fetches in parallel
//         const [
//             vidnestAnimeResult,
//         ] = await Promise.allSettled([
//             fetchLunarAnime()
//         ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

//         // Collect streams from all sources
//         streams.push(...((vidnestAnimeResult?.streams) || []));

//         if (vidnestAnimeResult?.subtitles?.length) {
//             subtitles = vidnestAnimeResult.subtitles;
//         }

//         // if (subtitleUrl) {
//         //     subtitles = subtitleUrl;
//         // }

//         const result = { streams, subtitles };
//         console.log('Result: ' + JSON.stringify(result));
//         return JSON.stringify(result);
//     } catch (error) {
//         console.log('Fetch error in extractStreamUrl:', error);
//         return JSON.stringify({ streams: [], subtitles: "" });
//     }
// }

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
