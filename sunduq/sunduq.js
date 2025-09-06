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
            dragonballrecut: ["!dragonballrecut", "/dragonballrecut", "!dbr", "/dbr"],
            dragonballsuperultrainstinctcut: ["!dragonballsuperultrainstinctcut", "/dragonballsuperultrainstinctcut", "!dbsuic", "/dbsuic", "!dbsc", "/dbsc"],
            borucut: ["!borucut", "/borucut", "!boru", "/boru"],
            yuYuHakushoPace: ["!yuYuHakushoPace", "/yuYuHakushoPace", "!yyhp", "/yyhp", "!yhp", "/yhp"],
            blackCloverPace: ["!blackCloverPace", "/blackCloverPace", "!bcp", "/bcp"],
            onePieceTreasureEdition: ["!onePieceTreasureEdition", "/onePieceTreasureEdition", "!opte", "/opte"],
            onigashima: ["!onigashima", "/onigashima", "!oni", "/oni"],
            concentratedBleach: ["!concentratedBleach", "/concentratedBleach", "!bleach", "/bleach", "!cb", "/cb"],
            narucannon: ["!narucannon", "/narucannon", "!naru", "/naru", "!n", "/n"],
            onepace: ["!onepace", "/onepace", "!one", "/one", "!op", "/op", "!o", "/o"],
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

        // --- Dragon Ball Recut ---
        if (matchesKeyword(keyword, keywordGroups.dragonballrecut)) {
            const results = [];

            results.push({
                title: "Dragon Ball Recut",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/dragonballrecut/icon.png",
                href: "https://archive.org/details/dragon-ball-recut/"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- Dragon Ball Super Ultra Instinct Cut ---
        if (matchesKeyword(keyword, keywordGroups.dragonballsuperultrainstinctcut)) {
            const results = [];

            results.push({
                title: "Dragon Ball Super: Ultra Instinct Cut",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/dragonballsuperultrainstinctcut/icon.png",
                href: "https://archive.org/details/dragon-ball-super-ultra-instinct-cut/"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- Borucut ---
        if (matchesKeyword(keyword, keywordGroups.borucut)) {
            const results = [];
            const response = await soraFetch(`https://sites.google.com/view/borucut`);
            const html = await response.text();

            // --- Regex patterns ---
            const arcRegex = /<span class="C9DxTc "[^>]*>([^<]*Arc)<\/span>/g;
            const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>\s*<div class="NsaAfc">\s*<p>.*?<\/p>/g;
            const imageRegex = /<img src="([^"]+)"[^>]*>/g;

            // --- Extract arcs ---
            let arcs = [];
            let match;
            while ((match = arcRegex.exec(html)) !== null) {
                arcs.push(match[1].trim());
            }

            // --- Extract links ---
            let hrefs = [];
            while ((match = linkRegex.exec(html)) !== null) {
                hrefs.push(match[1]);
            }

            // --- Extract ALL images ---
            let allImages = [];
            while ((match = imageRegex.exec(html)) !== null) {
                allImages.push(match[1]);
            }

            // 🔑 Filter images: keep only the ones that appear after arcs start
            // In your case, the "real" arc images start from index 4 onward
            let images = allImages.slice(allImages.length - arcs.length);

            // --- Zip arcs + hrefs + images together ---
            for (let i = 0; i < arcs.length; i++) {
                results.push({
                    title: arcs[i] || "",
                    href: hrefs[i] || "",
                    image: images[i] || ""
                });
            }

            for (const item of results) {
                const match = item.href.match(/q=(https[^&]+)/);
                if (match) {
                    let decoded = decodeURIComponent(match[1]);
                    decoded = decoded.replace(/pixeldrain\.com/, "pixeldrain.net");
                    item.href = decoded;
                }
            }

            console.log("Results:", results);
            return JSON.stringify(results);
        }

        // --- Yu Yu Hakusho Pace ---
        if (matchesKeyword(keyword, keywordGroups.yuYuHakushoPace)) {
            const results = [];

            results.push({
                title: "Use External Player",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/yuYuHakushoPace/UseExternalPlayer.png",
                href: ""
            });

            results.push({
                title: "Yu Yu Hakusho Pace",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/yuYuHakushoPace/icon.png",
                href: "https://pixeldrain.net/l/Ldcn42AG"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- Black Clover Pace ---
        if (matchesKeyword(keyword, keywordGroups.blackCloverPace)) {
            const results = [];

            results.push({
                title: "Black Clover Pace [SUB]",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/blackCloverPace/icon.png",
                href: "https://pixeldrain.net/l/nhfMpi4V"
            });

            results.push({
                title: "Black Clover Pace [DUB]",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/blackCloverPace/icon.png",
                href: "https://pixeldrain.net/l/iryu2NWQ"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- One Piece Treasure Edition ---
        if (matchesKeyword(keyword, keywordGroups.onePieceTreasureEdition)) {
            const results = [];

            results.push({
                title: "Use External Player",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/onePieceTreasureEdition/UseExternalPlayer.png",
                href: ""
            });

            results.push({
                title: "One Piece Treasure Edition",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/onePieceTreasureEdition/icon.png",
                href: "https://pixeldrain.net/l/VR7e6o5y"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- Onigashima Paced ---
        if (matchesKeyword(keyword, keywordGroups.onigashima)) {
            const results = [];

            results.push({
                title: "Onigashima Paced",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/onigashima/icon.png",
                href: "https://pixeldrain.net/l/JVMSKn7c"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- Concentrated Bleach ---
        if (matchesKeyword(keyword, keywordGroups.concentratedBleach)) {
            const responseA = await soraFetch(`https://pixeldrain.com/api/filesystem/rwPVCu7Z`);
            const jsonA = await responseA.json();

            const responseB = await soraFetch(`https://pixeldrain.com/api/filesystem/goCGsiJG`);
            const jsonB = await responseB.json();

            const dirsA = jsonA.children
                .filter(item => item.type === "dir")
                .map(item => ({
                    title: item.name,
                    image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/concentratedBleach/image.jpg",
                    href: `https://pixeldrain.com/api/filesystem/${encodeURIComponent(item.path)}`
                }));

            const dirsB = jsonB.children
                .filter(item => item.type === "dir")
                .map(item => ({
                    title: item.name,
                    image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/concentratedBleach/image.jpg",
                    href: `https://pixeldrain.com/api/filesystem/${encodeURIComponent(item.path)}`
                }));

            const results = [...dirsA, ...dirsB];

            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- Narucannon ---
        if (matchesKeyword(keyword, keywordGroups.narucannon)) {
            const results = [];

            results.push({
                title: "Use External Player",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/sunduq/UseExternalPlayer.png",
                href: ""
            });

            results.push({
                title: "Narucannon Subbed",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/narucannon/icon.png",
                href: "https://pixeldrain.net/l/dX3cF5Q3"
            });

            results.push({
                title: "Narucannon Dubbed",
                image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/narucannon/icon.png",
                href: "https://pixeldrain.net/l/tqeCisSm"
            });
            
            console.log(`Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

        // --- One Pace Section ---
        if (matchesKeyword(keyword, keywordGroups.onepace)) {
            const results = [];
            const response = await soraFetch(`https://onepace.net/en/watch`);
            const html = await response.text();

            // Extract filter term after the command
            const parts = keyword.split(" ");
            let filter = parts.slice(1).join(" ").toLowerCase(); // everything after "/op"
            if (!filter) filter = ""; // default empty

            // images + arcSections same as before...
            const allImages = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g)].map(m => m[1])
                .concat([...html.matchAll(/background-image:\s*url\(['"]([^'"]+)['"]\)/g)].map(m => m[1]));
            const arcSections = html.split('<h2');

            for (let i = 1; i < arcSections.length; i++) {
                const currentSection = arcSections[i];
                const titleMatch = currentSection.match(/>([^<]+)<\/a>/);
                if (!titleMatch) continue;
                let arcTitle = titleMatch[1].trim()
                    .replace(/&#x27;/g, "'")
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"');

                let arcImage = '';
                if (allImages[i]) {
                    arcImage = allImages[i].replace(/&amp;/g, '&');
                    if (arcImage.startsWith('/_next')) {
                        arcImage = 'https://onepace.net' + arcImage;
                    }
                }
                if (i === arcSections.length - 1 && allImages[0]) {
                    arcImage = allImages[0].replace(/&amp;/g, '&');
                    if (arcImage.startsWith('/_next')) {
                        arcImage = 'https://onepace.net' + arcImage;
                    }
                }

                const episodeBlocks = currentSection.split('<span class="flex-1">');
                for (let j = 1; j < episodeBlocks.length; j++) {
                    const block = episodeBlocks[j];
                    
                    let type = '';
                    if (block.includes('English Subtitles')) {
                        type = 'English Subtitles';
                        if (block.includes('Extended')) type += ', Extended';
                        if (block.includes('Alternate')) type += ', Alternate';
                    } else if (block.includes('English Dub with Closed Captions')) {
                        type = 'English Dub with Closed Captions';
                        if (block.includes('Extended')) type += ', Extended';
                        if (block.includes('Alternate')) type += ', Alternate';
                    } else if (block.includes('English Dub')) {
                        type = 'English Dub';
                        if (block.includes('Extended')) type += ', Extended';
                        if (block.includes('Alternate')) type += ', Alternate';
                    } else {
                        continue;
                    }

                    const qualityMatches = [...block.matchAll(/>\s*(480p|720p|1080p)\s*</g)];
                    const linkMatches = [...block.matchAll(/href="(https:\/\/pixeldrain\.net\/l\/[^"]+)"/g)];

                    const qualityLinks = new Map();
                    if (qualityMatches.length > 0 && linkMatches.length > 0) {
                        const uniqueQualities = [...new Set(qualityMatches.map(m => m[1]))];
                        uniqueQualities.forEach((quality, index) => {
                            if (index < linkMatches.length) {
                                qualityLinks.set(quality, linkMatches[index][1]);
                            }
                        });
                    }

                    for (const [quality, href] of qualityLinks) {
                        const title = `${arcTitle}, ${type}, ${quality.trim()}`;
                        const titleLower = title.toLowerCase();

                        if (
                            !filter || 
                            filter === 'all' || 
                            filter === 'everything' || 
                            titleLower.includes(filter)
                        ) {
                            results.push({ title, href, image: arcImage });
                        }
                    }
                }
            }

            console.log(`One Pace Results: ${JSON.stringify(results)}`);
            return JSON.stringify(results);
        }

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
        } else if (url.includes('https://pixeldrain.net/l')) {
            const match = url.match(/https:\/\/pixeldrain\.net\/l\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
                    
            const arcId = match[1];

            const response = await soraFetch(`https://pixeldrain.net/api/list/${arcId}`);
            const data = await response.json();    

            const transformedResults = [{
                description: `Title: ${data.title}\nFile Count: ${data.file_count}`,
                aliases: `Title: ${data.title}\nFile Count: ${data.file_count}`,
                airdate: ''
            }];

            console.log(`Details: ${JSON.stringify(transformedResults)}`);
            return JSON.stringify(transformedResults);
        } else if (url.includes('https://pixeldrain.com/api/filesystem/') || url.includes('https://archive.org/')) {
            const transformedResults = [{
                description: '',
                aliases: '',
                airdate: ''
            }];

            console.log(`Details: ${JSON.stringify(transformedResults)}`);
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
        } else if (url.includes('https://pixeldrain.net/l')) {
            const match = url.match(/https:\/\/pixeldrain\.net\/l\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");
                    
            const arcId = match[1];

            const response = await soraFetch(`https://pixeldrain.net/api/list/${arcId}`);
            const data = await response.json();

            const transformedResults = data.files.map((result, index) => {
                return {
                    href: `pixeldrain/${result.id}`,
                    number: index + 1,
                };
            });

            console.log(`Episodes: ${JSON.stringify(transformedResults)}`);
            return JSON.stringify(transformedResults);
        } else if (url.includes('https://pixeldrain.com/api/filesystem/')) {
            const response = await soraFetch(url);
            const data = await response.json();

            const transformedResults = data.children
                .filter(result => result.type === "file" && result.file_type === "video/mp4")
                .map((result, index) => ({
                    href: `pixeldrain2/${result.path}`,
                    number: index + 1,
                    title: result.name
                }));

            console.log(`Episodes: ${JSON.stringify(transformedResults)}`);
            return JSON.stringify(transformedResults);
        } else if (url.includes('https://archive.org/')) {
            const responseText = await soraFetch(url);
            const html = await responseText.text();

            const regex = /playlist='(\[.*?\])'/s;
            const match = html.match(regex);

            const transformedResults = [];

            if (match) {
                try {
                    const playlist = JSON.parse(match[1]);
                    console.log(JSON.stringify(playlist));

                    for (let i = 0; i < playlist.length; i++) {
                        const episode = playlist[i];
                        console.log(`Episode ${i + 1}: ${episode.title}`);

                        transformedResults.push({
                            href: `archive/https://archive.org${episode.sources[0].file}`,
                            number: i + 1
                        });
                    }

                    console.log(JSON.stringify(transformedResults));
                    return JSON.stringify(transformedResults);
                } catch (e) {
                    console.error("JSON parse failed:", e);
                }
            }
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
        const match = url.match(/^(movie|tv|anime|pixeldrain|pixeldrain2|archive)\/([^?#]+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        let streams = [];
        let subtitles = "";

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
            const fetchRgShows = async () => {
                try {
                    let streams = [];
                    let rgShowsUrl;

                    if (type === 'movie') {
                        rgShowsUrl = `https://api.rgshows.me/main/movie/${path}`;
                    } else if (type === 'tv') {
                        const [showId, seasonNumber, episodeNumber] = path.split('/');
                        rgShowsUrl = `https://api.rgshows.me/main/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                    } else {
                        return [];
                    }

                    const headers = {
                        'Origin': 'https://www.vidsrc.wtf',
                        'Referer': 'https://www.vidsrc.wtf/'
                    };

                    // --- Main RgShows ---
                    try {
                        const rgShowsResponse = await soraFetch(rgShowsUrl, { headers });
                        const rgShowsData = await rgShowsResponse.json();

                        if (rgShowsData && rgShowsData.stream) {
                            streams.push({
                                title: `RgShows`,
                                streamUrl: rgShowsData.stream.url,
                                headers: { Referer: "https://www.vidsrc.wtf/" }
                            });
                        }
                    } catch (err) {
                        console.log("Main RgShows fetch failed:", err);
                    }

                    // --- Multi Language RgShows ---
                    if (type === 'movie') {
                        rgShowsUrl = `https://hindi.rgshows.me/movie/${path}`;
                    } else if (type === 'tv') {
                        const [showId, seasonNumber, episodeNumber] = path.split('/');
                        rgShowsUrl = `https://hindi.rgshows.me/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                    }

                    try {
                        const rgShowsLanguagesResponse = await soraFetch(rgShowsUrl, { headers });
                        const rgShowsLanguagesData = await rgShowsLanguagesResponse.json();

                        if (rgShowsLanguagesData && rgShowsLanguagesData.streams) {
                            streams = streams.concat(
                                rgShowsLanguagesData.streams.map(stream => ({
                                    title: `RgShows - ${stream.language || 'Unknown'}`,
                                    streamUrl: stream.url,
                                    headers: stream.headers || { Referer: "https://www.vidsrc.wtf/" }
                                }))
                            );
                        }
                    } catch (err) {
                        console.log("Hindi RgShows fetch failed:", err);
                    }

                    return streams;
                } catch (e) {
                    console.log('RgShows fetch failed silently:', e);
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
                vidnestStreams,
                vidzeeStreams,
                xprimeStreams,
                vixSrcStreams,
                vidapiStreams,
                rgShowsStreams,
                vidrockStreams,
                cloudStreamProStreams,
                subtitleUrl
            ] = await Promise.allSettled([
                fetchVidnest(),
                fetchVidzee(),
                fetchXPrime(),
                fetchVixSrc(),
                fetchVidapi(),
                fetchRgShows(),
                fetchVidrock(),
                fetchCloudStreamPro(),
                fetchSubtitles()
            ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

            // Collect streams from all sources
            streams.push(...(vidnestStreams || []));
            streams.push(...(vidzeeStreams || []));
            streams.push(...(xprimeStreams || []));
            streams.push(...(vixSrcStreams || []));
            streams.push(...(vidapiStreams || []));
            streams.push(...(rgShowsStreams || []));
            streams.push(...(vidrockStreams || []));
            streams.push(...(cloudStreamProStreams || []));

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
                                                title: `(Vidnest) ${hostTitle} - ${host.toUpperCase()} - ${type.toUpperCase()}`,
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

            // --- Lunar Anime ---
            // --- Anime ---
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

                            const hostTitle = 
                                providerId === 'miku' ? 'MegaCloud' : 
                                providerId === 'anya' ? 'MegaCloud' : 
                                providerId === 'lofi' ? 'StreamUP' : 
                                providerId === 'wave' ? 'Aniwave' : 
                                providerId === 'pahe' ? 'Animepahe' : 
                                providerId === 'kami' ? 'KickAssAnime' :
                                providerId === 'zone' ? 'AniZone' :
                                null;

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
                                                title: `(LUNAR) ${hostTitle ? `- ${hostTitle} - ` : ""}${providerId.toUpperCase()} - ${subType.toUpperCase()}${src.quality ? ` - ${src.quality}` : ""}`,
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
                vidnestAnimeResult,
                lunarAnimeResult,
            ] = await Promise.allSettled([
                fetchVidnestAnime(),
                fetchLunarAnime(),
            ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

            // Collect streams from all sources
            streams.push(...((vidnestAnimeResult?.streams) || []));
            streams.push(...((lunarAnimeResult?.streams) || []));

            if (vidnestAnimeResult?.subtitles?.length && vidnestAnimeResult?.subtitles) {
                subtitles = vidnestAnimeResult.subtitles;
            } else if (lunarAnimeResult?.subtitles?.length && lunarAnimeResult?.subtitles) {
                subtitles = lunarAnimeResult.subtitles;
            }
        } else if (type === 'pixeldrain') {
            streams.push({ 
                title: "PixelDrain", 
                streamUrl: `https://pixeldrain.net/api/file/${path}?download`, 
                headers: {
                    'Referer': 'https://pixeldrain.net/',
                    'Origin': 'https://pixeldrain.net'
                }
            });
        } else if (type === 'pixeldrain2') {
            streams.push({ 
                title: "PixelDrain", 
                streamUrl: `https://pixeldrain.com/api/filesystem/${encodeURIComponent(path)}`, 
                headers: {
                    'Referer': 'https://pixeldrain.com/',
                    'Origin': 'https://pixeldrain.com'
                }
            });
        } else if (type === 'archive') {
            streams.push({ 
                title: "Internet Archive", 
                streamUrl: path, 
                headers: {}
            });
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