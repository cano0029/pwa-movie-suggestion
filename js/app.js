
const APP = {
  init(){
    APP.registerServiceWorker()
  },
  registerServiceWorker () {
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/serviceWorker.js')
      .then((registration) => {
        console.log('Service worker registered', registration)
      })
      .catch((error) => {
        console.log('Service worker not registered', error)
      })
    }
  }
}

document.addEventListener('DOMContentLoaded', APP.init)


