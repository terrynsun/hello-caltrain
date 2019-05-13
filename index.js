if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./worker.js')
    .then(() => {
      console.log('Service Worker Registered');
    });


  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('message received');
  });
}
