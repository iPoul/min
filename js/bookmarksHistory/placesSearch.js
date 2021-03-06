/* global spacesRegex oneWeekAgo performance historyInMemoryCache calculateHistoryScore */

/* depends on placesWorker.js */

function searchPlaces (searchText, callback, options) {
  function processSearchItem (item) {
    if (limitToBookmarks && !item.isBookmarked) {
      return
    }
    // if the text does not contain the first search word, it can't possibly be a match, so don't do any processing
    let itext = item.url.split('?')[0].replace('http://', '').replace('https://', '').replace('www.', '')

    if (item.url !== item.title) {
      itext += ' ' + item.title
    }

    itext = itext.toLowerCase().replace(spacesRegex, ' ')

    const tindex = itext.indexOf(st)

    // if the url contains the search string, count as a match
    // prioritize matches near the beginning of the url
    if (tindex === 0) {
      item.boost = itemStartBoost // large amount of boost for this
      matches.push(item)
    } else if (tindex !== -1) {
      item.boost = exactMatchBoost
      matches.push(item)
    } else {
      // if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

      if (substringSearchEnabled) {
        let substringMatch = true

        // check if the search text matches but is out of order
        for (let i = 0; i < swl; i++) {
          if (itext.indexOf(searchWords[i]) === -1) {
            substringMatch = false
            break
          }
        }

        if (substringMatch) {
          item.boost = 0.125 * swl + (0.02 * stl)
          matches.push(item)
          return
        }
      }

      if (item.visitCount !== 1 || item.lastVisit > oneWeekAgo) { // if the item has been visited more than once, or has been visited in the last week, we should calculate the fuzzy score. Otherwise, it is ignored. This reduces the number of bad results and increases search speed.
        const score = itext.score(st, 0)

        if (score > 0.4 + (0.00075 * itext.length)) {
          item.boost = score * 0.5

          if (score > 0.62) {
            item.boost += 0.33
          }

          matches.push(item)
        }
      }
    }
  }

  const tstart = performance.now()
  const matches = []
  const st = searchText.replace(spacesRegex, ' ').split('?')[0].replace('http://', '').replace('https://', '').replace('www.', '')
  const stl = searchText.length
  const searchWords = st.split(' ')
  const swl = searchWords.length
  let substringSearchEnabled = false
  const itemStartBoost = Math.min(2.5 * stl, 10)
  const exactMatchBoost = 0.4 + (0.075 * stl)
  const limitToBookmarks = options && options.searchBookmarks

  if (searchText.indexOf(' ') !== -1) {
    substringSearchEnabled = true
  }

  for (let i = 0; i < historyInMemoryCache.length; i++) {
    if (matches.length > 200) {
      break
    }
    processSearchItem(historyInMemoryCache[i])
  }

  matches.sort(function (a, b) { // we have to re-sort to account for the boosts applied to the items
    return calculateHistoryScore(b) - calculateHistoryScore(a)
  })

  const tend = performance.now()

  console.info('history search took', tend - tstart)
  callback(matches.slice(0, 100))
}
