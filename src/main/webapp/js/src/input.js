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
        var oldValue = !!(state.buttons & (1 << evt.button));
        updatePosition(state, evt);
        switch (evt.type) {
            case 'mousedown':
                state.buttons |= 1 << evt.button;
                return !oldValue;
            case 'mouseup':
                state.buttons &= -1 ^ (1 << evt.button);
                return oldValue;
        }
        return false;
    }

    /**
     * @param {input.KeyboardState} state
     * @param {KeyboardEvent} evt
     */
    function updateKeyboardState(state, evt) {
        var oldValue = state.isKeyDown[evt.keyCode];
        switch (evt.type) {
            case 'keydown':
                state.isKeyDown[evt.keyCode] = true;
                return !oldValue;
            case 'keyup':
                delete state.isKeyDown[evt.keyCode];
                return oldValue;
        }
        return false;
    }

    /**
     * @enum {number}
     */
    input.Button = {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2
    };

    /**
     * @constructor
     * @implements {events.WithEvents}
     * @extends {events.ContinuousEventBus}
     */
    input.InputHandler = function () {
        events.ContinuousEventBus.call(this);
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
    };

    input.InputHandler.prototype = Object.create(events.ContinuousEventBus.prototype);

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
        if (updateMouseState(this._mouseState, evt)) {
            this.fire(input.E_MOUSE_DOWN, this.getAbsoluteX(), this.getAbsoluteY(), evt.button);
            this.activate(input.E_MOUSE_IS_DOWN);
        }
    }

    /**
     * @this {input.InputHandler}
     * @param {MouseEvent} evt
     */
    function mouseUpHandler(evt) {
        updateMouseState(this._mouseState, evt);
        this.fire(input.E_MOUSE_UP, this.getAbsoluteX(), this.getAbsoluteY(), evt.button);
        if (!this._mouseState.buttons)
            this.deactivate(input.E_MOUSE_IS_DOWN);
    }

    /**
     * @this {input.InputHandler}
     * @param {KeyboardEvent} evt
     */
    function keyUpHandler(evt) {
        updateKeyboardState(this._keyboardState, evt);
        this.fire(input.E_KEY_UP, evt.keyCode);
        if (util.isObjectEmpty(this._keyboardState.isKeyDown))
            this.deactivate(input.E_KEY_IS_DOWN);
    }

    /**
     * @this {input.InputHandler}
     * @param {KeyboardEvent} evt
     */
    function keyDownHandler(evt) {
        if (updateKeyboardState(this._keyboardState, evt)) {
            this.fire(input.E_KEY_DOWN, evt.keyCode);
            this.activate(input.E_KEY_IS_DOWN);
        }
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
    input.E_MOUSE_IS_DOWN = 'mouseIsDown';
    /** @const {string} */
    input.E_KEY_DOWN = 'keyDown';
    /** @const {string} */
    input.E_KEY_UP = 'keyUp';
    /** @const {string} */
    input.E_KEY_IS_DOWN = "keyIsDown";

    function charCode(char) {
        return char.toUpperCase().charCodeAt(0);
    }

    /**
     * @enum {number}
     */
    input.Key = {
        SPACE: 32,
        ENTER: 13,
        W: charCode('w'),
        A: charCode('a'),
        S: charCode('s'),
        D: charCode('d'),
        J: charCode('j'),
        K: charCode('k'),
        L: charCode('l')
    };
})();