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

    // TO DO: delete this, just a test to see of I'm getting anything from movieDB!
    // listen for submit of the search form in home.html
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
      let url = `${APP.baseURL}search/movie?api_key=${APP.apiKey}&query=${keyword}`

      APP.getData(url, (data) => {
        //this is the CALLBACK to run after the fetch
        APP.results = data.results;
        APP.useSearchResults(keyword);
      });
    }
  },

  useSearchResults(keyword) {
    //after getting fetch or db results
    //display search keyword in pages title i.e. Showing search results for <keyword>
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

  // creating my movie database in indexedDB - using vanilla javascript
  openDB() {
    // TO DO: separate into smaller functions!

    // create database
    let dbOpenRequest = indexedDB.open('movieDB', APP.dbVersion) // second parameter is versioning

    // error with opening/creating database
    dbOpenRequest.addEventListener('error', (error) => {
      console.warn(error)
    })

    // successfully loaded indexeddb database
    dbOpenRequest.addEventListener('success', (event) => {
      APP.db = event.target.result
      console.log('success', APP.db)
    })

    // upgrading the indexeddb database i.e. creating data stores within your newly created database
    dbOpenRequest.addEventListener('upgradeneeded', (event) => {
      // creating/deleting stores can only be done in an 'upgradeneeded' event
      // will get an error if you put it somewhere else i.e. success event
      APP.db = event.target.result
      console.log('upgrade', APP.db)

      // check to see which db version you are in
      // will get this message every time you update the version
      let oldVersion = event.oldVersion
      let newVersion = event.newVersion || APP.db.version
      console.log('DB updated from version', oldVersion, 'to', newVersion)
      
      // you have to check to see if store already exists
      // will result in error if you change the db version because it will try to create it again but it already exists
      if( !APP.db.objectStoreNames.contains('movieStore' && 'suggestStore')) { 
        // keyPath can be whatever you define it as, here I am doing keyword (entered in the form) and movie id - which we will use later
        APP.moviedbStore = APP.db.createObjectStore('movieStore', { keyPath: 'keyword' })
        APP.db.createObjectStore('suggestStore', { keyPath: 'id'})
      }
      
      // deleting a store
      // if (db.objectStoreNames.contains('suggestStore')){
      //   db.deleteObjectStore('suggestStore')
      // }
    })
  },



  /***************************************************************** MY CODE */
  // TO DO: merge with Steve's code
  // NOTE: so far, I have successfully saved whatever it is I input in the search form i.e. keyword into movieStore in indexedDB
  
  async handleFormSubmit (event) {
    // TO DO: move to getData function
    // fetching the movie data
    event.preventDefault() 
    const keyword = event.target.search.value // whatever the value is inputted in the form
    console.log('The keyword you entered is:', keyword)

    let url = `${APP.baseURL}search/movie?api_key=${APP.apiKey}&query=${keyword}`
    const response = await fetch(url) 

    try {
      if (!response.ok) throw new Error(response.message)
        let movieResults = {
          keyword: keyword, // TO DO: switch to ES6 modules in type script (package.json)
          results: await response.json() // since it is in a promise, must await it - rejects it if I do it in another way
        }
      APP.saveMoves(movieResults)
    } catch (err) {
      console.warn(err)
    }
  },

  saveMoves (movieResults) {
    // saving movie results data into indexedDB - movieStores

    // transaction- request to add, delete, update, take from indexedDB stores etc.
    let transaction = APP.makeTransaction('movieStore', 'readwrite');
    transaction.oncomplete = (ev) => {
      console.log(ev);
      //APP.buildList() // TO DO: displaying the data
    };

    let store = transaction.objectStore('movieStore');
    let request = store.add(movieResults); // adds it into movieStore in indexedDB

    request.onsuccess = (ev) => {
      console.log('successfully added an object', ev);
    };
    request.onerror = (error) => {
      console.log('error in request to add', error);
    };
  },

  makeTransaction (storeName, mode) {
    // in a separate function because will be using it again and again later when requesting different things from indexedDB
    // transaction- request to add, delete, update, take from indexedDB stores etc.
    let transaction = APP.db.transaction(storeName, mode)
    transaction.onerror = (error) => {
      console.log(error)
    }
    return transaction
  },

  // TO D0 - doing nothing right now
  showResultsPage () {
    // TO DO: go to search results page, and be able to receive data from home page
    // when you hit submit button, you want to pass on the keyword to the querystring of search results page
    // when search page loads, take the value out of query string (keyword) then look in IndexedDb to display it
  },
  /**************************************************/

}

document.addEventListener('DOMContentLoaded', APP.init)


