async function searchResults(keyword) {
	try {
		const encodedKeyword = encodeURIComponent(keyword);

		const responseText = await soraFetch(`https://rezka.ag/search/?do=search&subaction=search&q=${encodedKeyword}`);
		const data = await responseText.text();

		const transformedResults = [];

		// Match each result block
		const blockRegex = /<div class="b-content__inline_item"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
		let blockMatch;

		while ((blockMatch = blockRegex.exec(data)) !== null) {
			const block = blockMatch[1];

			// Extract href, image, title, and extra info
			const hrefMatch = block.match(/<a\s+href="([^"]+)"/i);
			const imgMatch = block.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i);
			const titleMatch = block.match(/<div class="b-content__inline_item-link">\s*<a[^>]*>([^<]+)<\/a>/i);
			// const infoMatch = block.match(/<div class="b-content__inline_item-link">[\s\S]*?<div>([^<]+)<\/div>/i);

			if (hrefMatch && imgMatch && titleMatch) {
				transformedResults.push({
					href: hrefMatch[1],
					image: imgMatch[1],
					title: titleMatch[1].trim(),
					// alt: imgMatch[2].trim(),
					// info: infoMatch ? infoMatch[1].trim() : ""
				});
			}
		}

		if (transformedResults.length === 0) {
			console.log("No results found");
			return JSON.stringify([]);
		}

		console.log("Transformed results:", transformedResults);
		return JSON.stringify(transformedResults);
	} catch (error) {
		console.log("Fetch error:", error);
		return JSON.stringify([{ title: "Error", image: "", href: "" }]);
	}
}

// searchResults("никто");
// extractDetails("https://rezka.ag/films/action/36523-nikto-2021-latest.html");
// extractEpisodes("https://rezka.ag/films/action/36523-nikto-2021-latest.html");

// searchResults("в одиночку");
// extractDetails("https://rezka.ag/animation/adventures/65738-podnyatie-urovnya-v-odinochku-tv-1-2024.html");
// extractEpisodes("https://rezka.ag/animation/adventures/65738-podnyatie-urovnya-v-odinochku-tv-1-2024.html");
extractStreamUrl("https://rezka.ag/animation/adventures/65738-podnyatie-urovnya-v-odinochku-tv-1-2024.html|12");
async function extractDetails(url) {
	try {
		const response = await soraFetch(url);
		const data = (await response.text) ? await response.text() : response;

		// --- Description ---
		const descriptionMatch = data.match(
			/<div class="b-post__description_text">([\s\S]*?)<\/div>/
		);
		let description = descriptionMatch
			? descriptionMatch[1].trim()
			: "No description available";

		// Strip tags and clean spaces
		description = description
			.replace(/<[^>]+>/g, "")
			.replace(/\s+/g, " ")
			.trim();

		// --- Aliases (original title) ---
		const aliasMatch = data.match(
			/<div class="b-post__origtitle"[^>]*>([^<]+)<\/div>/
		);

		// --- Airdate (grab full <td> content including year) ---
		const airdateMatch = data.match(
			/<h2>Дата выхода<\/h2>\s*:\s*<\/td>\s*<td>([\s\S]*?)<\/td>/
		);

		let airdate = "Aired: Unknown";
		if (airdateMatch) {
			airdate = airdateMatch[1]
				.replace(/<[^>]+>/g, "") // remove <a> etc.
				.replace(/\s+/g, " ")
				.trim();
			airdate = `Aired: ${airdate}`;
		}

		const transformedResults = [
			{
				description: description,
				aliases: aliasMatch
					? `Aliases: ${aliasMatch[1]}`
					: "Aliases: Unknown",
				airdate: airdate,
			},
		];

		console.log("Transformed results:", transformedResults);
		return JSON.stringify(transformedResults);
	} catch (error) {
		console.log("Details error:", error);
		return JSON.stringify([
			{
				description: "Error loading description",
				aliases: "Aliases: Unknown",
				airdate: "Aired: Unknown",
			},
		]);
	}
}

async function extractEpisodes(url) {
	try {
		if (url.includes("films")) {
			return JSON.stringify([{
				href: url,
				number: 1,
			}]);
		} else {
			const response = await soraFetch(url);
			const data = await response.text();

			const episodeRegex =
				/<li class="b-simple_episode__item[^"]*"[^>]*data-episode_id="(\d+)"[^>]*>([^<]+)<\/li>/g;

			const episodes = [];
			let match;
			while ((match = episodeRegex.exec(data)) !== null) {
				const episodeId = match[1];
				const episodeLabel = match[2].trim();

				episodes.push({
					href: `${url}|${episodeId}`,
					number: parseInt(episodeId, 10),
					title: episodeLabel,
				});
			}

			console.log("Extracted episodes:", episodes);
			return JSON.stringify(episodes);
		}
	} catch (error) {
		console.error("Fetch error:", error);
		return [];
	}
}

async function extractStreamUrl(url) {
	const [hdrezkaUrl, episodeNumber] = url.split("|");

	console.log("hdrezkaUrl: " + hdrezkaUrl);
	console.log("episodeNumber: " + episodeNumber);

	try {
		if (hdrezkaUrl.includes("films")) {
			const streams = await networkFetch(hdrezkaUrl, 30, {}, ".mp4");
			// const subtitles2 = await networkFetch(hdrezkaUrl, 30, {}, ".vtt");

			console.log("Vidnest.fun streams: " + JSON.stringify(streams));
			console.log("Vidnest.fun streams: " + streams.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.m3u8')));

			// console.log("Vidnest.fun subtitles: " + JSON.stringify(subtitles2));
			// console.log("Vidnest.fun subtitles: " + subtitles2.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.vtt')));

			if (streams.requests && streams.requests.length > 0) {
				const streamUrl = streams.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.m3u8')) || "";
				// const subtitles = subtitles2.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.vtt')) || "";

				const results = {
					streams: [{
						title: "Stream",
						streamUrl,
						headers: {
							"Referer": "https://rezka.ag/"
						},
					}],
					subtitles: ""
				}

				return JSON.stringify(results);
			} else {
				return "";
			}
		} else {
			const response = await soraFetch(hdrezkaUrl);
			const data = await response.text();

			const translatorRegex =
				/<li[^>]*data-translator_id="(\d+)"[^>]*>([^<]+)<\/li>/g;

			const translators = [];
			let match;
			while ((match = translatorRegex.exec(data)) !== null) {
				translators.push({
					id: parseInt(match[1], 10),
					name: match[2].trim(),
				});
			}

			for (const translator of translators) {
				const streams = await networkFetch(
					`${hdrezkaUrl}#t:${translator.id}-s:1-e:${episodeNumber}`,
					30,
					{},
					".m3u8"
				);

				console.log("Vidnest.fun streams: " + JSON.stringify(streams));
				console.log("Vidnest.fun streams: " + streams.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.m3u8')));

				if (streams.requests && streams.requests.length > 0) {
					const streamUrl = streams.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.m3u8')) || "";
					// const subtitles = subtitles2.requests.find(hdrezkaUrl => hdrezkaUrl.includes('.vtt')) || "";

					const results = {
						streams: [{
							title: "Stream",
							streamUrl,
							headers: {
								"Referer": "https://rezka.ag/"
							},
						}],
						subtitles: ""
					}

					return JSON.stringify(results);
				} else {
					return "";
				}
			}
		}

		// const [urlPart, hrefPart] = url.split("|");

		// console.log("Extracting stream HREF from:", hrefPart);

		// const [type, season, episode, episodeId] = hrefPart.split("/");

		// const response = await soraFetch(urlPart);
		// const data = (await response.text) ? await response.text() : response;

		// /*
		// <div class="player-drop visible full-text">                    
		// 	<iframe class="ifram"  src="//api.embess.ws/embed/kp/409013?host=gidonline.eu" frameborder="0" scrolling="no" allowfullscreen></iframe>
		// </div>
		// <div class="player-drop full-text">
		// 	<iframe class="ifram"  src="https://alias-as.newplayjj.com:9443/?kp=409013&token=8807810e75729de3e392f0718a5cc4" frameborder="0" scrolling="no" allowfullscreen></iframe>
		// </div>
		// */
		// // get iframe srcs
		// const iframeSrcs = [];
		// const regex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/g;
		// let match;
		// while ((match = regex.exec(data)) !== null) {
		// // if starts with // add https:
		// if (match[1].startsWith("//")) {
		// 	iframeSrcs.push("https:" + match[1]);
		// } else {
		// 	iframeSrcs.push(match[1]);
		// }
		// }

		// console.log("Extracted iframe sources:", iframeSrcs);

		// // get source
		// /*
		// <script data-name="mk">
		// 	makePlayer({
		// 	blocked: false ,
		// 	title: "Тачки 2",
		// 	id: 379510 ,
		// 	poster: "https://img.imgilall.me/movies/video/3/7/9/5/1/0/0/0/0/0/800x450_379510.jpg?t=1620651113",
		// 	source: {
		// 		dash: "https://hye1eaipby4w.xh8007l.ws/05_21/08/09/V57G5U2X/737653.mpd?ha=37c4dea0d12feaa&hc=cef2458fd0a2d27&hi=011dad3d853b16c&ht=2a7d497c50a569b&hu=c1eb6a8c21e0655&hui=090a21bcb25a090&t=1755731396",
		// 		hls: "https://hye1eaipby4w.xh8007l.ws/05_08_21/05/08/04/TVSJPCAP/FJZTYPPO.mp4/master.m3u8?ha=37c4dea0d12feaa&hc=cef2458fd0a2d27&hi=011dad3d853b16c&ht=2a7d497c50a569b&hu=c1eb6a8c21e0655&hui=f77c86d763c0f49&t=1755731396",
		// 		audio: {"names":["Рус. Дублированный","Укр. Дубльований","delete","delete","delete","delete","Eng.Original","delete"],"order":[0,1,2,3,4,5,6,7]},
		// 		cc: []

		// 	},
		// 	sections: [],
		// 	qualityByWidth: {"1080":1920,"480":864,"720":1280},
		// 	p2p: {
		// 		geo: ["DE","","AS3320"],
		// 		tolerance:  4 ,
		// 		tracker: "wss://t5.zcvh.net/v1/ws",
		// 		longDownload: 300 * 1000
		// 	}
		// 	});

		// 	var videoKey = 737653 ;
		// </script>
		// */

		// const streams = {};

		// for (const iframeSrc of iframeSrcs) {
		// if (!iframeSrc.startsWith("https://api.embess.ws/embed/")) continue;

		// const iframeResponse = await soraFetch(iframeSrc);
		// const iframeData = await iframeResponse.text();

		// // Try extracting seasons JSON array first
		// const seasonsJsonMatch = iframeData.match(/\[{"season":.*}\]/s);

		// if (seasonsJsonMatch) {
		// 	let seasonsArray;
		// 	try {
		// 	seasonsArray = JSON.parse(seasonsJsonMatch[0]);
		// 	} catch (e) {
		// 	console.error("Failed to parse seasons JSON:", e);
		// 	continue;
		// 	}

		// 	// Collect all episodes for all seasons as TV show episodes
		// 	for (const seasonObj of seasonsArray) {
		// 	if (!seasonObj.episodes || !Array.isArray(seasonObj.episodes)) continue;
		// 	const seasonNum = seasonObj.season;

		// 	// console.log("Season number:", seasonNum);
		// 	// console.log("Season:", season);

		// 	const neededSeason = String(seasonNum) === String(season);
		// 	if (!neededSeason) continue;
			
		// 	console.log("Season", neededSeason);

		// 	for (const ep of seasonObj.episodes) {
		// 		const epNum = ep.episode;

		// 		const neededEpisode = String(epNum) === String(episode);
		// 		if (!neededEpisode) continue;

		// 		console.log("Episode:", neededEpisode);

		// 		console.log("season object", seasonObj);

		// 		if (!global.transformedStreams) global.transformedStreams = [];

		// 		global.transformedStreams.push({
		// 		title: ep.title,
		// 		streamUrl: ep.hls,
		// 		headers: {
		// 			"Referer": "https://gidonline.eu/",
		// 			"Origin": "https://gidonline.eu",
		// 			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0",
		// 		}
		// 		});

		// 		console.log("global.transformedStreams:", global.transformedStreams);
		// 	}
		// 	}
		// } else {
		// 	const hostName = iframeSrc.match(/https?:\/\/([^/]+)/)[1];

		// 	try {
		// 	const scriptMatch = data.match(
		// 		/makePlayer\(\{[\s\S]*?source:\s*{[\s\S]*?hls:\s*"([^"]+)"[\s\S]*?}\s*\}\);/
		// 	);
		// 	if (scriptMatch) {
		// 		const hlsUrl = scriptMatch[1];
		// 		streams[hostName] = hlsUrl;
		// 		// Push directly to transformedStreams array
		// 		if (!global.transformedStreams) global.transformedStreams = [];

		// 		global.transformedStreams.push({
		// 		title: hostName,
		// 		streamUrl: hlsUrl,
		// 		headers: {
		// 			"Referer": "https://gidonline.eu/",
		// 			"Origin": "https://gidonline.eu",
		// 			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0",
		// 		}
		// 		});
		// 	}
		// 	} catch (error) {
		// 	console.log("Error extracting video hls:", error);
		// 	}
		// }
		// }

		// // Use global.transformedStreams if available, otherwise fallback to empty array
		// const transformedStreams = global.transformedStreams || [];

		// const transformedResults = {
		// streams: transformedStreams,
		// subtitles: "",
		// };

		// console.log(transformedResults);
		// return JSON.stringify(transformedResults);
	} catch (error) {
		console.log("Error extracting stream URLs:", error);
		return null;
	}
}

// console.log(await extractStreamUrl("https://gidonline.eu/1781-tachki2.html"));

/** Fetch function that tries to use a custom fetch implementation first,
 * and falls back to the native fetch if it fails.
 * @param {string} url - The URL to fetch.
 * @param {Object} options - The options for the fetch request.
 * @returns {Promise<Response|null>} - The response object or null if an error occurs.
 * @note This function is designed to provide Node.js compatibility
 */
async function soraFetch(
  url,
  options = { headers: {}, method: "GET", body: null }
) {
  try {
    return await fetchv2(
      url,
      options.headers ?? {},
      options.method ?? "GET",
      options.body ?? null
    );
  } catch (e) {
    try {
      return await fetch(url, options);
    } catch (error) {
      await console.log("soraFetch error: " + error.message);
      return null;
    }
  }
}
