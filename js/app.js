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
} from 'idb-keyval';
//importing all of these methods, which return Promises - we can chain then and catch to them to deal with responses
//default DB name is 'keyval-store' (like a document DB)
//default store name is 'keyval'    (like a Collection in the DB)

const INDEXED = {
  init () {
    let db = null
    let moviedbStore = null
    let suggestStore = null

    // database open request
    let dbOpenRequest = indexedDB.open('movieDB', 3) // second parameter is versioning

    dbOpenRequest.addEventListener('error', (error) => {
      // error with opening/creating db
      console.warn(error)
    })

    dbOpenRequest.addEventListener('success', (event) => {
      // either success
      db = event.target.result
      console.log('success', db)
    })

    dbOpenRequest.addEventListener('upgradeneeded', (event) => {
      // or upgrading 
      // creating/deleting stores can only be done in an 'upgradeneeded' event
      // will get an error if you put it somewhere else i.e. success event
      db = event.target.result
      console.log('upgrade', db)

      // check to see which db version you are in
      // will get this message every time you update the versioin
      let oldVersion = event.oldVersion
      let newVersion = event.newVersion || db.version
      console.log('DB updated from version', oldVersion, 'to', newVersion)
      
      // you have to check to see if store already exists
      // will result in error if you change the version because it will try to create it again but it already exists
      if( !db.objectStoreNames.contains('movieStore' && 'suggestStore')) {
        moviedbStore = db.createObjectStore('movieStore', { keyPath: 'keyword' })
        db.createObjectStore('suggestStore', { keyPath: 'id'})
      }
      
      
      // deleting a store
      // if (db.objectStoreNames.contains('suggestStore')){
      //   db.deleteObjectStore('suggestStore')
      // }
    })

    dbOpenRequest.addEventListener('submit', (event) => {
      event.preventDefault()
      // one of the form buttons was clicked
    })
  }
}

const MOVIEDB = {
  /*************
        SAMPLE URLS
        
        1. To get the config data like image base urls
        https://api.themoviedb.org/3/configuration?api_key=<apiKey>
        
        2. To fetch a list of movies based on a keyword
        https://api.themoviedb.org/3/search/movie?api_key=<apiKey>&query=<keyword>
        
        3. To fetch more details about a movie
        https://api.themoviedb.org/3/movie/<movie-id>?api_key=<apiKey>
  *************/
  baseURL: 'https://api.themoviedb.org/3/',
  apiKey: '8b315e48d59ed2c712994a028435c067',

  async getMovies(keyword) {
    let url = ''.concat(MOVIEDB.baseURL, 'search/movie?api_key=', MOVIEDB.apiKey, '&query=', keyword)
    try {
      const response = await fetch(url) //the 
      if (!response.ok) throw new Error(response.message)
      return response.json()
    } catch (err) {
      console.warn(err)
    }
  }

}

const APP = {
  init(){
    APP.registerServiceWorker()
  },

  registerServiceWorker () {
    try {
      if('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/serviceWorker.js')
          console.log('Service worker registered')
          INDEXED.init()
        })
      }
    } catch (error) {
      console.log('Service worker not registered', error)
    }
    document.getElementById('movie-form').addEventListener('submit', APP.handleFormSubmit)
  },
  
  showResultsPage (character) {
    // TO DO: go to search results page, and be able to receive data from home page
    // when you hit submit button, you want to pass on the keyword to the querystring of search results page
    // when search page loads, take the value out of query string (keyword) then look in IndexedDb to display it
    document.getElementById('movie-output').textContent = JSON.stringify(character, null, 2) // 2 space indent formatting
  },

  async handleFormSubmit (event) {
    // 1. with a submit event you have to put in preventDefault
    event.preventDefault() 
    const keyword = event.target.movieKey.value // whatever the value is inputted in the form
    const character = await MOVIEDB.getMovies(keyword)
    // TO DO: save movie results in indexedDB
    APP.showResultsPage(character)
  }
}

document.addEventListener('DOMContentLoaded', APP.init)


