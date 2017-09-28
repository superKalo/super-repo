var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Adapter that stores the data in the Local Storage.
 */
var LocalStorageAdapter = function () {
    function LocalStorageAdapter() {
        _classCallCheck(this, LocalStorageAdapter);
    }

    _createClass(LocalStorageAdapter, [{
        key: 'get',

        /**
         * Get the cached data.
         *
         * @param  {String} _storageName - the `name` setting from the config
         * @return {Promise}
         */
        value: function get(_storageName) {
            return new Promise(function (_resolve) {
                return _resolve(JSON.parse(window.localStorage.getItem(_storageName)));
            });
        }

        /**
         * Set cached data.
         *
         * @param {[type]} _storageName - the `name` setting from the config
         * @param {Object} or {Array} _data
         * @return {Promise}
         */

    }, {
        key: 'set',
        value: function set(_storageName, _data) {
            return new Promise(function (_resolve) {
                return _resolve(window.localStorage.setItem(_storageName, JSON.stringify(_data)));
            });
        }
    }]);

    return LocalStorageAdapter;
}();

/**
 * Adapter that stores the data in the Browser Storage (local).
 * If you're building a browser extension, that's the way to store data.
 */


var BrowserStorageAdapter = function () {
    function BrowserStorageAdapter() {
        _classCallCheck(this, BrowserStorageAdapter);

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


    _createClass(BrowserStorageAdapter, [{
        key: 'get',
        value: function get(_storageName) {
            var _this2 = this;

            return new Promise(function (_resolve) {
                return _this2.browser.storage.local.get(_storageName, function (_response) {
                    return _resolve(_response[_storageName]);
                });
            });
        }

        /**
         * Set cached data.
         *
         * @param {[type]} _storageName - the `name` setting from the config
         * @param {Object} or {Array} _data
         * @return {Promise}
         */

    }, {
        key: 'set',
        value: function set(_storageName, _data) {
            var _this3 = this;

            return new Promise(function (_resolve) {
                return _this3.browser.storage.local.set(_defineProperty({}, _storageName, _data), _resolve);
            });
        }
    }]);

    return BrowserStorageAdapter;
}();

/**
 * Adapter that stores the data in a local `.data` variable,
 * attached to the class instance.
 * Convenient if you don’t want to store data across browser sessions.
 */


var LocalVariableAdapter = function () {
    /**
     * Sets a reference to the context, so we can access the instance's `.data`
     * @param  {Object} _this - the `this` context of the class instance.
     */
    function LocalVariableAdapter(_this) {
        _classCallCheck(this, LocalVariableAdapter);

        this.context = _this;
    }

    /**
     * Get the cached data.
     *
     * @param {String} _storageName - the `name` setting from the config,
     *                                which we don't need for this adapter.
     * @return {Promise}
     */


    _createClass(LocalVariableAdapter, [{
        key: 'get',
        value: function get(_storageName) {
            var _this4 = this;

            return new Promise(function (_resolve) {
                return _resolve(_this4.context.data);
            });
        }

        /**
         * Set cached data.
         *
         * @param {String} _storageName - the `name` setting from the config,
         *                                which we don't need for this adapter.
         * @param {Object} or {Array} _data
         * @return {Promise}
         */

    }, {
        key: 'set',
        value: function set(_storageName, _data) {
            var _this5 = this;

            return new Promise(function (_resolve) {
                return _resolve(_this5.context.data = _data);
            });
        }
    }]);

    return LocalVariableAdapter;
}();

var SuperRepo = function () {
    function SuperRepo(_config) {
        _classCallCheck(this, SuperRepo);

        this.config = _config;

        /** Default out of date period  */
        var outOfDateAfter = _config.outOfDateAfter;

        var outOfDateAfterIsMissing = typeof outOfDateAfter === 'undefined' || outOfDateAfter === null;
        if (outOfDateAfterIsMissing || outOfDateAfter === -1 || outOfDateAfter < 1000) {
            // Due to performance reasons, make sure `outOfDateAfter` period
            // is not faster than 1 second.
            this.config.outOfDateAfter = 1000;
        }

        /**
         * Helper variables to hold the currently pending Promise (this.promise)
         * and to determine if a Promise is currently pending or not.
         *
         * {@link https://stackoverflow.com/a/36294256/1333836}
         */
        this.promise = null;
        this.isPromisePending = false;

        switch (this.config.storage) {
            case 'LOCAL_VARIABLE':
                {
                    // Introduce this local variable to hold the repository data
                    this.data = null;

                    this.storage = new LocalVariableAdapter(this);
                    break;
                }
            case 'BROWSER_STORAGE':
                {
                    this.storage = new BrowserStorageAdapter();
                    break;
                }
            case 'LOCAL_STORAGE':
            default:
                {
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


    _createClass(SuperRepo, [{
        key: '_normalizeData',
        value: function _normalizeData(_response) {
            var dataModel = this.config.dataModel;


            var isMissing = typeof dataModel === 'undefined' || dataModel === null;

            if (isMissing) {
                return _response;
            }

            var isArray = Array.isArray(dataModel);

            if (isArray) {
                return _response.map(function (item) {
                    var obj = {};

                    Object.keys(dataModel[0]).forEach(function (key) {
                        return obj[key] = item[dataModel[0][key]];
                    });

                    return obj;
                });
            }

            // In all other cases - it should be an Array of Objects.
            var obj = {};

            Object.keys(dataModel).forEach(function (key) {
                return obj[key] = _response[dataModel[key]];
            });

            return obj;
        }

        /**
         * After the data model is applied via ._normalizeData(),
         * mapping the response gives an option for further processing the data.
         *
         * @param  {Object} or {Array} _response - server response
         * @return {Object} or {Array}
         */

    }, {
        key: '_mapData',
        value: function _mapData(_response) {
            var mapData = this.config.mapData;


            return typeof mapData === 'function' ? mapData(_response) : _response;
        }

        /**
         * Checks if the repository data is up to date or not.
         *
         * @return {Promise}
         */

    }, {
        key: 'getDataUpToDateStatus',
        value: function getDataUpToDateStatus() {
            var _this6 = this;

            return new Promise(function (_resolve) {
                _this6.storage.get(_this6.config.name).then(function (_localStore) {

                    var isDataMissing = _localStore === null || // Local Storage
                    typeof _localStore === 'undefined' || // Browser Storage
                    Object.keys(_localStore.data).length === 0;

                    if (isDataMissing) {
                        _resolve({
                            isDataUpToDate: false,
                            localData: _localStore
                        });
                    } else if (_localStore.isInvalid) {
                        _resolve({
                            isDataUpToDate: false,
                            localData: _localStore
                        });
                    } else {
                        var lastFetched = _localStore.lastFetched;

                        var isLimitExceeded = new Date().valueOf() - lastFetched > _this6.config.outOfDateAfter;

                        _resolve({
                            isDataUpToDate: !isLimitExceeded,
                            localData: _localStore
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

    }, {
        key: '_storeData',
        value: function _storeData(_data) {
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

    }, {
        key: 'invalidateData',
        value: function invalidateData() {
            var _this7 = this;

            return new Promise(function (_resolve) {

                _this7.storage.get(_this7.config.name).then(function (_prevData) {
                    var nextData = Object.assign({}, _prevData, {
                        isInvalid: true
                    });

                    _this7.storage.set(_this7.config.name, nextData).then(function () {
                        return _resolve({
                            prevData: _prevData,
                            nextData: nextData
                        });
                    });
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

    }, {
        key: 'clearData',
        value: function clearData() {
            var _this8 = this;

            return new Promise(function (_resolve) {

                _this8.storage.get(_this8.config.name).then(function (_prevData) {
                    _this8.storage.set(_this8.config.name, null).then(function () {
                        return _resolve(_prevData);
                    });
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

    }, {
        key: '_requestFreshData',
        value: function _requestFreshData() {
            var _this9 = this;

            return this.config.request().then(this._normalizeData.bind(this)).then(this._mapData.bind(this)).then(function (_response) {
                _this9._storeData(_response);

                return _response;
            });
        }

        /**
         * Gets data from the server (if it’s missing or outdated on our side)
         * or otherwise - gets it from the cache.
         *
         * @return {Promise}
         */

    }, {
        key: 'getData',
        value: function getData() {
            var _this10 = this;

            var config = this.config;

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

            return this.promise = new Promise(function (_resolve) {

                _this10.getDataUpToDateStatus().then(function (_res) {
                    if (_res.isDataUpToDate) {
                        _this10.promise = null;
                        _this10.isPromisePending = false;

                        _resolve(_res.localData.data);
                    } else {
                        _this10._requestFreshData().then(function (_response) {
                            _this10.promise = null;
                            _this10.isPromisePending = false;

                            return _response;
                        }).then(_resolve);
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

    }, {
        key: '_initSyncInterval',
        value: function _initSyncInterval(_interval) {
            var _this11 = this;

            return setInterval(function () {
                return _this11._requestFreshData();
            }, _interval);
        }

        /**
         * Initiates a setInterval, which will countdown to the point
         * when the data is out of date (based on the `outOfDateAfter` value)
         * and will trigger a server request to get fresh data.
         *
         * @return {Void}
         */

    }, {
        key: 'initSyncer',
        value: function initSyncer() {
            var _this12 = this;

            return new Promise(function (_resolve) {
                _this12.getDataUpToDateStatus().then(function (_res) {
                    if (_res.isDataUpToDate) {
                        var lastFetched = _res.localData.lastFetched;


                        var diff = new Date().valueOf() - lastFetched;
                        var remainingTime = _this12.config.outOfDateAfter - diff;

                        // Do not initiate intervals which are quicker then a second,
                        // otherwise, this might be a big network (performance) overhead.
                        remainingTime = remainingTime < 1000 ? 1000 : remainingTime;

                        _this12.syncInterval = _this12._initSyncInterval(remainingTime);

                        setTimeout(function () {
                            _this12.destroySyncer();

                            _this12.syncInterval = _this12._initSyncInterval(_this12.config.outOfDateAfter);
                        }, remainingTime);

                        _resolve();
                    } else {
                        _this12._requestFreshData().then(function (_response) {
                            _this12.syncInterval = _this12._initSyncInterval(_this12.config.outOfDateAfter);

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

    }, {
        key: 'destroySyncer',
        value: function destroySyncer() {
            clearInterval(this.syncInterval);
        }
    }]);

    return SuperRepo;
}();

;

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
            return root.returnExportsGlobal = factory();
        });
    } else if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals
        root.returnExportsGlobal = factory();
    }
})(this, function () {
    // Just return a value to define the module export.
    // This example returns an object, but the module
    // can return a function as the exported value.
    return SuperRepo;
});