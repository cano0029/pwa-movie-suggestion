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

const INDEXED = {
  init () {
    
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


