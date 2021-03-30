import {
  get, // retrieve
  set, // save
  getMany,
  setMany,
  update, // change
  del, // delete
  clear,
  keys,
  values,
  entries,
  createStore,
} from 'https://cdn.jsdelivr.net/npm/idb-keyval@5/dist/esm/index.js';
//importing all of these methods, which return Promises - we can chain then and catch to them to deal with responses
//default DB name is 'keyval-store' (like a document DB)
//default store name is 'keyval'    (like a Collection in the DB)

const APP = {
  /*************
        SAMPLE MOVIEDB URLS
        
        1. To get the config data like image base urls
        https://api.themoviedb.org/3/configuration?api_key=<apiKey>
        
        2. To fetch a list of movies based on a keyword
        https://api.themoviedb.org/3/search/movie?api_key=<apiKey>&query=<keyword>
        
        3. To fetch more details about a movie
        https://api.themoviedb.org/3/movie/<movie-id>?api_key=<apiKey>
  *************/
  
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
  dbVersion: 2,

  isOnline: 'onLine' in navigator && navigator.onLine,
  isStandalone: false,

  init(){
    try {
      if('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/serviceWorker.js')
          console.log('Service worker registered')
        })
      }
    } catch (error) {
      console.log('Service worker not registered', error)
    }

    APP.openDB()
    APP.addListeners()
    APP.checkVersion()
  }, 
  
  addListeners() {
    //TODO:
    //listen for on and off line events

    //TODO:
    //listen for Chrome install prompt- handle the deferredPrompt

    //listen for sign that app was installed
    window.addEventListener('appinstalled', (evt) => {
      console.log('app was installed');
    });

    // listen for submit of the search form in home.html
    document.getElementById('searchForm').addEventListener('submit', APP.handleFormSubmit)

    // movie div is clicked
    let movies = document.querySelector('.movies')
    if (movies) {
      //navigate to the suggested page
      //build the queryString with movie id and ref title
      movies.addEventListener('click', (ev) => {
        ev.preventDefault();
        let anchor = ev.target;
        if (anchor.tagName === 'A') {
          let card = anchor.closest('.card');
          let title = card.querySelector('.card-title span').textContent;
          let mid = card.getAttribute('data-id');
          let base = location.origin;
          let url = new URL('/pages/suggestedMovies.html', base);
          url.search = `?movie_id=${mid}&ref=${encodeURIComponent(title)}`;
          location.href = url;
        }
      })
    }
  },

  checkVersion () {
    if (navigator.standalone) {
      console.log('Launched: Installed (iOS)');
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      console.log('Launched: Installed');
      APP.isStandalone = true;
    } else {
      console.log('Launched: Browser Tab');
      APP.isStandalone = false;
    }
  },

  pageLoaded() {
    console.log('page loaded and checking', location.search)
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    console.log('HERE IS YOUR KEYWORD FROM QUERYSTRING', keyword)
    
    if (keyword) {
      //means we are on results.html
      APP.checkMovieStore(keyword)
      console.log(`on searchResults.html - startSearch(${keyword})`);
    }

    let id = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (id && ref) {
      //we are on suggest.html
      console.log(`look in db for movie_id ${id} or do fetch`);
      APP.getSuggest({ id, ref });
    }
  },

  async handleFormSubmit(event) {
    // TO DO: reloads each time and I lose my buildList
    // build query string and go to results page
    event.preventDefault()
    const searchInput = await event.target.search.value // whatever the value is inputted in the form
    const keyword = searchInput.trim() 

      if (keyword){
        event.preventDefault()
        let base = location.origin
        let url = new URL('/pages/searchResults.html', base) // creating a new URL each time - so it will reload
        url.search = '?keyword=' + encodeURIComponent(keyword)
        // location.href = `/pages/searchResults.html?keyword=${keyword}` 
        location.href = url // reloads it way too fast  
        

        // this prevents page from reloading but still changing queryString
        history.pushState({}, '', url) 

        APP.clearForm()
    }

    
    
    console.log('The keyword you entered is:', keyword)
    
  },

  async checkMovieStore (keyword) {
    // first check if keyword exists in db else fetch
    
    let transaction = await APP.makeTransaction('movieStore', 'readonly')
    transaction.oncomplete = (event) => {
      // transaction for reading all objs is complete
      console.log('Successfully found it in db',event)
    }
    let store = transaction.objectStore('movieStore')
    let getRequest = await store.getAll(keyword) //returns an array

    getRequest.onsuccess = (event) => {
      // getAll was successful
      let request = event.target.result
      console.log('I exist', request)
      if (request.length === 0) {
        APP.getData(keyword)
      } else {
        APP.buildList(request)
      }  
    }
  },
  
  async getData (keyword){
      let url = `${APP.baseURL}search/movie?api_key=${APP.apiKey}&query=${keyword}`
      const response = await fetch(url) 

      let keywordSpan = document.querySelector('.ref-keyword');
      if (keyword && keywordSpan) {
        keywordSpan.textContent = keyword;
      }

      try {
        if (!response.ok) throw new Error(response.message)
          let movieResults = {
            keyword: keyword, // TO DO: switch to ES6 modules in type script (package.json)
            results: await response.json()
          }
          return APP.saveResults(movieResults)
        } catch (error) {
          console.warn('Could not fetch movies', error)
        }
  },

  saveResults (movieResults) {
    let transaction = APP.makeTransaction('movieStore', 'readwrite')
    transaction.oncomplete = (ev) => {
      console.log('ONCOMPLETE', ev)
      APP.buildAnotherList(movieResults) 
    }

    let store = transaction.objectStore('movieStore')
    let request = store.add(movieResults)


    request.onsuccess = (ev) => {
      console.log('successfully added an object', ev) // that the add request is a success
    }
    request.onerror = (error) => {
      console.log('error in request to add', error)
    }
  },

  async getSuggest({ id, ref }) {
    //TODO: Do the search of IndexedDB for matches
    //if no matches to a fetch call to TMDB API
    //or make the fetch call and intercept it in the SW
    let url = `${APP.baseURL}movie/${id}/similar?api_key=${APP.apiKey}&ref=${ref}`;
    // TO DO: how to fetch based on ref??
    let response = await fetch(url)

    let suggestSpan = document.querySelector('.ref-keyword');
      if (ref && suggestSpan) {
        suggestSpan.textContent = ref;
      }

    try {
      if (!response.ok) throw new Error(response.message)
        let suggestResults = {
          id: id, // TO DO: switch to ES6 modules in type script (package.json)
          results: await response.json()
        }
        return APP.saveSuggest(suggestResults)
      } catch (error) {
        console.warn('Could not fetch movies', error)
      }
  },

  saveSuggest(suggestResults) {
    let transaction = APP.makeTransaction('suggestStore', 'readwrite')
    transaction.oncomplete = (ev) => {
      console.log('ONCOMPLETE', ev)
      APP.buildAnotherList(suggestResults) 
    }

    let store = transaction.objectStore('suggestStore')
    let request = store.add(suggestResults)

    request.onsuccess = (ev) => {
      console.log('successfully added suggested movies', ev) // that the add request is a success
    }
    request.onerror = (error) => {
      console.log('error in request to add', error)
    }
  },

  buildList(request) {
    // change title results
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');

    let keywordSpan = document.querySelector('.ref-keyword');
      if (keyword && keywordSpan) {
        keywordSpan.textContent = keyword;
      }

    let movieResults = request[0].results
    console.log(movieResults.results)

    let container = document.querySelector('.movies')
    container.innerHTML = movieResults.results
    .map ( movie => {
      let img = './img/icon-512x512.png';
      if (movie.poster_path != null) {
        img = APP.imgURL + 'w500/' + movie.poster_path;
      } else {
        img = APP.noImgUrl
      }

      return `<div class="card hoverable large" data-id="${movie.id}">
      <div class="card-image">
        <img src="${img}" alt="movie poster" class="notmaterialboxed"/>
        </div>
      <div class="card-content activator">
        <h3 class="card-title"><span>${movie.title}</span><i class="material-icons right">more_vert</i></h3>
      </div>
      <div class="card-reveal">
        <span class="card-title grey-text text-darken-4">${movie.title}<i class="material-icons right">close</i></span>
        <h6>${movie.release_date}</h6>
        <p>${movie.overview}</p>
      </div>
      <div class="card-action">
        <a href="#" class="find-suggested light-blue-text text-darken-3">Show Similar<i class="material-icons right">search</i></a>
      </div>
    </div>`
    }).join('\n') // array of html that will be joined together
  },

  buildAnotherList(movieResults) {
    console.log('I AM TRYING TO BUILD YOU', movieResults.results)
    let fetched = movieResults.results

    let container = document.querySelector('.movies')
    container.innerHTML = fetched.results
    .map ( movie => {
      let img = './img/icon-512x512.png';
      if (movie.poster_path != null) {
        img = APP.imgURL + 'w500/' + movie.poster_path;
      } else {
        img = APP.noImgUrl
      }

      return `<div class="card hoverable large" data-id="${movie.id}">
      <div class="card-image">
        <img src="${img}" alt="movie poster" class="notmaterialboxed"/>
        </div>
      <div class="card-content activator">
        <h3 class="card-title"><span>${movie.title}</span><i class="material-icons right">more_vert</i></h3>
      </div>
      <div class="card-reveal">
        <span class="card-title grey-text text-darken-4">${movie.title}<i class="material-icons right">close</i></span>
        <h6>${movie.release_date}</h6>
        <p>${movie.overview}</p>
      </div>
      <div class="card-action">
        <a href="#" class="find-suggested light-blue-text text-darken-3">Show Similar<i class="material-icons right">search</i></a>
      </div>
    </div>`
    }).join('\n') // array of html that will be joined together
  },

  makeTransaction (storeName, mode) {
    let transaction = APP.db.transaction(storeName, mode)
    transaction.onerror = (error) => {
      console.log(error)
    }
    return transaction
  },

  openDB() {
    //TODO:
    //open the indexedDB
    let dbOpenRequest = indexedDB.open('movieDB', APP.dbVersion)
    
    //upgradeneeded listener
    dbOpenRequest.addEventListener('upgradeneeded', (event) => {
      APP.db = event.target.result
      console.log('upgrade', APP.db)

      let oldVersion = event.oldVersion
      let newVersion = event.newVersion || APP.db.version
      console.log('DB updated from version', oldVersion, 'to', newVersion)
      
      if( !APP.db.objectStoreNames.contains('movieStore' && 'suggestStore')) { 
        APP.moviedbStore = APP.db.createObjectStore('movieStore', { keyPath: 'keyword' })
        APP.db.createObjectStore('suggestStore', { keyPath: 'id'})
      }
    })
    
    //success listener
    //save db reference as APP.db
    dbOpenRequest.addEventListener('success', (event) => {
      APP.db = event.target.result
      console.log('success', APP.db)
      APP.pageLoaded()
    })
    
    //error listener
    dbOpenRequest.addEventListener('error', (error) => {
      console.warn(error)
    })
  },

  clearForm (event) {
    // clears the form 
    if (event) event.preventDefault() // prevents the page from reloading
    document.getElementById('searchForm').reset() 
  }
  
  }

document.addEventListener('DOMContentLoaded', APP.init)


