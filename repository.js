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
     * Checks weather the data is up to date or not.
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
     * Get current weather.
     * @return {Promise}
     */
    get(){
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

            this.syncInterval = setInterval( () => this.get(), diff);
        } else {
            this.get().then(r => {
                this.syncInterval = setInterval(
                    () => this.get(), this.config.cacheLimit
                );

                return r;
            });
        }
    }

    destroySyncer() {
        this.syncInterval = null;
    }
};
