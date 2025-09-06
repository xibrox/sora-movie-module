async function searchResults(keyword) {
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

async function extractDetails(url) {
    const transformedResults = [{
        description: '',
        aliases: '',
        airdate: ''
    }];

    console.log(`Details: ${JSON.stringify(transformedResults)}`);
    return JSON.stringify(transformedResults);
}

async function extractEpisodes(url) {
    const response = await soraFetch(url);
    const data = await response.json();

    const transformedResults = data.children
        .filter(result => result.type === "file" && result.file_type === "video/mp4")
        .map((result, index) => ({
            href: `${result.path}`,
            number: index + 1,
            title: result.name
        }));

    console.log(`Episodes: ${JSON.stringify(transformedResults)}`);
    return JSON.stringify(transformedResults);
}

async function extractStreamUrl(url) {
    return `https://pixeldrain.com/api/filesystem/${encodeURIComponent(url)}`;
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
