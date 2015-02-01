goog.provide('util');

/** @define {boolean} */
var DEBUG = true;

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
         * @param {string=} message
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
         * @param {string=} message
         */
        util.assert = function (test, message) {
        };
    }

    /**
     * @param {*} value
     * @param {string=} message
     */
    util.assertDefined = function (value, message) {
        util.assert(util.isDefined(value), message);
    };

    /**
     * @param {*} value
     * @param {string=} message
     */
    util.assertUndefined = function (value, message) {
        util.assert(!util.isDefined(value), message);
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
     * @template T
     * @param {number} n
     * @param {T|function(number):T=} provider
     * @return {Array.<T>}
     */
    util.arrayOf = function (n, provider) {
        var result = [], i;
        for (i = 0; i < n; ++i) {
            if (util.isFunction(provider)) {
                result.push(provider.call(null, i));
            } else {
                result.push(provider);
            }
        }
        return result;
    };

    /**
     * @param {*} object
     * @return {boolean}
     */
    util.isObjectEmpty = function (object) {
        for (var prop in object) {
            return false;
        }
        return true;
    };

    /**
     * @param {number} delay
     * @param {Function} func
     * @return {Function}
     */
    util.throttle = function (delay, func) {
        var lastExecution = 0;
        return function () {
            var now = Date.now();
            if (now - lastExecution >= delay) {
                if (now - lastExecution >= delay * 2) {
                    [].unshift.call(arguments, 0);
                } else {
                    [].unshift.call(arguments, now - lastExecution);
                }
                lastExecution = now;
                return func.apply(this, arguments);
            }
        };
    };

    Uint16Array.prototype.max = function () {//TODO: function with arg
        var max = this[0];
        for (var i = 1; i < this.length; i++) {
            if (this[i] > max) {
                max = this[i];
            }
        }
        return max;
    };

    Uint16Array.prototype.min = function () {
        var min = this[0];
        for (var i = 1; i < this.length; i++) {
            if (this[i] < min) {
                min = this[i];
            }
        }
        return min;
    };
})();