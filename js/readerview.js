var readerView = {
  readerURL: 'file://' + __dirname + '/reader/index.html',
  getReaderURL: function (url) {
    return readerView.readerURL + '?url=' + url
  },
  getButton: function (tabId) {
    // TODO better icon
    var item = document.createElement('i')
    item.className = 'fa fa-align-left reader-button'

    item.setAttribute('data-tab', tabId)
    item.setAttribute('title', l('enterReaderView'))

    item.addEventListener('click', function (e) {
      var tabId = this.getAttribute('data-tab')
      var tab = tabs.get(tabId)

      e.stopPropagation()

      if (tab.isReaderView) {
        readerView.exit(tabId)
      } else {
        readerView.enter(tabId)
      }
    })

    return item
  },
  updateButton: function (tabId) {
    var button = document.querySelector('.reader-button[data-tab="{id}"]'.replace('{id}', tabId))
    var tab = tabs.get(tabId)

    if (tab.isReaderView) {
      button.classList.add('is-reader')
      button.setAttribute('title', l('exitReaderView'))
      return
    } else {
      button.classList.remove('is-reader')
      button.setAttribute('title', l('enterReaderView'))
    }

    if (tab.readerable) {
      button.classList.add('can-reader')
    } else {
      button.classList.remove('can-reader')
    }
  },
  enter: function (tabId) {
    navigate(tabId, readerView.readerURL + '?url=' + tabs.get(tabId).url)
    tabs.update(tabId, {
      isReaderView: true
    })
  },
  exit: function (tabId) {
    navigate(tabId, tabs.get(tabId).url.split('?url=')[1])
    tabs.update(tabId, {
      isReaderView: false
    })
  },
  showReadingList: function () {
    showSearchbar(getTabInput(tabs.getSelected()))

    var articlesShown = 0

    var container = getSearchbarContainer('readingList')

    db.readingList.orderBy('time').reverse().each(function (article) {
      if (!article.article) {
        return
      }

      if (articlesShown === 0) {
        clearSearchbar()
      }

      var item = createSearchbarItem({
        title: article.article.title,
        descriptionBlock: article.article.excerpt,
        url: article.url,
        delete: function (el) {
          db.readingList.where('url').equals(el.getAttribute('data-url')).delete()
        }
      })

      item.addEventListener('click', function (e) {
        openURLFromSearchbar(readerView.getReaderURL(article.url), e)
      })

      if (article.visitCount > 5 || (article.extraData.scrollPosition > 0 && article.extraData.articleScrollLength - article.extraData.scrollPosition < 1000)) { // the article has been visited frequently, or the scroll position is at the bottom
        item.style.opacity = 0.65
      }

      container.appendChild(item)

      articlesShown++
    }).then(function () {
      if (articlesShown === 0) {
        var item = createSearchbarItem({
          title: l('emptyReadingListTitle'),
          descriptionBlock: l('emptyReadingListSubtitle')
        })

        container.appendChild(item)
        return
      }
    })
  }
}

// create a searchbar container to show reading list articles

registerSearchbarPlugin('readingList', {
  index: 9,
  // the plugin is only used when triggered from the menubar
  trigger: function () {
    return false
  },
  showResults: null
})

// update the reader button on page load

bindWebviewEvent('did-finish-load', function (e) {
  var tab = this.getAttribute('data-tab')
  var url = this.getAttribute('src')

  if (url.indexOf(readerView.readerURL) === 0) {
    tabs.update(tab, {
      isReaderView: true,
      readerable: false // assume the new page can't be readered, we'll get another message if it can
    })
  } else {
    tabs.update(tab, {
      isReaderView: false,
      readerable: false
    })
  }

  readerView.updateButton(tab)
})

bindWebviewIPC('canReader', function (webview, tab) {
  tabs.update(tab, {
    readerable: true
  })
  readerView.updateButton(tab)
})
