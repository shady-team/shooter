// requires game.net

(function () {
    /**
     * @param {game.net.Server} server
     * @param {HTMLCanvasElement} canvas
     * @constructor
     */
    game.GameClient = function GameClient(server, canvas) {
        this._server = server;
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");

        initCanvas.call(this);
        initClientEvents.call(this);
        initCanvasEvents.call(this);
    };

    /**
     * @this {game.GameClient}
     */
    function initCanvas() {
        var canvas = this._canvas;
        canvas.width = 640;
        canvas.height = 480;
    }

    /**
     * @this {game.GameClient}
     */
    function initClientEvents() {
        var server = this._server,
            ctx = this._ctx;
        server.on(events.E_MESSAGE, function (message) {
            ctx.strokeStyle = message.style;
            ctx.beginPath();
            ctx.moveTo(message.x1, message.y1);
            ctx.lineTo(message.x2, message.y2);
            ctx.stroke();
        });
    }

    /**
     * @this {game.GameClient}
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
            var message = {x1: x, y1: y, x2: evt.offsetX, y2: evt.offsetY, style: 'black'};
            server.send(message);
            server.fire(events.E_MESSAGE, message);
            x = null;
            y = null;
        });
    }
})();