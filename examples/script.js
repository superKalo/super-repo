const WeatherRepository = new Repository({
    name: 'weather',
    request: () => fetch('http://httpstat.us/200')
                .then(() => ({ w: 30, t: 31, p: 1024})), // Promise!
    dataModel: {
        temperature: 't',
        windspeed: 'w',
        pressure: 'p'
    },
    cacheLimit: 5 * 1000 // 5 seconds
});

WeatherRepository.getData().then(
    r => console.log(r.temperature)
);

WeatherRepository.initSyncer();
