module('util', [], function () {
    /**
     * @constructor
     */
    function ConsoleLogger() {
    }

    /**
     * @type {function(...*)}
     */
    ConsoleLogger.prototype.log = function () {
        console.log.apply(console, arguments);
    };

    /**
     * @type {function(...*)}
     */
    ConsoleLogger.prototype.info = function () {
        console.info.apply(console, arguments);
    };

    /**
     * @type {function(...*)}
     */
    ConsoleLogger.prototype.warn = function () {
        console.warn.apply(console, arguments);
    };

    /**
     * @type {function(...*)}
     */
    ConsoleLogger.prototype.error = function () {
        console.error.apply(console, arguments);
    };

    return {
        logger: new ConsoleLogger()
    };
});