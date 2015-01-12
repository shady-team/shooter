(function () {
    if (DEBUG) {
        /** @type {function(...[*])} */
        util.log = console.log.bind(console);
        /** @type {function(...[*])} */
        util.info = console.info.bind(console);
        /** @type {function(...[*])} */
        util.warn = console.warn.bind(console);
        /** @type {function(...[*])} */
        util.error = console.error.bind(console);
        /**
         * @param {boolean} test
         * @param {string} message
         */
        util.assert = function (test, message) {
            console.assert(test, message);
            if (!test) {
                throw new Error(message);
            }
        };
    } else {
        /** @type {function(...[*])} */
        util.log = function () {
        };
        /** @type {function(...[*])} */
        util.info = function () {
        };
        /** @type {function(...[*])} */
        util.warn = function () {
        };
        /** @type {function(...[*])} */
        util.error = function () {
        };
        /**
         * @param {boolean} test
         * @param {string} message
         */
        util.assert = function (test, message) {
        };
    }

    /**
     * @param {*} value
     * @param {string} message
     */
    util.assertDefined = function (value, message) {
        util.assert(util.isDefined(value), message);
    };

    /**
     * @template A, B, C
     * @param {function(A,B):C} func
     * @return {function(B,A):C}
     */
    util.swapBinary = function (func) {
        return function (a, b) {
            return func(b, a);
        }
    };

    /**
     * @const
     * @type {function()}
     */
    util.noop = function noop() {
    };

    /**
     * @template T
     * @param {T} x
     * @return {T}
     */
    util.identity = function (x) {
        return x;
    };

    /**
     * @param {number} x
     */
    util.sign = function (x) {
        return (x > 0) - (x < 0);
    };

    /**
     * @param {*} value
     * @return {boolean}
     */
    util.isArray = function (value) {
        return Array.isArray(value);
    };

    /**
     * @param {*} value
     * @return {boolean}
     */
    util.isFunction = function (value) {
        return typeof value === 'function';
    };

    /**
     * @param {*} value
     * @return {boolean}
     */
    util.isString = function (value) {
        return typeof value === 'string';
    };

    /**
     * @param {*} value
     * @return {boolean}
     */
    util.isDefined = function (value) {
        return value !== void 0 && value !== null;
    };

    /**
     * @param {boolean=} s
     * @return {string}
     */
    function guidPart(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }

    /**
     * @return {string}
     */
    util.genUUID = function () {
        return guidPart() + guidPart(true) + guidPart(true) + guidPart();
    };

    /**
     * @template T
     * @return {T}
     */
    util.emptyObject = function () {
        return Object.create(null);
    };

    /**
     * @param {function(?):string} typeExtractor
     * @constructor
     */
    util.ReviversHolder = function (typeExtractor) {
        /**
         * @type {Object.<string, function(?):?>}
         * @private
         */
        this._revivers = util.emptyObject();
        this._typeExtractor = typeExtractor;
    };

    /**
     * @param {string} type
     * @param {function(?):?} reviver
     */
    util.ReviversHolder.prototype.registerReviver = function (type, reviver) {
        this._revivers[type] = reviver;
    };

    /**
     * @template T
     * @param {T} object
     * @return {T}
     */
    util.ReviversHolder.prototype.revive = function (object) {
        var type = this._typeExtractor.call(null, object),
            reviver = this._revivers[type];
        util.assertDefined(type, "Bad object, type is not defined");
        util.assertDefined(reviver, "Object has no registered reviver");
        return reviver.call(null, object);
    }
})();