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


class Repository {

    constructor(_config) {
        this.config = _config;
        this.syncInterval = null;
        this.data = null;

        /**
         * Helper variables to hold the currently pending Promise (this.promise)
         * and to determine if a Promise is currently pending or not.
         *
         * {@link https://stackoverflow.com/a/36294256/1333836}
         */
        this.promise = null;
        this.isPromisePending = false;

        switch(this.config.storage) {
            case 'LOCAL_VARIABLE':
                this.storage = new LocalVariableAdapter(this);
                break;
            case 'BROWSER_STORAGE':
                this.storage = new BrowserStorageAdapter();
                break;
            case 'LOCAL_STORAGE':
            default:
                this.storage = new LocalStorageAdapter();
                break;
        }
    }

    _normalizeData(_response) {
        const { dataModel } = this.config;

        if (Array.isArray(dataModel)) {
            return _response.map( item => {
                const obj = {};

                Object.keys(dataModel[0]).forEach(
                    key => obj[key] = item[dataModel[0][key]]
                );

                return obj;
            });
        } else {
            const obj = {};

            Object.keys(dataModel).forEach(
                key => obj[key] = _response[dataModel[key]]
            );

            return obj;
        }
    }

    /**
     * After the data model is applied,
     * mapping the response gives an option for further processing the data.
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

    _storeData(_data) {
        this.storage.set(this.config.name, {
            lastFetched: new Date().valueOf(),
            isInvalid: false,
            data: _data
        });
    }

    invalidateData() {
        return this.storage.get(this.config.name).then(_data =>
            this.storage.set(this.config.name, Object.assign({}, _data, {
                isInvalid: true
            }))
        );
    }

    clearData() {
        return this.storage.set(this.config.name, null);
    }

    /**
     * Access the repository data.
     *
     * @return {Promise}
     */
    getData(){
        // If there is a Promise pending, wait for it, do not fire another one!
        if (this.isPromisePending) {
            return this.promise;
        }

        this.isPromisePending = true;
        const localData = this.storage.get(this.config.name);

        return this.promise = new Promise(_resolve => {
            localData.then(_localData => {
                if (this._isDataUpToDate(_localData)) {
                    _resolve(_localData.data);
                } else {
                    this.config.request()
                        .then(this._normalizeData.bind(this))
                        .then(this._mapData.bind(this))
                        .then(response => {
                            this._storeData(response);
                            this.isPromisePending = false;

                            return response;
                        })
                        .then(_resolve);
                }
            });
        });
    }

    _initSyncInterval(_interval) {
        this.syncInterval = setInterval(
            () => this.getData(), _interval
        );
    }

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
    return Repository;
}));
