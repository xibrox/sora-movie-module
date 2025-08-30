/** Sora Module Template
 * This template is designed to help you create a module for Sora.
 * It includes functions for searching, extracting details, episodes, and stream URLs.
 * You can modify these functions to suit your needs.
 *
 * For more information, visit the Sora documentation at https://sora.jm26.net/docs
 */

/** searchResults
 * Searches for shows/shows/movies based on a keyword.
 * @param {string} keyword - The search keyword.
 * @returns {Promise<string>} - A JSON string of search results.
 */

async function searchResults(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const responseText = await soraFetch(`https://gidonline.eu/index.php?do=search`, {
      method: "POST",
      headers: headers,
      body: `story=${encodedKeyword}&do=search&subaction=search`,
    });

    const data = (await responseText.text)
      ? await responseText.text()
      : responseText;

    const transformedResults = [];

    // Match each <div class="mainlink">...</div> block
    const blockRegex = /<div class="mainlink">([\s\S]*?)<\/div>\s*<\/div>/gi;
    let blockMatch;

    while ((blockMatch = blockRegex.exec(data)) !== null) {
      const block = blockMatch[1];

      // Extract href, image src, and title from inside the block
      const itemRegex =
        /<a\s+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i;

      const itemMatch = block.match(itemRegex);
      if (itemMatch) {
        transformedResults.push({
          href: itemMatch[1].startsWith("http")
            ? itemMatch[1]
            : "https://gidonline.eu" + itemMatch[1],
          image: itemMatch[2].startsWith("http")
            ? itemMatch[2]
            : "https://gidonline.eu" + itemMatch[2],
          title: itemMatch[3].trim(),
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

// searchResults("breaking bad");

// extractDetails("https://gidonline.eu/5658-serial-vo-vse-tyazhkie.html");
// extractEpisodes("https://gidonline.eu/5658-serial-vo-vse-tyazhkie.html");
extractStreamUrl("https://gidonline.eu/5658-serial-vo-vse-tyazhkie.html|tv/1/1/778074");

// extractDetails("https://gidonline.eu/5347-put-vo-vse-tyazhkie.html");
// extractEpisodes("https://gidonline.eu/5347-put-vo-vse-tyazhkie.html");

/** extractDetails
 * Extracts details of an shows from its page URL.
 * @param {string} url - The URL of the shows page.
 * @returns {Promise<string>} - A JSON string of the shows details.
 */
async function extractDetails(url) {
  try {
    const response = await soraFetch(url);
    const data = (await response.text) ? await response.text() : response;
    const descriptionMatch = data.match(
      /<div class="infotext" itemprop="description">([\s\S]*?)<\/div>/
    );

    let description = descriptionMatch
      ? descriptionMatch[1].match(/<p>(.*?)<\/p>/)[1]
      : "No description available";
    // if there is span, remove it <span class=\"gnv\">© ГидОнлайн</span>
    description = description
      .replace(/<span class="gnv">.*?<\/span>/, "")
      .trim();

    const titleMatch = data.match(/<h1 itemprop="name">([^<]+)<\/h1>/);
    const yearMatch = data.match(
      /<div class="rl-2" itemprop="dateCreated">([^<]+)<\/div>/
    );
    const transformedResults = [
      {
        description: description,
        aliases: titleMatch ? `Aliases: ${titleMatch[1]}` : "Aliases: Unknown",
        airdate: yearMatch ? `Aired: ${yearMatch[1]}` : "Aired: Unknown",
      },
    ];
    console.log("Transformed results:", transformedResults);

    return JSON.stringify(transformedResults);
  } catch (error) {
    console.log("Details error:", error);
    return JSON.stringify([
      {
        description: "Error loading description",
        aliases: "Duration: Unknown",
        airdate: "Aired: Unknown",
      },
    ]);
  }
}

/** extractEpisodes
 * Extracts episodes of an shows from its page URL.
 * @param {string} url - The URL of the shows page.
 * @returns {Promise<string>} - A JSON string of the shows episodes.
 */
async function extractEpisodes(url) {
  try {
    const response = await soraFetch(url);
    const data = await response.text();

    console.log("Page data length:", data.length);

    // Extract all iframe srcs
    const iframeSrcs = [];
    const iframeRegex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/g;
    let match;
    while ((match = iframeRegex.exec(data)) !== null) {
      let src = match[1];
      if (src.startsWith("//")) src = "https:" + src;
      iframeSrcs.push(src);
    }
    console.log("Extracted iframe sources:", iframeSrcs);

    const allEpisodes = [];

    for (const iframeSrc of iframeSrcs) {
      if (!iframeSrc.startsWith("https://api.embess.ws/embed/")) continue;

      const iframeResponse = await soraFetch(iframeSrc);
      const iframeData = await iframeResponse.text();

      console.log("Iframe data:", iframeData);

      // Try extracting seasons JSON array first
      const seasonsJsonMatch = iframeData.match(/\[{"season":.*}\]/s);

      if (seasonsJsonMatch) {
        let seasonsArray;
        try {
          seasonsArray = JSON.parse(seasonsJsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse seasons JSON:", e);
          continue;
        }

        // Collect all episodes for all seasons as TV show episodes
        for (const seasonObj of seasonsArray) {
          if (!seasonObj.episodes || !Array.isArray(seasonObj.episodes)) continue;
          const seasonNum = seasonObj.season;

          for (const ep of seasonObj.episodes) {
            allEpisodes.push({
              href: `${url}|tv/${seasonNum}/${ep.episode}/${ep.id}`,
              number: Number(ep.episode),
              season: Number(seasonNum),
            });
          }
        }
      } else {
        // If no seasons JSON found, try to parse single movie/episode from makePlayer({...}) script block
        // This regex captures the makePlayer({...}) argument object
        const mkScriptMatch = iframeData.match(/makePlayer\((\{[\s\S]*?\})\);/);

        if (mkScriptMatch) {
          let playerData;
          try {
            playerData = JSON.parse(mkScriptMatch[1].replace(/,\s*sections:\s*\[\]/, '')); 
            // remove empty sections array that can cause JSON.parse to fail if trailing commas
          } catch (e) {
            // If JSON.parse fails because of single quotes or trailing commas, try more robust approach:
            // Use Function constructor to parse object (careful: executes code)
            try {
              playerData = Function('"use strict";return (' + mkScriptMatch[1] + ')')();
            } catch (ex) {
              console.error("Failed to parse makePlayer data:", e, ex);
              continue;
            }
          }
          if (playerData && playerData.id) {
            allEpisodes.push({
              href: `${url}|movie/1/${playerData.id}`,
              number: 1,
              season: 1
            });
          }
        } else {
          console.warn("No seasons JSON or makePlayer data found in iframe.");
        }
      }
    }

    // Then the sorting:
    allEpisodes.sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
        return a.number - b.number;
    });

    // Assign global sequential number:
    allEpisodes.forEach((episode, index) => {
        episode.globalNumber = index + 1;
    });

    console.log("Extracted episodes:", allEpisodes);
    return JSON.stringify(allEpisodes); // array of episodes with href, number, and season
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

/** extractStreamUrl
 * Extracts the stream URL of an shows episode from its page URL.
 * @param {string} url - The URL of the shows episode page.
 * @returns {Promise<string|null>} - The stream URL or null if not found.
 */
async function extractStreamUrl(url) {
  try {
    const [urlPart, hrefPart] = url.split("|");

    console.log("Extracting stream HREF from:", hrefPart);

    const [type, season, episode, episodeId] = hrefPart.split("/");

    const response = await soraFetch(urlPart);
    const data = (await response.text) ? await response.text() : response;

    /*
      <div class="player-drop visible full-text">                    
        <iframe class="ifram"  src="//api.embess.ws/embed/kp/409013?host=gidonline.eu" frameborder="0" scrolling="no" allowfullscreen></iframe>
      </div>
      <div class="player-drop full-text">
        <iframe class="ifram"  src="https://alias-as.newplayjj.com:9443/?kp=409013&token=8807810e75729de3e392f0718a5cc4" frameborder="0" scrolling="no" allowfullscreen></iframe>
      </div>
    */
    // get iframe srcs
    const iframeSrcs = [];
    const regex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/g;
    let match;
    while ((match = regex.exec(data)) !== null) {
      // if starts with // add https:
      if (match[1].startsWith("//")) {
        iframeSrcs.push("https:" + match[1]);
      } else {
        iframeSrcs.push(match[1]);
      }
    }

    console.log("Extracted iframe sources:", iframeSrcs);

    // get source
    /*
      <script data-name="mk">
        makePlayer({
          blocked: false ,
          title: "Тачки 2",
          id: 379510 ,
          poster: "https://img.imgilall.me/movies/video/3/7/9/5/1/0/0/0/0/0/800x450_379510.jpg?t=1620651113",
          source: {
            dash: "https://hye1eaipby4w.xh8007l.ws/05_21/08/09/V57G5U2X/737653.mpd?ha=37c4dea0d12feaa&hc=cef2458fd0a2d27&hi=011dad3d853b16c&ht=2a7d497c50a569b&hu=c1eb6a8c21e0655&hui=090a21bcb25a090&t=1755731396",
            hls: "https://hye1eaipby4w.xh8007l.ws/05_08_21/05/08/04/TVSJPCAP/FJZTYPPO.mp4/master.m3u8?ha=37c4dea0d12feaa&hc=cef2458fd0a2d27&hi=011dad3d853b16c&ht=2a7d497c50a569b&hu=c1eb6a8c21e0655&hui=f77c86d763c0f49&t=1755731396",
            audio: {"names":["Рус. Дублированный","Укр. Дубльований","delete","delete","delete","delete","Eng.Original","delete"],"order":[0,1,2,3,4,5,6,7]},
            cc: []

          },
          sections: [],
          qualityByWidth: {"1080":1920,"480":864,"720":1280},
          p2p: {
            geo: ["DE","","AS3320"],
            tolerance:  4 ,
            tracker: "wss://t5.zcvh.net/v1/ws",
            longDownload: 300 * 1000
          }
        });

        var videoKey = 737653 ;
      </script>
    */

    const streams = {};

    for (const iframeSrc of iframeSrcs) {
      if (!iframeSrc.startsWith("https://api.embess.ws/embed/")) continue;

      const iframeResponse = await soraFetch(iframeSrc);
      const iframeData = await iframeResponse.text();

      // Try extracting seasons JSON array first
      const seasonsJsonMatch = iframeData.match(/\[{"season":.*}\]/s);

      if (seasonsJsonMatch) {
        let seasonsArray;
        try {
          seasonsArray = JSON.parse(seasonsJsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse seasons JSON:", e);
          continue;
        }

        // Collect all episodes for all seasons as TV show episodes
        for (const seasonObj of seasonsArray) {
          if (!seasonObj.episodes || !Array.isArray(seasonObj.episodes)) continue;
          const seasonNum = seasonObj.season;

          // console.log("Season number:", seasonNum);
          // console.log("Season:", season);

          const neededSeason = String(seasonNum) === String(season);
          if (!neededSeason) continue;
          
          console.log("Season", neededSeason);

          for (const ep of seasonObj.episodes) {
            const epNum = ep.episode;

            const neededEpisode = String(epNum) === String(episode);
            if (!neededEpisode) continue;

            console.log("Episode:", neededEpisode);

            console.log("season object", seasonObj);

            if (!global.transformedStreams) global.transformedStreams = [];

            global.transformedStreams.push({
              title: ep.title,
              streamUrl: ep.hls,
              headers: {
                "Referer": "https://gidonline.eu/",
                "Origin": "https://gidonline.eu",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0",
              }
            });

            console.log("global.transformedStreams:", global.transformedStreams);
          }
        }
      } else {
        const hostName = iframeSrc.match(/https?:\/\/([^/]+)/)[1];

        try {
          const scriptMatch = data.match(
            /makePlayer\(\{[\s\S]*?source:\s*{[\s\S]*?hls:\s*"([^"]+)"[\s\S]*?}\s*\}\);/
          );
          if (scriptMatch) {
            const hlsUrl = scriptMatch[1];
            streams[hostName] = hlsUrl;
            // Push directly to transformedStreams array
            if (!global.transformedStreams) global.transformedStreams = [];

            global.transformedStreams.push({
              title: hostName,
              streamUrl: hlsUrl,
              headers: {
                "Referer": "https://gidonline.eu/",
                "Origin": "https://gidonline.eu",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0",
              }
            });
          }
        } catch (error) {
          console.log("Error extracting video hls:", error);
        }
      }
    }

    // Use global.transformedStreams if available, otherwise fallback to empty array
    const transformedStreams = global.transformedStreams || [];

    const transformedResults = {
      streams: transformedStreams,
      subtitles: "",
    };

    console.log(transformedResults);
    return JSON.stringify(transformedResults);
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
