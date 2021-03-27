const IDB = (
  (function init() {
    let db = null;
    let objectStore = null;
    let DBOpenReq = indexedDB.open()
  }) ()
)

const MovieDB = {
  /*************
        SAMPLE URLS
        
        1. To get the config data like image base urls
        https://api.themoviedb.org/3/configuration?api_key=<apiKey>
        
        2. To fetch a list of movies based on a keyword
        https://api.themoviedb.org/3/search/movie?api_key=<apiKey>&query=<keyword>
        
        3. To fetch more details about a movie
        https://api.themoviedb.org/3/movie/<movie-id>?api_key=<apiKey>
  *************/

  apiKey: '8b315e48d59ed2c712994a028435c067',

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
        })
      }
    } catch (error) {
      console.log('Service worker not registered', error)
    }
  },



}

document.addEventListener('DOMContentLoaded', APP.init)


