// requires util

/** @const */
var events = {};

(function () {
    /**
     * @constructor
     */
    events.WithEvents = function WithEvents() {
        /**
         * @type {Object.<string,Array.<function(...[*])>>}
         * @private
         */
        this._handlers = Object.create(null);
    };

    /**
     * @param {string} type
     * @param {*} handler
     */
    events.WithEvents.prototype.on = function (type, handler) {
        (this._handlers[type] || (this._handlers[type] = [])).push(handler);
    };

    /**
     * @param {string} type
     * @param {*} handler
     */
    events.WithEvents.prototype.off = function (type, handler) {
        if (!this._handlers[type])
            return;
        if (handler === undefined) {
            delete this._handlers[type];
        } else {
            var idx = this._handlers[type].indexOf(handler);
            if (idx !== -1)
                this._handlers[type].splice(idx, 1);
        }
    };

    /**
     * @type {function(string,...[*])}
     */
    events.WithEvents.prototype.fire = function (type) {
        if (!this._handlers[type])
            return;
        var handlers = this._handlers[type].slice();
        var data = Array.prototype.slice.call(arguments, 1);
        handlers.forEach(function (handler) {
            try {
                handler.apply(this, data);
            } catch (err) {
                util.logger.error("Error while processing event " + type + " with data ", data, err);
            }
        }, this);
    };

    events.E_OPEN = 'open';
    events.E_MESSAGE = 'message';
    events.E_CLOSE = 'close';
    events.E_ERROR = 'error';
})();