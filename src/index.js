/**
 * Adapter that stores the data in the Local Storage.
 */
class LocalStorageAdapter {
    /**
     * Get the cached data.
     *
     * @param  {String} _storageName - the `name` setting from the config
     * @return {Promise}
     */
    get(_storageName) {
        return new Promise(_resolve => _resolve(
            JSON.parse(window.localStorage.getItem(_storageName))
        ));
    }

    /**
     * Set cached data.
     *
     * @param {[type]} _storageName - the `name` setting from the config
     * @param {Object} or {Array} _data
     * @return {Promise}
     */
    set(_storageName, _data) {
        return new Promise(_resolve => _resolve(
            window.localStorage.setItem(_storageName, JSON.stringify(_data))
        ));
    }
}

/**
 * Adapter that stores the data in the Browser Storage (local).
 * If you're building a browser extension, that's the way to store data.
 */
class BrowserStorageAdapter {
    constructor() {
        /**
         * Extension API model is currently being standardized to browser.xxx,
         * and some browsers are defining their own namespaces in the meantime
         * (for example, Edge is using msBrowser), see:
         *
         * {@link https://gist.github.com/superKalo/7cee019a3a6a3f0e231b6b4840b5d701}
         */
        this.browser = window.msBrowser || window.browser || window.chrome;
    }

    /**
     * Get the cached data.
     *
     * @param  {String} _storageName - the `name` setting from the config
     * @return {Promise}
     */
    get(_storageName) {
        return new Promise(_resolve =>
            this.browser.storage.local.get(_storageName, _response =>
                _resolve(_response[_storageName])
            )
        );
    }

    /**
     * Set cached data.
     *
     * @param {[type]} _storageName - the `name` setting from the config
     * @param {Object} or {Array} _data
     * @return {Promise}
     */
    set(_storageName, _data) {
        return new Promise(_resolve =>
            this.browser.storage.local.set({
                [_storageName]: _data
            }, _resolve)
        );
    }
}

/**
 * Adapter that stores the data in a local `.data` variable,
 * attached to the class instance.
 * Convenient if you don’t want to store data across browser sessions.
 */
class LocalVariableAdapter {
    /**
     * Sets a reference to the context, so we can access the instance's `.data`
     * @param  {Object} _this - the `this` context of the class instance.
     */
    constructor(_this) {
        this.context = _this;
    }

    /**
     * Get the cached data.
     *
     * @param {String} _storageName - the `name` setting from the config,
     *                                which we don't need for this adapter.
     * @return {Promise}
     */
    get(_storageName) {
        return new Promise(_resolve => _resolve(this.context.data));
    }

    /**
     * Set cached data.
     *
     * @param {String} _storageName - the `name` setting from the config,
     *                                which we don't need for this adapter.
     * @param {Object} or {Array} _data
     * @return {Promise}
     */
    set(_storageName, _data) {
        return new Promise(_resolve => _resolve(this.context.data = _data));
    }
}


class SuperRepo {

    constructor(_config) {
        this.config = _config;

        /** Default out of date period  */
        const { outOfDateAfter } = _config
        const outOfDateAfterIsMissing =
            typeof outOfDateAfter === 'undefined' || outOfDateAfter === null;
        if (outOfDateAfterIsMissing) {
            this.config.outOfDateAfter = -1;
        }

        /**
         * Helper variables to hold the currently pending Promise (this.promise)
         * and to determine if a Promise is currently pending or not.
         *
         * {@link https://stackoverflow.com/a/36294256/1333836}
         */
        this.promise = null;
        this.isPromisePending = false;

        this.config.storage = _config.storage ? _config.storage : 'LOCAL_STORAGE';

        switch(this.config.storage) {
            case 'LOCAL_VARIABLE': {
                // Introduce this local variable to hold the repository data
                this.data = null;

                this.storage = new LocalVariableAdapter(this);
                break;
            }
            case 'BROWSER_STORAGE': {
                this.storage = new BrowserStorageAdapter();
                break;
            }
            case 'LOCAL_STORAGE': {
                this.storage = new LocalStorageAdapter();
                break;
            }
        }
    }

    /**
     * Applies the data model to the rough response data, or with other words:
     * sets custom attribute names for each response item.
     *
     * @param  {Object} or {Array} _response - server response
     * @return {Object} or {Array}
     */
    _normalizeData(_response) {
        const { dataModel } = this.config;

        const isMissing =
            typeof dataModel === 'undefined' || dataModel === null;

        if (isMissing) {
            return _response;
        }

        const isArray = Array.isArray(dataModel);

        if (isArray) {
            return _response.map( item => {
                const obj = {};

                Object.keys(dataModel[0]).forEach(
                    key => obj[key] = item[dataModel[0][key]]
                );

                return obj;
            });
        }

        // In all other cases - it should be an Array of Objects.
        const obj = {};

        Object.keys(dataModel).forEach(
            key => obj[key] = _response[dataModel[key]]
        );

        return obj;
    }

    /**
     * After the data model is applied via ._normalizeData(),
     * mapping the response gives an option for further processing the data.
     *
     * @param  {Object} or {Array} _response - server response
     * @return {Object} or {Array}
     */
    _mapData(_response) {
        const { mapData } = this.config;

        return typeof mapData === 'function' ? mapData(_response) : _response;
    }

    /**
     * Checks if the repository data is up to date or not.
     *
     * @return {Promise}
     */
    getDataUpToDateStatus() {
        const { name, outOfDateAfter } = this.config;

        return new Promise(_resolve => {
            this.storage.get(name).then(_localStore => {

                const isDataMissing =
                    _localStore === null || // Local Storage
                    typeof _localStore === 'undefined' || // Browser Storage
                    Object.keys(_localStore.data).length === 0;

                if (isDataMissing) {
                    _resolve({
                        isDataUpToDate: false,
                        lastFetched: null,
                        isInvalid: false,
                        localData: null
                    });
                } else if (_localStore.isInvalid) {
                    _resolve({
                        isDataUpToDate: false,
                        lastFetched: _localStore.lastFetched,
                        isInvalid: true,
                        localData: _localStore.data
                    });
                } else if (outOfDateAfter === 0) {
                    // Setting the `outOfDateAfter` config to 0
                    // allows users to mark the data as always up to date
                    // (only if not invalidated or missing, of course)
                    _resolve({
                        isDataUpToDate: true,
                        lastFetched: _localStore.lastFetched,
                        isInvalid: _localStore.isInvalid,
                        localData: _localStore.data
                    });
                } else {
                    const { lastFetched } = _localStore;
                    const isLimitExceeded =
                        (new Date().valueOf() - lastFetched) > outOfDateAfter;

                    _resolve({
                        isDataUpToDate: ! isLimitExceeded,
                        lastFetched: _localStore.lastFetched,
                        isInvalid: _localStore.isInvalid,
                        localData: _localStore.data
                    });
                }
            });
        });
    }

    /**
     * Stores data via the storage method configured.
     *
     * @param  {Array} or {Object} _data - the repository data
     * @return {Void}
     */
    _storeData(_data) {
        this.storage.set(this.config.name, {
            lastFetched: new Date().valueOf(),
            isInvalid: false,
            data: _data
        });
    }

    /**
     * Invalidates data by setting turning on the `isInvalid` flag.
     * It doesn't delete the data from the storage.
     * However, the very next time when the .getData() method is invoked,
     * it will directly call the server to get fresh data.
     *
     * @return {Promise}, that resolves to {Object} that has:
     *   - prevData {Object} - the previous data
     *   - nextData {Object} - the next data
     */
    invalidateData() {
        return new Promise(_resolve => {

            this.storage.get(this.config.name).then(_prevData => {
                const nextData = Object.assign({}, _prevData, {
                    isInvalid: true
                });

                this.storage.set(this.config.name, nextData)
                    .then( () => _resolve({
                        prevData: _prevData,
                        nextData: nextData
                    }));
            });

        });
    }

    /**
     * Deletes the data from the storage.
     * Therefore, the very next time when the .getData() method is invoked,
     * it will directly call the server to get fresh data.
     *
     * @return {Promise},  that resolves to
     *   - prevData {Object} - the previous (just deleted) data
     */
    clearData() {
        return new Promise(_resolve => {

            this.storage.get(this.config.name).then(_prevData => {
                this.storage.set(this.config.name, null).
                    then( () => _resolve(_prevData))
            });

        });
    }

    /**
     * Forces requesting fresh (new) data.
     * Additionally, triggers all processes when a new data is received -
     * maps, normalizes and stores it.
     *
     * @return {Promise}
     */
    _requestFreshData() {
        return this.config.request()
            .then(this._normalizeData.bind(this))
            .then(this._mapData.bind(this))
            .then(_response => {
                this._storeData(_response);

                return _response;
            });
    }

    /**
     * Gets data from the server (if it’s missing or outdated on our side)
     * or otherwise - gets it from the cache.
     *
     * @return {Promise}
     */
    getData(){
        const { config } = this;

        // If there is a Promise pending, wait for it, do not fire another one!
        if (this.isPromisePending) {
            return this.promise;
        }

        /**
         * The only way to detect if a Promise is pending or not,
         * is to attach a flag like so. It doesn't look sexy, but it works.
         * {@link: https://stackoverflow.com/a/36294256/1333836}
         */
        this.isPromisePending = true;

        return this.promise = new Promise((_resolve, _reject) => {

            this.getDataUpToDateStatus().then(_res => {
                if (_res.isDataUpToDate) {
                    this.promise = null;
                    this.isPromisePending = false;

                    _resolve(_res.localData);
                } else {
                    this._requestFreshData()
                        .then(_response => {
                            this.promise = null;
                            this.isPromisePending = false;

                            return _response;
                        })
                        .then(_resolve)
                        .catch(_reject);
                }
            });

        });
    }

    /**
     * Helper method that initiates an interval.
     *
     * @param  {Number} _interval - the interval, in milliseconds
     * @return {Void}
     */
    _initSyncInterval(_interval, _cb) {
        // Do not initiate intervals which are quicker then a second,
        // otherwise, this might be a big network (performance) overhead.
        const interval = _interval < 1000 ? 1000: _interval;

        return setInterval(
            () => this._requestFreshData().then(_cb), interval
        );
    }

    /**
     * Initiates a setInterval, which will countdown to the point
     * when the data is out of date (based on the `outOfDateAfter` value)
     * and will trigger a server request to get fresh data.
     *
     * @return {Void}
     */
    initSyncer(_cb = () => {}) {
        const { outOfDateAfter } = this.config;

        return new Promise(_resolve => {
            this.getDataUpToDateStatus().then((_res, _rej) => {

                /**
                 * If data is up to date, determine when it gets outdated.
                 * Fire a setTimeout until then. Finally,
                 * initiate a regular setInterval.
                 */
                if (_res.isDataUpToDate) {
                    const diff = new Date().valueOf() - _res.lastFetched;
                    let remainingTime = outOfDateAfter - diff;

                    this.syncInterval =
                        this._initSyncInterval(remainingTime, _cb);

                    setTimeout( () => {
                        this.destroySyncer();

                        this.syncInterval =
                            this._initSyncInterval(outOfDateAfter, _cb);
                    }, remainingTime < 1000 ? 1000 : remainingTime);

                    _resolve();
                } else {
                    this._requestFreshData()
                        .then(_response => {
                            this.syncInterval =
                                this._initSyncInterval(outOfDateAfter, _cb);

                            _cb();
                            _resolve();
                        });
                }
            });
        });
    }

    /**
     * Destroys the setInterval, initiated by the .initSyncer() method.
     *
     * @return {Void}
     */
    destroySyncer() {
        clearInterval(this.syncInterval);
    }
};


/**
 * Uses Node, AMD or browser globals to create a module. This example creates
 * a global even when AMD is used. This is useful if you have some scripts
 * that are loaded by an AMD loader, but they still want access to globals.
 *
 * {@link https://github.com/umdjs/umd/blob/master/templates/returnExportsGlobal.js}
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function () {
            return (root.returnExportsGlobal = factory());
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals
        root.returnExportsGlobal = factory();
    }
}(this, function () {
    // Just return a value to define the module export.
    // This example returns an object, but the module
    // can return a function as the exported value.
    return SuperRepo;
}));
