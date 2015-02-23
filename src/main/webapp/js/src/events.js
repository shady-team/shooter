goog.provide('events');

goog.require('util');

(function () {

    /**
     * @interface
     */
    events.WithEvents = function () {
    };

    /**
     * @param {string} type
     * @param {Function} handler
     */
    events.WithEvents.prototype.on = function (type, handler) {
    };

    /**
     * @param {string} type
     * @param {Function=} handler
     */
    events.WithEvents.prototype.off = function (type, handler) {
    };

    /**
     * @type {function(string,...[*])}
     */
    events.WithEvents.prototype.fire = function (type) {
    };

    /**
     * @constructor
     * @implements {events.WithEvents}
     */
    events.EventBus = function () {
        /**
         * @type {Object.<string,Array.<Function>>}
         * @private
         */
        this._handlers = util.emptyObject();
    };

    /**
     * @param {string} type
     * @param {Function} handler
     * @override
     */
    events.EventBus.prototype.on = function (type, handler) {
        if (!this._handlers[type])
            this._handlers[type] = [];
        this._handlers[type].push(handler);
    };

    /**
     * @param {string} type
     * @param {Function=} handler
     * @override
     */
    events.EventBus.prototype.off = function (type, handler) {
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
     * @override
     */
    events.EventBus.prototype.fire = function (type) {
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
     * @const {number}
     */
    var timeout = 15;

    /**
     * @constructor
     * @extends {events.EventBus}
     */
    events.ContinuousEventBus = function () {
        events.EventBus.call(this);
        /**
         * @type {Object.<string, *>}
         * @private
         */
        this._activeEvents = Object.create(null);
        /**
         * @type {number}
         * @private
         */
        this._intervalTimer = setInterval(fireRegularEvents.bind(this), timeout);
    };

    events.ContinuousEventBus.prototype = Object.create(events.EventBus.prototype);

    /**
     * @param {string} type
     * @param {*=} data
     * @protected
     */
    events.ContinuousEventBus.prototype.activate = function (type, data) {
        this._activeEvents[type] = data;
    };

    /**
     * @param {string} type
     * @protected
     */
    events.ContinuousEventBus.prototype.deactivate = function (type) {
        delete this._activeEvents[type];
    };

    /**
     * @this {events.ContinuousEventBus}
     */
    function fireRegularEvents() {
        for (var type in this._activeEvents) {
            var data = this._activeEvents[type];
            this.fire(type, data);
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
    /**
     * @const {string}
     */
    events.E_UPDATE_STEP = 'updateState';
})();