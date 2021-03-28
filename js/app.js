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


  /*************
        SAMPLE URLS
        
        1. To get the config data like image base urls
        https://api.themoviedb.org/3/configuration?api_key=<apiKey>
        
        2. To fetch a list of movies based on a keyword
        https://api.themoviedb.org/3/search/movie?api_key=<apiKey>&query=<keyword>
        
        3. To fetch more details about a movie
        https://api.themoviedb.org/3/movie/<movie-id>?api_key=<apiKey>
  *************/

const APP = {
  baseURL: 'https://api.themoviedb.org/3/',
  imgURL: 'https://image.tmdb.org/t/p/',
  backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
  logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
  poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  profile_sizes: ['w45', 'w185', 'h632', 'original'],
  still_sizes: ['w92', 'w185', 'w300', 'original'],

  db: null,
  moviedbStore: null,
  dbVersion: 1,

  isOnline: 'onLine' in navigator && navigator.onLine,
  isStandalone: false,

  apiKey: '8b315e48d59ed2c712994a028435c067',

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
    APP.pageLoaded()
    APP.addListeners()
    APP.checkVersion()
  },

  pageLoaded() {
    //page has just loaded and we need to check the queryString
    //based on the querystring value(s) run the page specific tasks
    // console.log('page loaded and checking', location.search);
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    if (keyword) {
      //means we are on results.html
      console.log(`on searchResults.html - startSearch(${keyword})`);
      APP.startSearch(keyword);
    }
    let mid = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (mid && ref) {
      //we are on suggest.html
      console.log(`look in db for movie_id ${mid} or do fetch`);
      APP.startSuggest({ mid, ref });
    }
  },

  addListeners() {
    //TODO:
    //listen for on and off line events

    //TODO:
    //listen for Chrome install prompt
    //handle the deferredPrompt

    //listen for sign that app was installed
    window.addEventListener('appinstalled', (evt) => {
      console.log('app was installed');
    });

    //listen for submit of the search form
    document.getElementById('searchForm').addEventListener('submit', APP.handleFormSubmit)
  },

  checkVersion () {
    //check if the app was launched from installed version
    if (navigator.standalone) {
      // console.log('Launched: Installed (iOS)');
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      // console.log('Launched: Installed');
      APP.isStandalone = true;
    } else {
      // console.log('Launched: Browser Tab');
      APP.isStandalone = false;
    }
  },

  /* * * * * * * NEED TO CHANGE TO BE IN LINE WITH STEVE'S CODE * * * * * * */
  async handleFormSubmit (event) {
    // 1. with a submit event you have to put in preventDefault
    event.preventDefault() 
    const keyword = event.target.search.value // whatever the value is inputted in the form
    const character = await APP.getMovies(keyword)
    // TO DO: save movie results in indexedDB
    APP.showResultsPage(character)
  },

  async getMovies(keyword) {
    let url = ''.concat(APP.baseURL, 'search/movie?api_key=', APP.apiKey, '&query=', keyword)
    try {
      const response = await fetch(url) //the 
      if (!response.ok) throw new Error(response.message)
      return response.json()
    } catch (err) {
      console.warn(err)
    }
  },

  showResultsPage (character) {
    // TO DO: go to search results page, and be able to receive data from home page
    // when you hit submit button, you want to pass on the keyword to the querystring of search results page
    // when search page loads, take the value out of query string (keyword) then look in IndexedDb to display it

    //currently, I am just outputting it in a div in my home.html (temporarily - wanted to see if it works)
    document.getElementById('movie-output').textContent = JSON.stringify(character, null, 2) // 2 space indent formatting
  },
  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  sendMessage(msg, target) {
    //TODO:
    //send a message to the service worker
  },

  onMessage({ data }) {
    //TODO:
    //message received from service worker
  },

  startSearch(keyword) {
    //TODO: check in IDB for movie results
    if (keyword) {
      //check the db
      //if no matches make a fetch call to TMDB API
      //or make the fetch call and intercept it in the SW
      let url = `${APP.baseURL}search/movie?api_key=${APP.apiKey}&query=${keyword}`;

      APP.getData(url, (data) => {
        //this is the CALLBACK to run after the fetch
        APP.results = data.results;
        APP.useSearchResults(keyword);
      });
    }
  },

  useSearchResults(keyword) {
    //after getting fetch or db results
    //display search keyword in title
    //then call buildList
    let movies = APP.results;
    let keywordSpan = document.querySelector('.ref-keyword');
    if (keyword && keywordSpan) {
      keywordSpan.textContent = keyword;
    }
    APP.buildList(movies);
  },

  startSuggest({ mid, ref }) {
    //TODO: Do the search of IndexedDB for matches
    //if no matches to a fetch call to TMDB API
    //or make the fetch call and intercept it in the SW

    let url = `${APP.BASE_URL}movie/${mid}/similar?api_key=${APP.API_KEY}&ref=${ref}`;
    //TODO: choose between /similar and /suggested endpoints from API

    APP.getData(url, (data) => {
      //this is the callback that will be used after fetch
      APP.suggestedResults = data.results;
      APP.useSuggestedResults(ref);
    });
  },

  useSuggestedResults(ref) {
    //after getting fetch/db results
    //display reference movie name in title
    //then call buildList
    let movies = APP.suggestedResults;
    let titleSpan = document.querySelector('#suggested .ref-movie');
    console.log('ref title', ref);
    if (ref && titleSpan) {
      titleSpan.textContent = ref;
    }
    APP.buildList(movies);
  },

  getData: async (url, cb) => {
    fetch(url)
      .then((resp) => {
        if (resp.ok) {
          return resp.json();
        } else {
          let msg = resp.statusText;
          throw new Error(`Could not fetch movies. ${msg}.`);
        }
      })
      .then((data) => {
        //callback
        cb(data);
      })
      .catch((err) => {
        console.warn(err);
        cb({ code: err.code, message: err.message, results: [] });
      });
  },

  buildList: (movies) => {
    //TO DO: build the list of cards inside the current page
  },

  openDB() {
    // let db = null
    // let moviedbStore = null

    // database open request
    let dbOpenRequest = indexedDB.open('movieDB', APP.dbVersion) // second parameter is versioning

    dbOpenRequest.addEventListener('error', (error) => {
      // error with opening/creating db
      console.warn(error)
    })

    dbOpenRequest.addEventListener('success', (event) => {
      // either success
      APP.db = event.target.result
      console.log('success', APP.db)
    })

    dbOpenRequest.addEventListener('upgradeneeded', (event) => {
      // or upgrading 
      // creating/deleting stores can only be done in an 'upgradeneeded' event
      // will get an error if you put it somewhere else i.e. success event
      APP.db = event.target.result
      console.log('upgrade', APP.db)

      // check to see which db version you are in
      // will get this message every time you update the versioin
      let oldVersion = event.oldVersion
      let newVersion = event.newVersion || APP.db.version
      console.log('DB updated from version', oldVersion, 'to', newVersion)
      
      // you have to check to see if store already exists
      // will result in error if you change the version because it will try to create it again but it already exists
      if( !APP.db.objectStoreNames.contains('movieStore' && 'suggestStore')) {
        APP.moviedbStore = APP.db.createObjectStore('movieStore', { keyPath: 'keyword' })
        APP.db.createObjectStore('suggestStore', { keyPath: 'id'})
      }
      
      // deleting a store
      // if (db.objectStoreNames.contains('suggestStore')){
      //   db.deleteObjectStore('suggestStore')
      // }
    })
    // dbOpenRequest.addEventListener('submit', (event) => {
    //   event.preventDefault()
      // one of the form buttons was clicked
    // })
  },
}

document.addEventListener('DOMContentLoaded', APP.init)


