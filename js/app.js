// TO DO: 
// put html under pages at root

const APP = {  
  apiKey: '8b315e48d59ed2c712994a028435c067',
  baseURL: 'https://api.themoviedb.org/3/',
  imgURL: 'https://image.tmdb.org/t/p/',
  noImgUrl: '/img/gr-stocks-q8P8YoR6erg-unsplash.jpg',
  backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
  logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
  poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  profile_sizes: ['w45', 'w185', 'h632', 'original'],
  still_sizes: ['w92', 'w185', 'w300', 'original'],

  
  db: null,
  moviedbStore: null,
  dbVersion: 1,
  
  isOnline: true,
  deferredInstall: null,
  isStandalone: false,

  init() {
    try {
      if('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/serviceWorker.js')
        })
      }
    } catch (error) {
      console.log('Something went wrong in registering service worker:', error)
    }

    APP.openDB()
    APP.addListeners()
    APP.checkInstall()
  }, 
  
  addListeners() {

    window.addEventListener('online', (event) => {
      console.log(event)
      let message = {
        isOnline: true,
        description: 'Connection back online'
      }
      navigator.serviceWorker.controller.postMessage(message)
    })

    window.addEventListener('offline', (event) => {
      console.log(event)
      let message = {
        isOnline: false,
        description: 'Connection lost. Offline.'
      }
      navigator.serviceWorker.controller.postMessage(message)
    })

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      APP.deferredInstall = event
    });

    window.addEventListener('appinstalled', (event) => {
      let message = {
        appInstalled: true
      }
      navigator.serviceWorker.controller.postMessage(message)
    })

    let btnInstall = document.getElementById('btnInstall')
    btnInstall?.addEventListener('click', APP.startChromeInstall)
    
    document.getElementById('searchForm').addEventListener('submit', APP.handleFormSubmit)

    let movies = document.querySelector('.movies')
    if (movies) { 
      movies.addEventListener('click', APP.navigateSuggestPage) 
    }
  },
  
  checkInstall () {
    if (navigator.standalone) {
      console.log('Launched Location: Installed (iOS)')
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      console.log('Launch Location: Installed (PWA)')
      APP.isStandalone = true;
    } else {
      console.log('Launch Location: Browser Tab')
      APP.isStandalone = false;
    }
  }, 

  startChromeInstall () {
    if (APP.deferredInstall) {
      APP.deferredInstall.prompt()
      APP.deferredInstall.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt')
        } else {
          console.log('User dismissed the install prompt')
        }
      })
    }
  },

  navigateSuggestPage (event) {
    event.preventDefault()
    let anchor = event.target;
    if (anchor.tagName === 'A') {
      let card = anchor.closest('.card');
      let title = card.querySelector('.card-title span').textContent;
      let mid = card.getAttribute('data-id');
      let base = location.origin;
      let url = new URL('/pages/suggestedMovies.html', base);
      url.search = `?movie_id=${mid}&ref=${encodeURIComponent(title)}`;
      location.href = url;
    }
  },

  async handleFormSubmit(event) {
    event.preventDefault()
    const searchInput = await event.target.search.value
    const keyword = searchInput.trim() 

      if (keyword){
        event.preventDefault()
        let base = location.origin
        let url = new URL('/pages/searchResults.html', base) 
        url.search = '?keyword=' + encodeURIComponent(keyword)
        location.href = url  
        APP.clearForm()
    }
  },

  pageLoaded() {
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    
    if (keyword) { APP.checkMovieStore(keyword) }

    let id = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (id && ref) {
      APP.checkSuggestStore({ id, ref });
    }
  },

  async checkMovieStore (keyword) {
    let transaction = await APP.makeTransaction('movieStore', 'readonly')
    transaction.oncomplete = () => {
      console.log('Task of looking in movieStore for already saved movie results is complete')
    }
    let store = transaction.objectStore('movieStore')
    let getRequest = await store.getAll(keyword) 

    getRequest.onsuccess = (event) => {
      let request = event.target.result
      if (request.length === 0) {
        APP.getData(keyword)
      } else {
        console.log(`Movie results found under "${keyword}" is already saved in movieStore`)
        let movies = request[0].results
        APP.buildList(movies)
      }  
    }
  },

  async checkSuggestStore ({ id, ref }) {
    let transaction = await APP.makeTransaction('suggestStore', 'readonly')

    transaction.oncomplete = () => {
      console.log('Task of looking in suggestStore for the movie id is complete')
    }
    let store = transaction.objectStore('suggestStore')
    let getRequest = await store.getAll(id) 

    getRequest.onsuccess = (event) => {
      let request = event.target.result
      if (request.length === 0) {
        APP.getSuggest({ id, ref })
      } else {
        console.log(`Recommended movies under genre id "${id}" is already saved in the suggestStore`)
        let movies = request[0].results
        APP.buildList(movies)
      }  
    }
  },
  
  async getData (keyword){
    APP.postResultsTitle(keyword)
    let url = `${APP.baseURL}search/movie?api_key=${APP.apiKey}&query=${keyword}`
    const response = await fetch(url) 

    try {
      if (!response.ok) throw new Error(response.message)
        let movieResults = {
          keyword, 
          results: await response.json()
        }
      return APP.saveResults(movieResults)
    } catch (error) {
        console.warn('Could not fetch movies', error)
    }
  },

  async getSuggest({ id, ref }) {
    APP.postSuggestTitle(ref)
    const url = `${APP.baseURL}movie/${id}/recommendations?api_key=${APP.apiKey}&ref=${ref}`;
    const response = await fetch(url)

      try {
        if (response.ok) {
          let suggestResults = {
              id, 
              results: await response.json()
          }
          return APP.saveSuggest(suggestResults)
        }
      } catch (error) {
        console.warn('Could not fetch movies', error)
      }
  },

  saveResults (movieResults) {
    let transaction = APP.makeTransaction('movieStore', 'readwrite')
    transaction.oncomplete = () => {
      let movies = movieResults.results
      APP.buildList(movies) 
    }

    let store = transaction.objectStore('movieStore')
    let request = store.add(movieResults)

    request.onsuccess = (event) => {
      console.log('Successfully added movie results to movieStore', event)
    }
    request.onerror = (error) => {
      console.log('Something went wrong in adding movie results to movieStore', error)
    }
  },

  saveSuggest(suggestResults) {
    let transaction = APP.makeTransaction('suggestStore', 'readwrite')
    transaction.oncomplete = () => {
      let movies = suggestResults.results
      APP.buildList(movies) 
    }

    let store = transaction.objectStore('suggestStore')
    let request = store.add(suggestResults)

    request.onsuccess = (event) => {
      console.log('Successfully added suggested movies to suggestStore', event)
    }
    request.onerror = (error) => {
      console.log('Something went wrong in adding suggested to movieStore', error)
    }
  },

  buildList(movies) {
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    APP.postResultsTitle(keyword)
    
    let searchQuery = new URL(document.location).searchParams
    let ref = searchQuery.get('ref')
    APP.postSuggestTitle(ref)

    let container = document.querySelector('.movies')
    container.innerHTML = movies.results
    .map ( movie => {
      let img = './img/icon-512x512.png';
      if (movie.poster_path != null) {
        img = APP.imgURL + 'w500/' + movie.poster_path;
      } else {
        img = APP.noImgUrl
      }
      
      return `<div class=" movieCard card hoverable medium" data-id="${movie.id}">
      <div class="card-image">
        <img src="${img}" alt="movie poster" class="notmaterialboxed"/>
        </div>
      <div class="card-content activator">
        <h5 class="card-title"><span>${movie.title}</span><i class="material-icons right">expand_more</i></h5>
      </div>
      <div class="card-reveal">
        <span class="card-title grey-text text-darken-4">${movie.title}<i class="material-icons right">close</i></span>
        <h6>${movie.release_date}</h6>
        <p>${movie.overview}</p>
        <p class= "movieLang">${movie.original_language}</p>
      </div>
      <div class="card-action">
        <a href="#" class="find-suggested teal-text text-accent-4">See Recommended Movies<i class="material-icons right">theaters</i></a>
      </div>
    </div>`
    }).join('\n') 
  },

  openDB() {
    let dbOpenRequest = indexedDB.open('movieDB', APP.dbVersion)
    
    dbOpenRequest.addEventListener('upgradeneeded', (event) => {
      APP.db = event.target.result

      let oldVersion = event.oldVersion
      let newVersion = event.newVersion || APP.db.version
      console.log(`movieDB Version Update: From version ${oldVersion} to version ${newVersion}`)
      
      if( !APP.db.objectStoreNames.contains('movieStore' && 'suggestStore')) { 
        APP.moviedbStore = APP.db.createObjectStore('movieStore', { keyPath: 'keyword' })
        APP.db.createObjectStore('suggestStore', { keyPath: 'id'})
      }
    })
    
    dbOpenRequest.addEventListener('success', (event) => {
      APP.db = event.target.result
      APP.pageLoaded()
    })
    
    dbOpenRequest.addEventListener('error', (error) => {
      console.warn('Something went wrong with opening movieDB stores:',error)
    })
  },

  makeTransaction (storeName, mode) {
    let transaction = APP.db.transaction(storeName, mode)
    transaction.onerror = (error) => {
      console.log(error)
    }
    return transaction
  },
  
  postResultsTitle(keyword) {
    let keywordSpan = document.querySelector('.ref-keyword');
    if (keyword && keywordSpan) {
      return keywordSpan.textContent = keyword;
    }
  },
  
  postSuggestTitle(ref) {
    let suggestSpan = document.querySelector('.ref-keyword');
    if (ref && suggestSpan) {
      suggestSpan.textContent = ref;
    }
  },

  clearForm (event) {
    if (event) event.preventDefault() 
    document.getElementById('searchForm').reset() 
  }

}

document.addEventListener('DOMContentLoaded', APP.init)


