// async function searchResults(keyword) {
//     try {
//         const encodedKeyword = encodeURIComponent(keyword);
//         const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=8d6d91941230817f7807d643736e8a49&query=${encodedKeyword}`);
//         const data = await responseText.json();

//         const transformedResults = data.results.map(result => {
//             if(result.media_type === "movie" || result.title) {
//                 return {
//                     title: result.title || result.name || result.original_title || result.original_name,
//                     image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
//                     href: `https://m-zone.org/details/movie/${result.id}`
//                 };
//             } else if(result.media_type === "tv" || result.name) {
//                 return {
//                     title: result.name || result.title || result.original_name || result.original_title,
//                     image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
//                     href: `https://m-zone.org/details/tv/${result.id}`
//                 };
//             } else {
//                 return {
//                     title: result.title || result.name || result.original_name || result.original_title || "Untitled",
//                     image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
//                     href: `https://m-zone.org/details/tv/${result.id}`
//                 };
//             }
//         });

//         console.log(transformedResults);
//         return JSON.stringify(transformedResults);
//     } catch (error) {
//         console.log('Fetch error in searchResults:', error);
//         return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
//     }
// }

// async function extractDetails(url) {
//     try {
//         if(url.includes('movie')) {
//             const match = url.match(/https:\/\/m-zone\.org\/details\/movie\/([^\/]+)/);
//             if (!match) throw new Error("Invalid URL format");

//             const movieId = match[1];
//             const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=8d6d91941230817f7807d643736e8a49`);
//             const data = await responseText.json();

//             const transformedResults = [{
//                 description: data.overview || 'No description available',
//                 aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
//                 airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
//             }];

//             console.log(transformedResults);
//             return JSON.stringify(transformedResults);
//         } else if(url.includes('tv')) {
//             const match = url.match(/https:\/\/m-zone\.org\/details\/tv\/([^\/]+)/);
//             if (!match) throw new Error("Invalid URL format");

//             const showId = match[1];
//             const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=8d6d91941230817f7807d643736e8a49`);
//             const data = await responseText.json();

//             const transformedResults = [{
//                 description: data.overview || 'No description available',
//                 aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
//                 airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
//             }];

//             console.log(transformedResults);
//             return JSON.stringify(transformedResults);
//         } else {
//             throw new Error("Invalid URL format");
//         }
//     } catch (error) {
//         console.log('Details error:', error);
//         return JSON.stringify([{
//             description: 'Error loading description',
//             aliases: 'Duration: Unknown',
//             airdate: 'Aired/Released: Unknown'
//         }]);
//     }
// }

// async function extractEpisodes(url) {
//     try {
//         if(url.includes('movie')) {
//             const match = url.match(/https:\/\/m-zone\.org\/details\/movie\/([^\/]+)/);
            
//             if (!match) throw new Error("Invalid URL format");
            
//             const movieId = match[1];
            
//             const movie = [
//                 { href: `https://m-zone.org/watch/movie/${movieId}`, number: 1, title: "Full Movie" }
//             ];

//             console.log(movie);
//             return JSON.stringify(movie);
//         } else if(url.includes('tv')) {
//             const match = url.match(/https:\/\/m-zone\.org\/details\/tv\/([^\/]+)/);
            
//             if (!match) throw new Error("Invalid URL format");
            
//             const showId = match[1];
            
//             const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=8d6d91941230817f7807d643736e8a49`);
//             const showData = await showResponseText.json();
            
//             let allEpisodes = [];
//             for (const season of showData.seasons) {
//                 const seasonNumber = season.season_number;

//                 if(seasonNumber === 0) continue;
                
//                 const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=8d6d91941230817f7807d643736e8a49`);
//                 const seasonData = await seasonResponseText.json();
                
//                 if (seasonData.episodes && seasonData.episodes.length) {
//                     const episodes = seasonData.episodes.map(episode => ({
//                         href: `https://m-zone.org/watch/tv/${showId}?season=${seasonNumber}&episode=${episode.episode_number}`,
//                         number: episode.episode_number,
//                         title: episode.name || ""
//                     }));
//                     allEpisodes = allEpisodes.concat(episodes);
//                 }
//             }
            
//             console.log(allEpisodes);
//             return JSON.stringify(allEpisodes);
//         } else {
//             throw new Error("Invalid URL format");
//         }
//     } catch (error) {
//         console.log('Fetch error in extractEpisodes:', error);
//         return JSON.stringify([]);
//     }    
// }

// async function extractStreamUrl(url) {
//     if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

//     try {
//         const match = url.match(/m-zone\.org\/watch\/(movie|tv)\/([^?]+)/);
//         if (!match) throw new Error('Invalid URL format');

//         const [, type, id] = match;

//         let embedUrl;

//         if (type === 'movie') {
//             embedUrl = `https://vidsrc.su/embed/movie/${id}`;
//         } else {
//             const seasonMatch = url.match(/season=(\d+)/);
//             const episodeMatch = url.match(/episode=(\d+)/);

//             if (!seasonMatch || !episodeMatch) throw new Error('Missing season or episode in URL');

//             const season = seasonMatch[1];
//             const episode = episodeMatch[1];

//             embedUrl = `https://vidsrc.su/embed/tv/${id}/${season}/${episode}`;
//         }

//         const data = await soraFetch(embedUrl).then(res => res.text());

//         console.log('Embed URL:', embedUrl);
//         console.log('Data:', data);

//         const urlRegex = /^(?!\s*\/\/).*url:\s*(['"])(.*?)\1/gm;
//         const subtitleRegex = /"url"\s*:\s*"([^"]+)"[^}]*"format"\s*:\s*"([^"]+)"[^}]*"encoding"\s*:\s*"([^"]+)"[^}]*"display"\s*:\s*"([^"]+)"[^}]*"language"\s*:\s*"([^"]+)"/g;

//         const streams = Array.from(data.matchAll(urlRegex), m => m[2].trim()).filter(Boolean);

//         const subtitleMatches = [];
//         let subtitleMatch;
//         while ((subtitleMatch = subtitleRegex.exec(data)) !== null) {
//             subtitleMatches.push({
//                 url: subtitleMatch[1],
//                 format: subtitleMatch[2],
//                 encoding: subtitleMatch[3],
//                 display: subtitleMatch[4],
//                 language: subtitleMatch[5]
//             });
//         }

//         const firstSubtitle = subtitleMatches.find(sub => 
//             sub.display.includes('English') && ['ASCII', 'UTF-8', 'CP1252', 'CP1250', 'CP850'].includes(sub.encoding)
//         );

//         const result = {
//             streams,
//             subtitles: firstSubtitle ? firstSubtitle.url : ""
//         };

//         console.log('Result:', result);
//         return JSON.stringify(result);
//     } catch (error) {
//         console.log('Fetch error in extractStreamUrl: ' + error);

//         const result = {
//             streams: [],
//             subtitles: ""
//         };

//         console.log(result);
//         return JSON.stringify(result);
//     }
// }

// // extractStreamUrl("https://m-zone.org/watch/tv/1396?season=1&episode=1");


// async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
//     try {
//         return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
//     } catch(e) {
//         try {
//             return await fetch(url, options);
//         } catch(error) {
//             return null;
//         }
//     }
// }

// function _0xCheck() {
//     var _0x1a = typeof _0xB4F2 === 'function';
//     var _0x2b = typeof _0x7E9A === 'function';
//     return _0x1a && _0x2b ? (function(_0x3c) {
//         return _0x7E9A(_0x3c);
//     })(_0xB4F2()) : !1;
// }

// function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}
