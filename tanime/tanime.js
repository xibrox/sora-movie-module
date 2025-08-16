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
// extractStreamUrl("https://tanime.tv/api/servers/one-punch-man-63?ep=1501");

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
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const response = await soraFetch(url);
        const data = await response.json();

        const servers = data.results.map(server => ({
            type: server.type,
            data_id: server.data_id,
            server_id: server.server_id,
            serverName: server.serverName,
        }));

        console.log(servers);

        const matchEpisodeNumber = url.match(/ep=(\d+)/);
        const episodeNumber = matchEpisodeNumber ? matchEpisodeNumber[1] : null;

        const headers = {
            "Referer": "https://tanime.tv/",
        }

        const responseVidwish = await soraFetch(`https://vidwish.live/stream/s-2/${episodeNumber}/sub`, { headers });
        const dataVidwish = await responseVidwish.text();

        console.log(dataVidwish);

        if (!dataVidwish) throw new Error('Data Vidwish not found');

        const idVidwish = dataVidwish.match(/data-id="(\d+)"/)[1];

        console.log(idVidwish);

        const finalUrl = `https://vidwish.live/stream/getSources?id=${idVidwish}&id=${idVidwish}`;
        console.log("Final URL:", finalUrl);
        const finalResponse = await soraFetch(finalUrl, { headers });
        const finalData = await finalResponse.json();
        console.error("Final Data:", finalData);

        let streams = [
            {
                title: "HD-4 - SUB",
                streamUrl: finalData.sources?.file ?? "",
                headers: {
                    "Referer": "https://vidwish.live/",
                    "Origin": "https://vidwish.live"
                }
            }
        ];

        const responseVidwishDub = await soraFetch(`https://vidwish.live/stream/s-2/${episodeNumber}/dub`, { headers });
        const dataVidwishDub = await responseVidwishDub.text();

        console.log(dataVidwishDub);

        if (!dataVidwishDub) throw new Error('Data Vidwish not found');

        const idVidwishDub = dataVidwishDub.match(/data-id="(\d+)"/)[1];

        console.log(idVidwishDub);

        const finalUrlDub = `https://vidwish.live/stream/getSources?id=${idVidwishDub}&id=${idVidwishDub}`;
        console.log("Final URL:", finalUrlDub);
        const finalResponseDub = await soraFetch(finalUrlDub, { headers });
        const finalDataDub = await finalResponseDub.json();
        console.error("Final Data:", finalDataDub);

        streams.push({
            title: "HD-4 - DUB",
            streamUrl: finalDataDub.sources?.file ?? "",
            headers: {
                "Referer": "https://vidwish.live/",
                "Origin": "https://vidwish.live"
            }
        });
        
        const subs = finalData.tracks?.find(track => track.label.includes("English") && track.kind === "captions")?.file ?? "";

        const subtitles = `https://headers-checker.vercel.app/api/fetch?url=${subs}&referer=https://vidwish.live/&origin=https://vidwish.live`

        // const responseMegaplay = await soraFetch(`https://megaplay.buzz/stream/s-2/${episodeNumber}/sub`, { headers });
        // const dataMegaplay = await responseMegaplay.text();

        // console.log(dataMegaplay);

        // if (!dataMegaplay) throw new Error('Data Megaplay not found');

        // const idMegaplay = dataMegaplay.match(/data-id="(\d+)"/)[1];

        // console.log(idMegaplay);

        // const finalUrlMegaplay = `https://megaplay.buzz/stream/getSources?id=${idMegaplay}&id=${idMegaplay}`;
        // console.log("Final URL:", finalUrlMegaplay);
        // const finalResponseMegaplay = await soraFetch(finalUrlMegaplay, { headers });
        // const finalDataMegaplay = await finalResponseMegaplay.json();
        // console.error("Final Data:", finalDataMegaplay);

        // let streams = [
        //     {
        //         title: "HD-1",
        //         streamUrl: finalDataMegaplay.sources?.file ?? "",
        //         headers: {}
        //     }
        // ];
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

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}
