goog.provide('events');

goog.require('util');

(function () {

    /**
     * @constructor
     */
    events.WithEvents = function WithEvents() {
        /**
         * @type {Object.<string,Array.<Function>>}
         * @private
         */
        this._handlers = util.emptyObject();
    };

    /**
     * @param {string} type
     * @param {Function} handler
     */
    events.WithEvents.prototype.on = function (type, handler) {
        if (!this._handlers[type])
            this._handlers[type] = [];
        this._handlers[type].push(handler);
    };

    /**
     * @param {string} type
     * @param {Function=} handler
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
        var data = [].slice.call(arguments, 1);
        var handlers;
        if (this._handlers[type]) {
            handlers = this._handlers[type].slice();
            handlers.forEach(function (handler) {
                try {
                    handler.apply(this, data);
                } catch (err) {
                    util.error("Error while processing event " + type + " with data ", data, err.message);
                }
            }, this);
        }
    };

    /**
     * @constructor
     * @extends {events.WithEvents}
     */
    events.WithRegularEvents = function WithRegularEvents() {
        events.WithEvents.call(this);
        /**
         * @type {Object.<string, number>}
         * @private
         */
        this._timeoutOfRegularEvent = util.emptyObject();
        /**
         * @type {Object.<string, number>}
         * @private
         */
        this._lastFire = util.emptyObject();
        /**
         * @const
         * @type {number}
         * @private
         */
        this._timeout = 15;
        /**
         * @type {number}
         * @private
         */
        this._intervalTimer = setInterval(fireRegularEvents.bind(this), this._timeout);
    };

    events.WithRegularEvents.prototype = Object.create(events.WithEvents.prototype);

    /**
     * @param {string} type
     * @param {number} timeout - delay in ms between events
     *    (it is a recommendation, real delay is the smallest multiple of {@see input.InputHandler#_timeout} not less than handler)
     */
    events.WithRegularEvents.prototype.setRegularEvent = function (type, timeout) {
        if (this._timeoutOfRegularEvent[type]) {
            timeout = Math.min(timeout, this._timeoutOfRegularEvent[type]);
        }
        this._timeoutOfRegularEvent[type] = timeout;
        this._lastFire[type] = new Date().getTime();
    };

    /**
     * @param {string} type
     */
    events.WithRegularEvents.prototype.removeRegularEvent = function (type) {
        delete this._timeoutOfRegularEvent[type];
        delete this._lastFire[type];
    };

    /**
     * @this {events.WithRegularEvents}
     */
    function fireRegularEvents() {
        var currentTime = new Date().getTime();
        for (var type in this._timeoutOfRegularEvent) {
            var delay = this._timeoutOfRegularEvent[type];
            if (this._lastFire[type] + delay <= currentTime) {
                this.fire(type, currentTime - this._lastFire[type]);
                this._lastFire[type] = currentTime;
            }
        }
    }

    /**
     * @const {string}
     */
    events.E_OPEN = 'open';
    /**
     * @const {string}
     */
    events.E_MESSAGE = 'message';
    /**
     * @const {string}
     */
    events.E_CLOSE = 'close';
    /**
     * @const {string}
     */
    events.E_ERROR = 'error';
})();