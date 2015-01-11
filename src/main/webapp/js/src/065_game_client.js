// requires game.net, game.message
(function () {
    /**
     * @param {game.net.Server} server
     * @param {HTMLCanvasElement} canvas
     * @constructor
     */
    game.client.GameClient = function GameClient(server, canvas) {
        this._server = server;
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");

        initCanvas.call(this);
        initCanvasEvents.call(this);
        initClientEvents.call(this);
    };

    /**
     * @this {game.client.GameClient}
     */
    function initCanvas() {
        var canvas = this._canvas;
        canvas.width = 640;
        canvas.height = 480;
    }

    /**
     * @this {game.client.GameClient}
     */
    function initCanvasEvents() {
        var canvas = this._canvas,
            server = this._server,
            /**
             * @type {?number}
             */
            x = null,
            /**
             * @type {?number}
             */
            y = null;
        canvas.addEventListener("mousedown", function (evt) {
            x = evt.offsetX;
            y = evt.offsetY;
        });
        canvas.addEventListener("mouseup", function (evt) {
            var message = new game.message.DrawMessage(
                /** @type {number} */ (x),
                /** @type {number} */ (y),
                evt.offsetX,
                evt.offsetY
            );
            server.send(message);
            server.fire(events.E_MESSAGE, message);
            x = null;
            y = null;
        });
    }

    /**
     * @this {game.client.GameClient}
     */
    function initClientEvents() {
        var server = this._server;
        server.on(events.E_MESSAGE, onMessage.bind(this));
    }

    var handlersHolder = new game.message.MessageHandlersHolder();

    /**
     * @this {game.client.GameClient}
     * @param {Object} message
     */
    function onMessage(message) {
        handlersHolder.handle(this, message);
    }

    handlersHolder.registerHandler(game.message.DrawMessage.TYPE, function (message) {
        var ctx = this._ctx;
        ctx.beginPath();
        ctx.moveTo(message.x1, message.y1);
        ctx.lineTo(message.x2, message.y2);
        ctx.stroke();
    });
})();