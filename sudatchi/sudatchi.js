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

        if (keyword.startsWith('!anime') || keyword.startsWith('!a') || keyword.startsWith('!')) {
            aniData = await Anilist.getLatest({ isAdult: false });
        } else if (
            !keyword.startsWith('!trending') &&
            !keyword.startsWith('!top-rated-movie') &&
            !keyword.startsWith('!top-rated-tv') &&
            !keyword.startsWith('!popular-movie') &&
            !keyword.startsWith('!popular-tv')
        ) {
            aniData = await Anilist.search(keyword, { isAdult: false });
        }

        if (aniData?.Page?.media?.length > 0) {
            transformedResults = [
                {
                    title: "Use External Player",
                    image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/sudatchi/UseExternalPlayer.png",
                    href: ""
                },
                ...aniData.Page.media.map(result => ({
                    title: result.title.english || result.title.romaji || result.title.native || "Untitled",
                    image: result.coverImage.extraLarge || result.coverImage.large || result.coverImage.medium || "",
                    href: `https://sudatchi.com/anime/${result.id}`,
                }))
            ];
        }

        console.log("Transformed Results: " + JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const responseText = await soraFetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = await responseText.json();

        const transformedResults = [{
            description: data.description || 'No description available',
            aliases: `Duration: ${data.duration ? data.duration : "Unknown"}`,
            airdate: `Aired: ${data.startDate.day}.${data.startDate.month}.${data.startDate.year}` || 'Aired: Unknown'
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
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
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
            
        if (!match) throw new Error("Invalid URL format");
            
        const showId = match[1];
        const responseText = await soraFetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = await responseText.json();

        const transformedResults = data.episodes.map(episode => {
            return {
                href: `https://sudatchi.com/watch/${showId}/${episode.number}`,
                number: episode.number,
                title: episode.title || ""
            };
        });
        
        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/watch\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const episodeNumber = match[2];

        try {
            const episodesApiUrl = `https://sudatchi.com/api/episode/${showId}/${episodeNumber}`;

            const responseTextEpisodes = await soraFetch(episodesApiUrl);
            const episodesData = await responseTextEpisodes.json();

            const episode = episodesData?.episodes?.find(episode => String(episode.number) === episodeNumber);

            const streamApiUrl = `https://sudatchi.com/api/streams?episodeId=${episode.id}`;
            
            // const responseTextStream = await soraFetch(streamApiUrl);
            // const streamData = await responseTextStream.text();

            // console.log(streamData);



            
            // const hlsSource = `https://sudatchi.com/${streamData.url}`;

            // const responseFile = await fetch(hlsSource);
            // const fileData = await responseFile.text();

            // console.log(fileData);

            // const audioRegex = /#EXT-X-MEDIA:[^\n]*TYPE=AUDIO[^\n]*URI="(https?:\/\/[^"]+)"/;
            // const audioMatch = fileData.match(audioRegex);

            // if (audioMatch && audioMatch[1]) {
            //     const audioUrl = audioMatch[1];

            //     console.log(audioUrl);

            //     return audioUrl;
            // }

            // const subtitleTrack = episodesData.subtitlesMap["1"];

            // const result = {
            //     stream: hlsSource ? hlsSource : null,
            //     subtitles: subtitleTrack ? `https://ipfs.sudatchi.com${subtitleTrack}` : null,
            // };
            
            console.log(streamApiUrl);
            return streamApiUrl;
        } catch (err) {
            console.log(`Fetch error for show ${showId}:`, err);
        }
        
        return null;
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

// extractStreamUrl(`https://sudatchi.com/watch/167143/1`);

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
