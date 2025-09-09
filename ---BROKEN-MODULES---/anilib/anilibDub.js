async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const apiUrl = `https://api.cdnlibs.org/api/anime?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&q=${encodedKeyword}`;

        const responseText = await fetchv2(apiUrl);
        const data = await responseText.json();

        const transformedResults = data.data.map(result => {
            return {
                title: result.rus_name || result.eng_name || result.name,
                image: `https://headers-checker.vercel.app/api/fetch?url=${result.cover.default}&referer=https://animelib.org/&origin=https://animelib.org`,
                href: `https://api.cdnlibs.org/api/anime/${result.slug_url}?fields[]=background&fields[]=eng_name&fields[]=otherNames&fields[]=summary&fields[]=releaseDate&fields[]=type_id&fields[]=caution&fields[]=views&fields[]=close_view&fields[]=rate_avg&fields[]=rate&fields[]=genres&fields[]=tags&fields[]=teams&fields[]=user&fields[]=franchise&fields[]=authors&fields[]=publisher&fields[]=userRating&fields[]=moderated&fields[]=metadata&fields[]=metadata.count&fields[]=metadata.close_comments&fields[]=anime_status_id&fields[]=time&fields[]=episodes&fields[]=episodes_count&fields[]=episodesSchedule&fields[]=shiki_rate`
            };
        });

        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const responseText = await fetchv2(url);
        const animeData = await responseText.json();

        const data = animeData.data;

        const transformedResults = [{
            description: data.summary || 'Без описания',
            aliases: `Длительность: ${data.time.formated}` || 'Без длительности',
            airdate: `Дата выхода: ${data.releaseDateString ? data.releaseDateString : 'Без даты'}`,
        }];

        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
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
        const responseText2 = await fetchv2(url);
        const data2 = await responseText2.json();

        const slug_url = data2.data.slug_url;

        console.log(slug_url);

        // let teamIds = [];

        // for (const team of data.data.teams) {
        //     // https://animelib.org/ru/anime/24205--kaoru-hana-wa-rin-to-saku-anime/watch?episode=132354&player=Kodik&team=64748&translation_type=2
        
        //     teamIds.push(team.id);
        // }

        // console.log(teamIds);

        const responseText = await fetchv2(`https://api.cdnlibs.org/api/episodes?anime_id=${slug_url}`);
        const data = await responseText.json();

        console.log(JSON.stringify(data.data));

        const transformedResults = data.data.map(result => {
            return {
                href: `https://animelib.org/ru/anime/${slug_url}/watch?episode=${result.id}`,
                number: result.item_number
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
        // const streams = await networkFetch(url, 7, {}, ".m3u8");

        // const streams = await networkFetchWithWaitAndClick(
        //     url,
        //     ["#main-box"],           // Wait for this
        //     ["#main-box"],           // Click this
        //     { timeoutSeconds: 10 }
        // )

        // const streams = await networkFetch(url, {
        //     clickSelectors: [".pb_mj"],      // Then click these
        //     waitForSelectors: [".pb_mj"],
        // }, ".m3u8");

        const streams = await networkFetch(url, {
            timeoutSeconds: 5,
            clickSelectors: [".m6_hk"],
            waitForSelectors: [".m6_hk"],
            maxWaitTime: 3
        }, ".m3u8");

        console.log("Vidnest.fun streams: " + JSON.stringify(streams));
        console.log("Vidnest.fun streams: " + streams.requests.find(url => url.includes('.m3u8')));

        // const animePlayers = data.data.players;

        // const studioBand = animePlayers.find(player => player.team.name === "Дубляжная" && player.player === "Animelib" && player.translation_type.label === "Озвучка");

        // const highestResStream = studioBand.video.quality.reduce((prev, curr) => {
        //     return curr.quality > prev.quality ? curr : prev;
        // });

        // const hlsSource = `https://video2.cdnlibs.org${highestResStream.href}`;

        // console.log(hlsSource);
        // return hlsSource;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}