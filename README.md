# Repository Library!

An abstraction, that implements best practices for working with and storing data on the client-side.

Please read [my article my CSS-Trick post first](https://paper.dropbox.com/doc/The-Importance-Of-JavaScript-Abstractions-When-Working-With-Remote-Data-72Nk1RlDSfmgc78LO2Rpd). Simply said, the idea of this library is to be your **Repository pattern abstraction** and therefore - to make the way you work with and store remote data more maintainable & scalable :dark_sunglasses: 

## Install

This package can be installed with:

- [npm](https://www.npmjs.com/package/super-repo): `npm install --save super-repo`

- Or simply download the [latest release](https://github.com/superKalo/repository/releases).


## Load

- Static HTML

    ```html
    <script src="/node_modules/super-repo/src/index.js"></script>
    ```

- Using ES6 Imports

    ```javascript
    // If a transpiler is configured (like Traceur Compiler, Babel, Rollup or Webpack):
    import SuperRepo from 'super-repo';
    ```

- Using CommonJS Imports
    ```javascript
    // If a module loader is configured (like RequireJS, Browserify or Neuter):
    const SuperRepo = require('my-npm-module');
    ```

## Usage

First, define a method that fetches the data. To get your data, use FetchAPI or jQuery's $.ajax() or plain XMLHttpRequest or whatever you want. **As long as you return a Promise it will work!**

```javascript
const requestWeatherData = () => fetch('weather.json').then(r => r.json());
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
const WeatherRepository = new SuperRepo({
    storage: 'LOCAL_STORAGE',                   // [1]
    name: 'weather',                            // [2]
    cacheLimit: 5 * 1000, // 5 seconds          // [3]
    request: requestWeatherData, // Promise!
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

## Dependencies

None.

## Documentation

### Options
- **`storage`** [required] | default: `'LOCAL_STORAGE'` | all: `'LOCAL_STORAGE'`, `'BROWSER_STORAGE'` or `'LOCAL_VARIABLE'`

    The preferred client-side storage. The options are:
        - [Local Storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) (`'LOCAL_STORAGE'`)
        - [Browser (local) Storage](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/) if you're building a browser extension (`'BROWSER_STORAGE'`)
        - Storing the data in a local `.data` variable, attached to the class instance (`'LOCAL_VARIABLE'`)

- **`name`** [required] | type: `String`

    Name of the Repository. It's used for Local Storage or Browser Local Storage item name.

- **`request`** [required] | type: `Promise`

    The request that does the actual API call. It must be a Promise. Use FetchAPI or jQuery's $.ajax() or plain XMLHttpRequest or whatever you want, but wrap it in a Promise (if it isn't).

- **`dataModel`** [required] | type: `Object` or `Array`

    The mapping of the attribute names you'd like to use across your codebase with the attribute names coming from the server response.

    In case the server returns a single Object, you can use the following syntax:

        ```javascript
        dataModel: {
            temperature: 't',
            windspeed: 'w',
            pressure: 'p'
        }
        ```

    In case the server returns an Array of items, you can use the following syntax:

        ```javascript
        dataModel: [{
            temperature: 't',
            windspeed: 'w',
            pressure: 'p'
        }]
        ```

- **`cacheLimit`** [optional] | default: `-1` | type: `Number`

    Defines when the data will get out of date. In milliseconds. If the data will never get out of date, you can set `cacheLimit` to `-1`.

- **`mapData`** [optional] | type: `Function`

    After the `dataModel` is applied, if you need any further manipulation data manipulation, you can hook on this method. For example, let's say the server sends the temperature in Celsius and you want to convert it to Fahrenheit:

        ```javascript
        dataModel: [{
            temperature: 't',
            windspeed: 'w',
            pressure: 'p'
        }],
        mapData: data => {
            // Convert to Fahrenheit
            const temperature = (data.temperature * 1.8) + 32;

            // These two sways the same
            const { windspeed, pressure } = data;

            return { temperature, windspeed, pressure };
        }
        ```

### Methods

- **`.getData()`** | Returns: `Promise`

    This is how you can access data. It triggers a server request if data is missing or invalidated or out of date. It returns the data from the cache (local storage, browser local storage or local variable) if the data is up to date.

    ```javascript
    WeatherRepository.getData().then( data => {
        // Do something.
        console.log(`It is ${data.temperature} degrees`);
    });
    ```

- **`.invalidateData()`**

    Invalidates data by setting a flag. It **doesn't delete the data from the storage**. However, the very next time when the `.getData()` method is invoked, it will directly call the server to get fresh data.

- **`.clearData()`**

    Deletes the data from the storage. Therefore, the very next time when the `.getData()` method is invoked, it will directly call the server to get fresh data.

- **`.initSyncer()`**

    Initiates a setInterval, which will countdown to the point when the data is out of date (based on the `cacheLimit` value) and will trigger a server request to get fresh data.

- **`.destroySyncer()`**

    Destroys the setInterval`, initiated by the `.initSyncer()` method.


## Contributing
I'm open to ideas and suggestions! If you want to contribute or simply you've cought a bug - you can either open an issue or clone the repository, tweak the `src/index.js` file and fire a Pull Request. There are no *fancy* build steps.


## License
The code and the documentation are released under the [MIT License](https://github.com/superKalo/repository/blob/master/LICENSE).
