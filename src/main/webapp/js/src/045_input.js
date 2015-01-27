// requires util, events
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
         * @type {boolean}
         */
        this.altKey = false;
        /**
         * @type {boolean}
         */
        this.ctrlKey = false;
        /**
         * @type {boolean}
         */
        this.shiftKey = false;
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

    /**
     * @param {input.KeyboardState} state
     * @param {KeyboardEvent} evt
     * @param {boolean} isKeyDown
     */
    function updateKeyboardState(state, evt, isKeyDown) {
        state.altKey = evt.altKey;
        state.shiftKey = evt.shiftKey;
        state.ctrlKey = evt.ctrlKey;
    }

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
    };

    input.InputHandler.prototype = Object.create(events.WithEvents.prototype);

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
        this.fire(events.E_MOUSE_DOWN, this.getAbsoluteX(), this.getAbsoluteY(), evt.button);
    }

    /**
     * @this {input.InputHandler}
     * @param {MouseEvent} evt
     */
    function mouseUpHandler(evt) {
        updateMouseState(this._mouseState, evt);
        this.fire(events.E_MOUSE_UP, this.getAbsoluteX(), this.getAbsoluteY(), evt.button);
    }

    /**
     * @this {input.InputHandler}
     * @param {KeyboardEvent} evt
     */
    function keyDownHandler(evt) {
        updateKeyboardState(this._keyboardState, evt, true);
        this.fire(events.E_KEY_DOWN + evt.keyCode);
    }

    /**
     * @this {input.InputHandler}
     * @param {KeyboardEvent} evt
     */
    function keyUpHandler(evt) {
        updateKeyboardState(this._keyboardState, evt, false);
        this.fire(events.E_KEY_UP + evt.keyCode);
    }

    /**
     * @this {input.InputHandler}
     * @param {MouseEvent} evt
     */
    function mouseMoveHandler(evt) {
        updateMouseState(this._mouseState, evt);
        this.fire(events.E_MOUSE_MOVE, this.getAbsoluteX(), this.getAbsoluteY(), this.getRelativeX(), this.getRelativeY());
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

    input.InputHandler.prototype.isAltDown = function () {
        return this._keyboardState.altKey;
    };

    input.InputHandler.prototype.isCtrlDown = function () {
        return this._keyboardState.ctrlKey;
    };

    input.InputHandler.prototype.isShiftDown = function () {
        return this._keyboardState.shiftKey;
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

    input.KEY_SPACE = 32;
})();