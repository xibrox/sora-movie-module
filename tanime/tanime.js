async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);

        console.log(`https://tanime.tv/api/search?keyword=${encodedKeyword}`);

        const responseText = await soraFetch(`https://tanime.tv/api/search?keyword=${encodedKeyword}`);
        const data = await responseText.json();

        let results = data.results.data.map(result => ({
            title: result.title || result.japanese_title,
            image: result.poster,
            href: `${result.id}`
        }))
        .filter(item => item.title !== "My Matchmaking Partner Is My Student, An Aggressive Troublemaker")
        .filter(item => item.title !== "Overflow (Uncensored)")
        .filter(item => item.title !== "Overflow (TV ver.)");

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults("One punch man");
// extractDetails("one-punch-man-63");
// extractEpisodes("one-punch-man-63");
extractStreamUrl("https://tanime.tv/api/servers/one-punch-man-63?ep=1501");

// searchResults("Clannad");
// extractDetails("clannad-after-story-15");
// extractEpisodes("clannad-after-story-15");
// extractStreamUrl("https://tanime.tv/api/servers/clannad-after-story-15?ep=707");

async function extractDetails(id) {
    try {
        const response = await soraFetch(`https://tanime.tv/api/info?id=${id}`);
        const json = await response.json();

        console.log(json);
        console.log(json.results.data.animeInfo);
        
        const data = json.results.data.animeInfo;

        let description = data.Overview || 'No description available';
        description = description
            .replace(/<br\s*\/?>/gi, '\n') // Replace <br> with newlines
            .replace(/<\/?[^>]+(>|$)/g, '') // Strip any other HTML tags
            .replace(/\\n/g, '\n') // Convert escaped \n to real newlines
            .trim();

        const aliases = `
Type: ${data.tvInfo.showType}
Status: ${data.Status}
Episodes: ${data.tvInfo.eps}
Subbed Episodes: ${data.tvInfo.sub}
Dubbed Episodes: ${data.tvInfo.dub}
Duration: ${data.tvInfo.duration}
Age Rating: ${data.tvInfo.rating}
Genres: ${data.Genres.join(', ') || 'Unknown'}
        `.trim();

        const airdate = `Released: ${data.Premiered ? data.Premiered : 'Unknown'}`

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(id) {
    try {
        const response = await soraFetch(`https://tanime.tv/api/episodes/${id}`);
        const json = await response.json();

        console.log(json.results.episodes);
        
        const data = json.results.episodes;

        const episodes = data.map(episode => ({
            title: `Episode ${episode.episode_no}`,
            href: `https://tanime.tv/api/servers/${episode.id}`,
            number: episode.episode_no
        }));

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await soraFetch(url);
        const data = await response.json();

        console.log(url);

        const match = url.match(/\/api\/servers\/([a-z0-9-]+)\?ep=(\d+)/i);
        if (!match) throw new Error("Invalid URL format");

        const animeId = match[1];
        const episodeNumber = match[2];

        console.log(animeId, episodeNumber);

        const servers = data.results.map(server => ({
            type: server.type,
            data_id: server.data_id,
            server_id: server.server_id,
            serverName: server.serverName,
        }));

        console.log("Servers:", servers);

        const headers = { Referer: "https://tanime.tv/" };

        let streams = [];
        let subtitles = "";

        // fetch both streams in parallel
        const [MegacloudSubStream, MegacloudDubStream, MegacloudSubStream2, MegacloudDubStream2, VidwishSubStream, VidwishDubStream] = await Promise.all([
            fetchMegacloudStream2("sub", "HD-2 - SUB", animeId, episodeNumber, headers),
            fetchMegacloudStream2("dub", "HD-2 - DUB", animeId, episodeNumber, headers),
            fetchMegacloudStream("sub", "HD-3 - SUB", animeId, episodeNumber, headers),
            fetchMegacloudStream("dub", "HD-3 - DUB", animeId, episodeNumber, headers),
            fetchVidwishStream("sub", "HD-4 - SUB", episodeNumber, headers),
            fetchVidwishStream("dub", "HD-4 - DUB", episodeNumber, headers),
        ]);

        for (const stream of [MegacloudSubStream, MegacloudDubStream, MegacloudSubStream2, MegacloudDubStream2, VidwishSubStream, VidwishDubStream]) {
            if (!stream) continue;
            if (!stream.stream) continue;

            streams.push(stream.stream);

            if (!stream.subs) continue;
        
            if (stream.subs === MegacloudSubStream.subs) {
                subtitles = MegacloudSubStream.subs;
            } else if (stream.subs === MegacloudSubStream2.subs) {
                subtitles = MegacloudSubStream2.subs;
            } else if (stream.subs === VidwishSubStream.subs) {
                subtitles = `https://headers-checker.vercel.app/api/fetch?url=${VidwishSubStream.subs}&referer=https://vidwish.live/&origin=https://vidwish.live`;
            }
        }

        console.log("Streams:", streams);
        console.log("Subtitles:", subtitles);

        // const megaplayUrl = `https://megaplay.buzz/stream/s-2/${episodeNumber}/sub`;

        // const responseMegaplay = await soraFetch(megaplayUrl, { headers });
        // const dataMegaplay = await responseMegaplay.text();

        // console.log(dataMegaplay);

        // if (!dataMegaplay) throw new Error('Data Megaplay not found');

        // const idMegaplay = dataMegaplay.match(/data-id="(\d+)"/)[1];

        // console.log(idMegaplay);

        // const headers2 = {
        //     "X-Requested-With": "XMLHttpRequest"
        // };

        // const finalUrlMegaplay = `https://megaplay.buzz/stream/getSources?id=${idMegaplay}&id=${idMegaplay}`;
        // console.log("Final URL:", finalUrlMegaplay);
        // const finalResponseMegaplay = await soraFetch(finalUrlMegaplay, { headers2: { ...headers2, ...headers } });
        // const finalDataMegaplay = await finalResponseMegaplay.json();
        // console.error("Final Data:", finalDataMegaplay);

        // streams.push(
        //     {
        //         title: "HD-1",
        //         streamUrl: finalDataMegaplay?.sources?.file ?? "",
        //         headers: {}
        //     }
        // );
        // const subtitles = finalDataMegaplay.tracks?.find(track => track.label.includes("English") && track.kind === "captions")?.file ?? "";

        const result = {
            streams,
            subtitles
        };

        console.log(result);
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

async function fetchVidwishStream(lang, title, episodeNumber, headers) {
    const res = await soraFetch(`https://vidwish.live/stream/s-2/${episodeNumber}/${lang}`, { headers });
    const html = await res.text();

    if (!html) throw new Error(`Vidwish ${lang.toUpperCase()} data not found`);

    const idMatch = html.match(/data-id="(\d+)"/);
    if (!idMatch) throw new Error(`Vidwish ${lang.toUpperCase()} id not found`);
    const id = idMatch[1];

    console.log(`${lang.toUpperCase()} ID:`, id);

    const apiUrl = `https://vidwish.live/stream/getSources?id=${id}&id=${id}`;
    console.log(`${lang.toUpperCase()} Final URL:`, apiUrl);

    const apiRes = await soraFetch(apiUrl, { headers });
    const json = await apiRes.json();
    console.error(`${lang.toUpperCase()} Final Data:`, json);

    if (!json) return;
    if (json.error) return;

    return {
        stream: {
            title,
            streamUrl: (json?.sources && json?.sources.file) || "",
            headers: {
                Referer: "https://vidwish.live/",
                Origin: "https://vidwish.live"
            },
        },
        subs: (json?.tracks || []).find(track => track.label?.includes("English") && track?.kind === "captions")?.file || ""
    };
}

async function fetchMegacloudStream(lang, title, animeId, episodeNumber, headers) {
    const res = await soraFetch(`https://tanime.tv/api/stream?id=${animeId}?ep=${episodeNumber}&server=hd-1&type=${lang}`, { headers });
    const data = await res.json();

    if (!data) throw new Error(`MegaCloud ${lang.toUpperCase()} data not found`);

    console.log("DATA MEGACLOUD: " + data);

    const json = data.results.streamingLink;

    console.log("TRACKS MEGACLOUD: " + JSON.stringify(json?.tracks));

    if (!json) return;

    return {
        stream: {
            title,
            streamUrl: (json?.link && json?.link?.file) || "",
            headers: {
                Referer: "https://megacloud.blog/",
                Origin: "https://megacloud.blog"
            },
        },
        subs: (json?.tracks || []).find(track => track.label?.includes("English") && track?.kind === "captions")?.file || ""
    };
}

async function fetchMegacloudStream2(lang, title, animeId, episodeNumber, headers) {
    const res = await soraFetch(`https://tanime.tv/api/stream?id=${animeId}?ep=${episodeNumber}&server=hd-2&type=${lang}`, { headers });
    const data = await res.json();

    if (!data) throw new Error(`MegaCloud ${lang.toUpperCase()} data not found`);

    console.log("DATA MEGACLOUD: " + JSON.stringify(data));

    const json = data.results.streamingLink;

    console.log("TRACKS MEGACLOUD: " + JSON.stringify(json?.tracks));

    if (!json) return;

    return {
        stream: {
            title,
            streamUrl: (json?.link && json?.link?.file) || "",
            headers: {
                Referer: "https://megacloud.blog/",
                Origin: "https://megacloud.blog"
            },
        },
        subs: (json?.tracks || []).find(track => track?.label?.includes("English") && track?.kind === "captions")?.file || ""
    };
}

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
