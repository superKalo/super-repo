class LocalStorageAdapter {
    get(_storageName) {
        return new Promise(_resolve => _resolve(
            JSON.parse(window.localStorage.getItem(_storageName))
        ));
    }

    set(_storageName, _data) {
        return new Promise(_resolve => _resolve(
            window.localStorage.setItem(_storageName, JSON.stringify(_data))
        ));
    }
}

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

    get(_storageName) {
        return new Promise(_resolve =>
            this.browser.storage.local.get(_storageName, _response =>
                _resolve(_response[_storageName])
            )
        );
    }

    set(_storageName, _data) {
        return new Promise(_resolve =>
            this.browser.storage.local.set({
                [_storageName]: _data
            }, _resolve)
        );
    }
}

class LocalVariableAdapter {
    constructor(_this) {
        this.context = _this;
    }

    get(_storageName) {
        return new Promise(_resolve => _resolve(this.context.data));
    }

    set(_storageName, _data) {
        return new Promise(_resolve => _resolve(this.context.data = _data));
    }
}


class SuperRepo {

    constructor(_config) {
        this.config = _config;

        /**
         * Helper variables to hold the currently pending Promise (this.promise)
         * and to determine if a Promise is currently pending or not.
         *
         * {@link https://stackoverflow.com/a/36294256/1333836}
         */
        this.promise = null;
        this.isPromisePending = false;

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
            case 'LOCAL_STORAGE':
            default: {
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
     * Checks if repository the data is up to date or not.
     *
     * @return {Boolean}
     */
    _isDataUpToDate(_localStore) {
        const isDataMissing =
            _localStore === null || // Local Storage
            typeof _localStore === 'undefined' || // Browser Storage
            Object.keys(_localStore.data).length === 0;

        if (isDataMissing) {
            return false;
        }

        if (_localStore.isInvalid) {
            return false;
        }

        const { lastFetched } = _localStore;

        const isLimitExceeded =
            (new Date().valueOf() - lastFetched) > this.config.cacheLimit;

        return ! isLimitExceeded;
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
     * @return {Promise}
     */
    invalidateData() {
        return this.storage.get(this.config.name).then(_data =>
            this.storage.set(this.config.name, Object.assign({}, _data, {
                isInvalid: true
            }))
        );
    }

    /**
     * Deletes the data from the storage.
     * Therefore, the very next time when the .getData() method is invoked,
     * it will directly call the server to get fresh data.
     *
     * @return {Promise}
     */
    clearData() {
        return this.storage.set(this.config.name, null);
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

        return this.promise = new Promise(_resolve => {

            this.storage.get(config.name).then(_localData => {
                if (this._isDataUpToDate(_localData)) {
                    this.promise = null;
                    this.isPromisePending = false;

                    _resolve(_localData.data);
                } else {
                    config.request()
                        .then(this._normalizeData.bind(this))
                        .then(this._mapData.bind(this))
                        .then(_response => {
                            this._storeData(_response);

                            this.promise = null;
                            this.isPromisePending = false;

                            return _response;
                        })
                        .then(_resolve);
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
    _initSyncInterval(_interval) {
        this.syncInterval = setInterval(
            () => this.getData(), _interval
        );
    }

    /**
     * Initiates a setInterval, which will countdown to the point
     * when the data is out of date (based on the `cacheLimit` value)
     * and will trigger a server request to get fresh data.
     *
     * @return {Void}
     */
    initSyncer() {
        this.storage.get(this.config.name).then(_localData => {
            if (this._isDataUpToDate(_localData)) {
                const { lastFetched } = _localData;
                const diff = new Date().valueOf() - lastFetched;

                this.syncInterval = this._initSyncInterval(diff);

                setTimeout( () => {
                    this.syncInterval = this._initSyncInterval(this.config.cacheLimit);
                }, diff);
            } else {
                this.getData().then(r => {
                    this.syncInterval = this._initSyncInterval(this.config.cacheLimit)

                    return r;
                });
            }
        });
    }

    /**
     * Destroys the setInterval, initiated by the .initSyncer() method.
     *
     * @return {Void}
     */
    destroySyncer() {
        this.syncInterval = null;
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
