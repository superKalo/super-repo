# <img src="https://user-images.githubusercontent.com/2548061/30693332-c07f5844-9ed7-11e7-970d-17498f7c8e62.png" height="24" alt="Super R" /> SuperRepo

Repository-ish pattern for your data, that implements **best practices** for working with and storing data on the client-side. **Please read [my CSS-Tricks post first](https://paper.dropbox.com/doc/The-Importance-Of-JavaScript-Abstractions-When-Working-With-Remote-Data-72Nk1RlDSfmgc78LO2Rpd).**

> TL;DR: Get ready to make the way you work with and store remote data more maintainable & scalable! :dark_sunglasses: 

## :package: Install

This package can be installed with:

- [npm](https://www.npmjs.com/package/super-repo): `npm install --save super-repo`

- Or simply download the [latest release](https://github.com/superKalo/repository/releases).


## :rocket: Load

- Static HTML:

    ```html
    <script src="/node_modules/super-repo/src/index.js"></script>
    ```

- Using ES6 Imports:

    ```javascript
    // If a transpiler is configured (like Traceur Compiler, Babel, Rollup or Webpack):
    import SuperRepo from 'super-repo';
    ```

- Using CommonJS Imports:
    ```javascript
    // If a module loader is configured (like RequireJS, Browserify or Neuter):
    const SuperRepo = require('super-repo');
    ```

## :bulb: Usage

Let's assume we have a weather API. It returns the temperature, feels-like, wind speed (m/s), pressure (hPa) and humidity (%). A common pattern, in order for the JSON response to be as slim as possible, attributes are compressed up to the first letter. So here’s what we receive from the server:

```json
{
    "t": 31,
    "w": 32,
    "p": 1011,
    "h": 38,
    "f": 32
}
```

Now let's define a function responsible for getting data from the server. It doesn't matter how, as long as your function returns a Promise.

- You can use jQuery's `$.ajax()` (as of v1.5, jQuery implements the Promise interface):

    ```javascript
    const requestWeatherData = () => $.ajax({url:'weather.json'});
    ```

- ... or FetchAPI:

    ```javascript
    const requestWeatherData = () => fetch('weather.json').then(r => r.json());
    ```

- ... or plain XMLHttpRequest or whatever you want. **As long as you return a Promise it will work!**

We're ready to define our `SuperRepo`sitory:

```javascript
/**
 * 1. Define where you want to store the data, in this example, in the LocalStorage.
 *
 * 2. Then - define a name of your data repository, it's used for the LocalStorage key.
 *
 * 3. Define when the data will get out of date.
 *
 * 4. Define your data model and set custom attribute names for each response items.
      Remember why? See below.
 */
const WeatherRepository = new SuperRepo({
    storage: 'LOCAL_STORAGE',                   // [1]
    name: 'weather',                            // [2]
    outOfDateAfter: 5 * 60 * 1000, // 5 min     // [3]
    request: requestWeatherData,                // Function that returns a Promise
    dataModel: {                                // [4]
        temperature: 't',
        windspeed: 'w',
        pressure: 'p'
    }
});

/**
 * From here on, you can use the `.getData()` method to access your data.
 * It will first check if out data outdated (based on the `outOfDateAfter`).
 * If so - it will do a server request to get fresh data,
 * otherwise - it will get it from the cache (Local Storage).
 */
WeatherRepository.getData().then( data => {
    // Do something awesome.
    console.log(`It is ${data.temperature} degrees`);
});
```

Why **`[4]`** this is a good idea (best practice):

- Throughout your codebase via `WeatherRepository.getData()` you access meaningful and semantic attributes like `.temperature` and `.windspeed` instead of `t` and `s`.
- You expose only parameters you need and simply don't include the others.
- If the response attributes names change (or you need to wire-up another API with different response structure), you only need to tweak it here - in only 1 place of your codebase.

## :dark_sunglasses: Features

The library does the following cool things:

- [Performance] Gets data from the server (if it’s missing or outdated on our side) or otherwise - gets it from the cache.
- [Performance] If `WeatherRepository.getData()` is called multiple times from different parts of our app, only 1 server request is triggered.
- [Scalability] Applies the data model to our rough data (see **`[4]`** above).
- [Scalability] You can store the data in the Local Storage or in the Browser (local) Storage (if you’re building a browser extension) or in a local variable (if won’t want to store data across browser sessions). See the options for the `storage` setting.
- [Scalability] You can initiate an automatic data sync with `WeatherRepository.initSyncer()`. This will initiate a setInterval, which will countdown to the point when the data is out of date (based on the `outOfDateAfter` value) and will trigger a server request to get fresh data. Sweet.

... and a few more. Read the documentation for advanced usage.

## :scream: Dependencies

None.

## :open_book: Documentation

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

- **`outOfDateAfter`** [optional] | default: `-1` | type: `Number`

    Defines when the data will get out of date. In milliseconds. If the data will never get out of date, you can set `outOfDateAfter` to `-1`.

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

- **`.invalidateData()`** | Returns: `Promise`

    Invalidates data by setting a flag. It **doesn't delete the data from the storage**. However, the very next time when the `.getData()` method is invoked, it will directly call the server to get fresh data.

- **`.clearData()`**  | Returns: `Promise`

    Deletes the data from the storage. Therefore, the very next time when the `.getData()` method is invoked, it will directly call the server to get fresh data.

- **`.initSyncer()`** | Returns: `void`

    Initiates a setInterval, which will countdown to the point when the data is out of date (based on the `outOfDateAfter` value) and will trigger a server request to get fresh data.

- **`.destroySyncer()`**  | Returns: `void`

    Destroys the setInterval, initiated by the `.initSyncer()` method.


## :+1: Contributing
I'm open to ideas and suggestions! If you want to contribute or simply you've cought a bug - you can either open an issue or clone the repository, tweak the `src/index.js` file and fire a Pull Request. There are no *fancy* build steps.


## :oncoming_police_car: License
The code and the documentation are released under the [MIT License](https://github.com/superKalo/repository/blob/master/LICENSE).
