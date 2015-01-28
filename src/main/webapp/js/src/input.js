goog.provide('input');

goog.require('util');
goog.require('events');

(function () {
    /**
     * @constructor
     */
    input.MouseState = function () {
        /**
         * @type {number}
         */
        this.absX = -1;
        /**
         * @type {number}
         */
        this.absY = -1;
        /**
         * @type {number}
         */
        this.relX = 0;
        /**
         * @type {number}
         */
        this.relY = 0;
        /**
         * @type {number}
         */
        this.buttons = 0;
    };

    /**
     * @constructor
     */
    input.KeyboardState = function () {
        /**
         * @type {Object.<number, boolean>}
         */
        this.isKeyDown = util.emptyObject();
    };

    /**
     * @param {input.MouseState} state
     * @param {MouseEvent} evt
     */
    function updatePosition(state, evt) {
        var target = evt.currentTarget,
            x = evt.clientX,
            y = evt.clientY;
        while (target && !isNaN(target.offsetLeft) && !isNaN(target.offsetTop)) {
            x -= target.offsetLeft - target.scrollLeft;
            y -= target.offsetTop - target.scrollTop;
            target = target.offsetParent;
        }
        state.relX = x - state.absX;
        state.relY = y - state.absY;
        state.absX = x;
        state.absY = y;
    }

    /**
     * @param {input.MouseState} state
     * @param {MouseEvent} evt
     */
    function updateMouseState(state, evt) {
        updatePosition(state, evt);
        switch (evt.type) {
            case 'mousedown':
                state.buttons |= 1 << evt.button;
                break;
            case 'mouseup':
                state.buttons &= -1 ^ (1 << evt.button);
                break;
        }
    }

    /**
     * @enum {number}
     */
    input.Button = {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2
    };

    var minTimeout = 15;

    /**
     * @constructor
     * @extends {events.WithEvents}
     */
    input.InputHandler = function () {
        events.WithEvents.call(this);
        /**
         * @type {?HTMLElement}
         * @private
         */
        this._attachedTo = null;
        /**
         * @type {Object.<string, function(this:input.InputHandler,?)>}
         * @private
         */
        this._domHandlers = bindHandlers(domHandlers, this);
        /**
         * @type {input.MouseState}
         * @private
         */
        this._mouseState = new input.MouseState();
        /**
         * @type {input.KeyboardState}
         * @private
         */
        this._keyboardState = new input.KeyboardState();
        /**
         * @type {Object.<number,Array.<input.WhileKeyDownHandler>>}
         * @private
         */
        this._whileKeyDownHandlers = util.emptyObject();

        this.startNotifingWhileKeyIsDown();
    };

    input.InputHandler.prototype = Object.create(events.WithEvents.prototype);

    input.InputHandler.prototype.startNotifingWhileKeyIsDown = function () {
        this._intervalTimer = setInterval(repeatedCallback.bind(this), minTimeout);
    };

    input.InputHandler.prototype.stopNotifingWhileKeyIsDown = function () {
        clearInterval(this._intervalTimer);
        this._intervalTimer = null;
    };

    /**
     * @type {Object.<string,function(?)>}
     */
    var domHandlers = {
        'mousedown': mouseDownHandler,
        'mousemove': mouseMoveHandler,
        'mouseup': mouseUpHandler,
        'keyup': keyUpHandler,
        'keydown': keyDownHandler,
        'contextmenu': util.noop
    };

    /**
     * @param {function(?)} handler
     * @param {Event} evt
     */
    function cancellingWrapper(handler, evt) {
        evt.preventDefault();
        handler.call(this, evt);
        return false;
    }

    /**
     * @template T
     * @param {Object.<string, function(?)>} handlers
     * @param {T} bindTo
     * @return {Object.<string, function(this:T,?)>}
     */
    function bindHandlers(handlers, bindTo) {
        var binded = {};
        for (var event in handlers) {
            binded[event] = cancellingWrapper.bind(bindTo, handlers[event]);
        }
        return binded;
    }

    /**
     * @this {input.InputHandler}
     * @param {MouseEvent} evt
     */
    function mouseDownHandler(evt) {
        updateMouseState(this._mouseState, evt);
        this.fire(input.E_MOUSE_DOWN, this.getAbsoluteX(), this.getAbsoluteY(), evt.button);
    }

    /**
     * @this {input.InputHandler}
     * @param {MouseEvent} evt
     */
    function mouseUpHandler(evt) {
        updateMouseState(this._mouseState, evt);
        this.fire(input.E_MOUSE_UP, this.getAbsoluteX(), this.getAbsoluteY(), evt.button);
    }

    /**
     * @param {function(...[?]):?} handler
     * @param {number} timeout between handler calls in milliseconds
     * @constructor
     */
    input.WhileKeyDownHandler = function WhileKeyDownHandler(handler, timeout) {
        this.handler = handler;
        this.timeout = timeout;
        /**
         * @type {?number}
         */
        this.keyDownTime = null;
        this.lastNotificationTime = null;
    };

    input.WhileKeyDownHandler.prototype.onKeyDown = function (eventTime) {
        if (this.keyDownTime != null) {
            return;
        }
        this.keyDownTime = eventTime;
        this.lastNotificationTime = eventTime;
    };

    input.WhileKeyDownHandler.prototype.onKeyUp = function () {
        this.keyDownTime = null;
        this.lastNotificationTime = null;
    };

    /**
     * @param {number} eventTime
     */
    input.WhileKeyDownHandler.prototype.handle = function (eventTime) {
        if (this.keyDownTime == null) {
            return;
        }
        var passedTime = eventTime - this.lastNotificationTime;
        if (passedTime < this.timeout) {
            return;
        }
        var args = [];
        args.unshift(eventTime - this.keyDownTime);
        args.unshift(passedTime);
        this.handler.apply(this, args);
        this.lastNotificationTime = eventTime;
    };

    function repeatedCallback() {
        var currentTime = new Date().getTime();
        for (var type in this._whileKeyDownHandlers) {
            var handlers = this._whileKeyDownHandlers[type];
            handlers.forEach(function (handler) {
                handler.handle(currentTime);
            }, this);
        }
    }

    /**
     * @param {number} keyCode
     * @param {number} timeout between handler calls in milliseconds
     * @param {function(...[?]):?} handler
     */
    events.WithEvents.prototype.onWhileKeyDown = function (keyCode, timeout, handler) {
        if (!this._whileKeyDownHandlers[keyCode]) {
            this._whileKeyDownHandlers[keyCode] = [];
        }
        this._whileKeyDownHandlers[keyCode].push(new input.WhileKeyDownHandler(handler, timeout));
    };

    /**
     * @param {number} keyCode
     * @param {*=} handler
     */
    events.WithEvents.prototype.offWhileKeyDown = function (keyCode, handler) {
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

    /**
     * @this {input.InputHandler}
     * @param {KeyboardEvent} evt
     */
    function keyDownHandler(evt) {
        this._keyboardState.isKeyDown[evt.keyCode] = true;

        var currentTime = new Date().getTime();
        if (this._whileKeyDownHandlers[evt.keyCode]) {
            var handlers = this._whileKeyDownHandlers[evt.keyCode].slice();
            handlers.forEach(function (handler) {
                handler.onKeyDown(currentTime);
            }, this);
        }

        this.fire(input.E_KEY_DOWN, evt.keyCode);
    }

    /**
     * @this {input.InputHandler}
     * @param {KeyboardEvent} evt
     */
    function keyUpHandler(evt) {
        this._keyboardState.isKeyDown[evt.keyCode] = false;

        var currentTime = new Date().getTime();
        if (this._whileKeyDownHandlers[evt.keyCode]) {
            var handlers = this._whileKeyDownHandlers[evt.keyCode].slice();
            handlers.forEach(function (handler) {
                handler.onKeyUp();
            }, this);
        }

        this.fire(input.E_KEY_UP, evt.keyCode);
    }

    /**
     * @this {input.InputHandler}
     * @param {MouseEvent} evt
     */
    function mouseMoveHandler(evt) {
        updateMouseState(this._mouseState, evt);
        this.fire(input.E_MOUSE_MOVE, this.getAbsoluteX(), this.getAbsoluteY(), this.getRelativeX(), this.getRelativeY());
    }

    /**
     * @param {HTMLElement} element
     */
    input.InputHandler.prototype.attachTo = function (element) {
        util.assertUndefined(this._attachedTo, "Handler already attached");
        this._attachedTo = element;
        for (var event in this._domHandlers) {
            var handler = this._domHandlers[event];
            element.addEventListener(event, handler);
        }
    };

    input.InputHandler.prototype.detach = function () {
        var element = this._attachedTo;
        util.assertDefined(element, "Handler not attached yet");
        for (var event in this._domHandlers) {
            var handler = this._domHandlers[event];
            element.removeEventListener(event, handler);
        }
        this._attachedTo = null;
    };

    /**
     * @param {input.Button} button
     */
    input.InputHandler.prototype.isButtonDown = function (button) {
        return (this._mouseState.buttons & (1 << button)) !== 0;
    };

    /**
     * @param {number} keyCode
     */
    input.InputHandler.prototype.isKeyDown = function (keyCode) {
        return this._keyboardState.isKeyDown[keyCode];
    };

    /**
     * @return {number}
     */
    input.InputHandler.prototype.getAbsoluteX = function () {
        return this._mouseState.absX;
    };

    /**
     * @return {number}
     */
    input.InputHandler.prototype.getAbsoluteY = function () {
        return this._mouseState.absY;
    };

    /**
     * @return {number}
     */
    input.InputHandler.prototype.getRelativeX = function () {
        return this._mouseState.relX;
    };

    /**
     * @return {number}
     */
    input.InputHandler.prototype.getRelativeY = function () {
        return this._mouseState.relY;
    };

    /** @const {string} */
    input.E_MOUSE_DOWN = 'mouseDown';
    /** @const {string} */
    input.E_MOUSE_MOVE = 'mouseMove';
    /** @const {string} */
    input.E_MOUSE_UP = 'mouseUp';
    /** @const {string} */
    input.E_KEY_DOWN = 'keyDown';
    /** @const {string} */
    input.E_KEY_UP = 'keyUp';

    /**
     * @const {number}
     */
    input.KEY_SPACE = 32;
})();