// requires util
(function () {

    /**
     * @param {string} handler
     * @param {number} timeout between handler calls in milliseconds
     * @constructor
     */
    events.WhileKeyDownHandler = function WhileKeyDownHandler(handler, timeout) {
        this.handler = handler;
        this.timeout = timeout;
        this.keyDownTime = null;
        this.lastNotificationTime = null;
        this.eventData = null;
    };

    events.WhileKeyDownHandler.prototype.onKeyDown = function (eventTime, data) {
        if (this.keyDownTime != null) {
            return;
        }
        this.keyDownTime = eventTime;
        this.lastNotificationTime = eventTime;
        this.eventData = data;
    };

    events.WhileKeyDownHandler.prototype.onKeyUp = function () {
        this.keyDownTime = null;
        this.lastNotificationTime = null;
        this.eventData = null;
    };

    /**
     * @param {number} eventTime
     */
    events.WhileKeyDownHandler.prototype.handle = function (eventTime) {
        if (this.keyDownTime == null) {
            return;
        }
        var passedTime = eventTime - this.lastNotificationTime;
        if (passedTime < this.timeout) {
            return;
        }
        var args = this.eventData.slice();
        args.unshift(eventTime - this.keyDownTime);
        args.unshift(passedTime);
        this.handler.apply(this, args);
        this.lastNotificationTime = eventTime;
    };

    /**
     * @constructor
     */
    events.WithEvents = function WithEvents() {
        /**
         * @type {Object.<string,Array.<function(...[*])>>}
         * @private
         */
        this._handlers = util.emptyObject();
        /**
         * @type {Object.<string,Array.<WhileKeyDownHandler>>}
         * @private
         */
        this._whileKeyDownHandlers = util.emptyObject();
        this._minTimeout = 15;
        window.setTimeout(this._createRepeatedCallbackCall(), this._minTimeout);
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
     * @param {*=} handler
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
        var currentTime = new Date().getTime();
        var data = Array.prototype.slice.call(arguments, 1);
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
        var keyCode;
        if (type.lastIndexOf(events.E_KEY_DOWN, 0) === 0) {
            keyCode = parseInt(type.substring(events.E_KEY_DOWN.length, type.length));
            if (this._whileKeyDownHandlers[keyCode]) {
                handlers = this._whileKeyDownHandlers[keyCode].slice();
                handlers.forEach(function (handler) {
                    handler.onKeyDown(currentTime, data);
                }, this);
            }
        } else if (type.lastIndexOf(events.E_KEY_UP, 0) === 0) {
            keyCode = parseInt(type.substring(events.E_KEY_UP.length, type.length));
            if (this._whileKeyDownHandlers[keyCode]) {
                handlers = this._whileKeyDownHandlers[keyCode].slice();
                handlers.forEach(function (handler) {
                    handler.onKeyUp();
                }, this);
            }
        }
    };

    events.WithEvents.prototype._createRepeatedCallbackCall = function () {
        var that = this;
        return function () {
            that._repeatedCallback();
        };
    };

    events.WithEvents.prototype._repeatedCallback = function () {
        var currentTime = new Date().getTime();
        for (var type in this._whileKeyDownHandlers) {
            var handlers = this._whileKeyDownHandlers[type];
            handlers.forEach(function (handler) {
                handler.handle(currentTime);
            }, this);
        }
        window.setTimeout(this._createRepeatedCallbackCall(), this._minTimeout);
    };

    /**
     * @param {number} keyCode
     * @param {number} timeout between handler calls in milliseconds
     * @param {*} handler
     */
    events.WithEvents.prototype.registerWhileKeyDown = function (keyCode, timeout, handler) {
        (this._whileKeyDownHandlers[keyCode] || (this._whileKeyDownHandlers[keyCode] = []))
            .push(new events.WhileKeyDownHandler(handler, timeout));
    };

    /**
     * @param {number} keyCode
     * @param {*=} handler
     */
    events.WithEvents.prototype.unregisterWhileKeyDown = function (keyCode, handler) {
        if (!this._whileKeyDownHandlers[keyCode])
            return;
        if (handler === undefined) {
            delete this._whileKeyDownHandlers[keyCode];
        } else {
            for (var i = 0; i < this._whileKeyDownHandlers[keyCode].length; i++) {
                if (this._whileKeyDownHandlers[keyCode].handler == handler) {
                    this._whileKeyDownHandlers[keyCode].splice(i, 1);
                    i--;
                }
            }
        }
    };

    events.E_OPEN = 'open';
    events.E_MESSAGE = 'message';
    events.E_CLOSE = 'close';
    events.E_ERROR = 'error';

    /** @const {string} */
    events.E_MOUSE_DOWN = 'mouseDown';
    /** @const {string} */
    events.E_MOUSE_MOVE = 'mouseMove';
    /** @const {string} */
    events.E_MOUSE_UP = 'mouseUp';
    /** @const {string} */
    events.E_KEY_DOWN = 'keyDown#';
    /** @const {string} */
    events.E_KEY_UP = 'keyUp#';
})();