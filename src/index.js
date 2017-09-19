class Repository {

    constructor(config) {
        this.config = config;
        this.syncInterval = null;
    }

    _normalizeData(_response) {
        const obj = {};

        Object.keys(this.config.dataModel).forEach(
            key => obj[key] = _response[this.config.dataModel[key]]
        );

        return obj;
    }

    /**
     * Checks if repository the data is up to date or not.
     *
     * @return {Boolean}
     */
    _isDataUpToDate(_localStore) {
        const isDataMissing =
            _localStore === null || Object.keys(_localStore.data).length === 0;

        if (isDataMissing) {
            return false;
        }

        const { lastFetched } = _localStore;

        const isLimitExceeded =
            (new Date().valueOf() - lastFetched) > this.config.cacheLimit;

        return ! isLimitExceeded;
    }

    _storeData(_data) {
        window.localStorage.setItem(this.config.name, JSON.stringify({
            lastFetched: new Date().valueOf(),
            data: _data
        }));
    }

    /**
     * Access the repository data.
     *
     * @return {Promise}
     */
    getData(){
        const localData = JSON.parse( window.localStorage.getItem(this.config.name) );

        if (this._isDataUpToDate(localData)) {
            return new Promise(_resolve => _resolve(localData.data));
        }

        return this.config.request()
            .then(this._normalizeData.bind(this))
            .then(response => {
                this._storeData(response);

                return response;
            });
    }

    initSyncer() {
        const localData = JSON.parse( window.localStorage.getItem(this.config.name) );

        if (this._isDataUpToDate(localData)) {
            const { lastFetched } = localData;
            const diff = new Date().valueOf() - lastFetched;

            this.syncInterval = setInterval( () => this.getData(), diff);
        } else {
            this.getData().then(r => {
                this.syncInterval = setInterval(
                    () => this.getData(), this.config.cacheLimit
                );

                return r;
            });
        }
    }

    destroySyncer() {
        this.syncInterval = null;
    }
};

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
