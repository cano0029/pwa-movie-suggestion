
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
  }
}

document.addEventListener('DOMContentLoaded', APP.init)


