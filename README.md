# Repository Library!

An abstraction, that implements best practices for working with and storing data on the client-side.

Please read [my article my CSS-Trick post first](https://paper.dropbox.com/doc/The-Importance-Of-JavaScript-Abstractions-When-Working-With-Remote-Data-72Nk1RlDSfmgc78LO2Rpd). Simply said, the idea of this library is to be your **Repository pattern abstraction** and therefore - to make the way you work with and store remote data more maintainable & scalable :dark_sunglasses: 

## Install

This package can be installed with:

- [npm](https://www.npmjs.com/package/repository-datastore): `npm install --save repository-datastore`

- Or simply download the [latest release](https://github.com/superKalo/repository/releases).


## Load

- Static HTML

    ```html
    <script src="/node_modules/repository-datastore/src/index.js"></script>
    ```

- Using ES6 Imports

    ```javascript
    // If a transpiler is configured (like Traceur Compiler, Babel, Rollup or Webpack):
    import Repository from 'repository-datastore';
    ```

- Using CommonJS Imports
    ```javascript
    // If a module loader is configured (like RequireJS, Browserify or Neuter):
    const MyModule = require('my-npm-module');
    ```

## Usage

First, define a method that fetches the data. To get your data, use FetchAPI or jQuery's $.ajax() or plain XMLHttpRequest or whatever you want. **As long as you return a Promise it will work!**

```javascript
const fetchWeatherData = () => fetch('weather.json').then(r => r.json());
```

Let's assume we have a weather API. It returns us the temperature, feels-like, wind speed (m/s), pressure (hPa) and humidity (%). A common pattern, in order for the JSON response to be as slim as possible, attributes are compressed up to the first letter. So here’s what we receive from the server:

```json
{
    "t": 31,
    "w": 32,
    "p": 1011,
    "h": "38",
    "f": "32"
}
```

Then, we're ready to define our Repository.

Define where your want to store the data **`[1]`** - in this example, in the LocalStorage. Then - the name of your data repository **`[2]`** - it's used for the LocalStorage key. Finally, define when the data will get out of date **`[3]`**. If the data will never get out of date, you can set `cacheLimit` to `-1`.

```javascript
const WeatherRepository = new Repository({
    storage: 'LOCAL_STORAGE',                   // [1]
    name: 'weather',                            // [2]
    cacheLimit: 5 * 1000, // 5 seconds          // [3]
    request: fetchWeatherData, // Promise!
    dataModel: {                                // [4]
        temperature: 't',
        windspeed: 'w',
        pressure: 'p'
    }
});
```

Then **`[4]`**, define your data model and set custom attribute names for each response items. Why this is a good idea:
- Throughout our codebase via WeatherRepository.getData() we access meaningful and semantic attributes like `.temperature` and `.windspeed` instead of `t` and `s`.
- We expose only parameters we need and we simply don't include (hide) all others.
- If the response attributes names change (or we need to wire-up another API with different response structure), we only need to tweak it here - in only 1 place of our codebase.
