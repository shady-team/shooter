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
        this._scene = new visual.Scene(canvas.getContext("2d"));
        this._map = new game.logic.Map([]);

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
            server = this._server;
        canvas.addEventListener('click', function (evt) {
            var x = evt.offsetX,
                y = evt.offsetY,
                position = new geom.Vector(x, y);
            server.send(new game.message.ObjectsCreationMessage([
                new game.data.GameObject(null, new phys.Body(position, new phys.Circle(30), 1), new visual.Circle(30))
            ]));
        });
    }

    /**
     * @this {game.client.GameClient}
     */
    function initClientEvents() {
        var server = this._server;
        server.on(events.E_MESSAGE, onMessage.bind(this));
        server.on(events.E_OPEN, util.noop); // ensures that local server receives open message. do not put before registering on E_MESSAGE!
    }

    /**
     * @param {game.data.GameObject} object
     * @return {visual.Mesh}
     */
    function unwrapMesh(object) {
        return object.mesh;
    }

    /**
     * @param {game.data.GameObject} object
     * @return {geom.Vector}
     */
    function unwrapPosition(object) {
        return object.body.position;
    }

    function redrawScene() {
        this._scene.drawScene(this._map.getObjectsSnapshot(), unwrapMesh, unwrapPosition);
    }

    var handlersHolder = new game.message.MessageHandlersHolder();

    /**
     * @this {game.client.GameClient}
     * @param {Object} message
     */
    function onMessage(message) {
        handlersHolder.handle(this, message);
    }

    handlersHolder.registerHandler(game.message.ObjectsModificationsMessage.TYPE,
        /**
         * @param {game.message.ObjectsModificationsMessage} message
         * @param {string} id
         */
        function (message, id) {
            this._map.applyModificationsBatch(message.batch);
            redrawScene.call(this);
        }
    );

    handlersHolder.registerHandler(game.message.ObjectsCreationMessage.TYPE,
        /**
         * @param {game.message.ObjectsCreationMessage} message
         * @param {string} id
         */
        function (message, id) {
            this._map.addObjects(message.objects);
            redrawScene.call(this);
        }
    );
})();