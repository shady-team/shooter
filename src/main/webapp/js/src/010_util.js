/** @define {boolean} */
var DEBUG = true;

var util = {};

(function () {
    util.noop = function noop() {
    };

    /**
     * @interface
     */
    util.Logger = function Logger() {
    };

    /**
     * @type {function(...[*])}
     */
    util.Logger.prototype.log = function () {
    };
    /**
     * @type {function(...[*])}
     */
    util.Logger.prototype.info = function () {
    };
    /**
     * @type {function(...[*])}
     */
    util.Logger.prototype.warn = function () {
    };
    /**
     * @type {function(...[*])}
     */
    util.Logger.prototype.error = function () {
    };
    /**
     * @param {boolean} test
     * @param {?string} message
     */
    util.Logger.prototype.assert = function (test, message) {
    };

    /**
     * @constructor
     * @implements {util.Logger}
     */
    util.ConsoleLogger = function ConsoleLogger() {
    };

    /**
     * @inheritDoc
     */
    util.ConsoleLogger.prototype.log = function () {
        console.log.apply(console, arguments);
    };

    /**
     * @inheritDoc
     */
    util.ConsoleLogger.prototype.info = function () {
        console.info.apply(console, arguments);
    };

    /**
     * @inheritDoc
     */
    util.ConsoleLogger.prototype.warn = function () {
        console.warn.apply(console, arguments);
    };

    /**
     * @inheritDoc
     */
    util.ConsoleLogger.prototype.error = function () {
        console.error.apply(console, arguments);
    };

    /**
     * @inheritDoc
     */
    util.ConsoleLogger.prototype.assert = function (test, message) {
        console.assert(test, message);
    };

    /**
     * @constructor
     * @implements {util.Logger}
     */
    util.NoopLogger = function NoopLogger() {
    };

    util.NoopLogger.prototype.log = function () {
    };
    util.NoopLogger.prototype.info = function () {
    };
    util.NoopLogger.prototype.warn = function () {
    };
    util.NoopLogger.prototype.error = function () {
    };
    util.NoopLogger.prototype.assert = function () {
    };

    /**
     * @type {util.Logger}
     */
    util.logger = (function () {
        if (DEBUG) return new util.ConsoleLogger();
        return new util.NoopLogger();
    })();

    /**
     * @type {function(this:util.Logger,boolean,string)}
     */
    util.assert = util.logger.assert.bind(util.logger);

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
     * @param {number} x
     */
    util.sign = function (x) {
        return (x > 0) - (x < 0);
    }
})();