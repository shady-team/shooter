// requires input, game.net, game.message
(function () {
    /**
     * @param {game.net.Server} server
     * @param {HTMLCanvasElement} canvas
     * @constructor
     */
    game.client.GameClient = function GameClient(server, canvas) {
        webgl.setupWebGL(canvas);

        this._server = server;
        this._canvas = canvas;
        this._window = window;
        this._scene = new visual.Scene(canvas.getContext("2d"));
        this._map = new game.logic.Map([]);
        this._mouseInputHandler = new input.InputHandler();
        this._keyboardInputHandler = new input.InputHandler();

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
        var mouseHandler = this._mouseInputHandler,
            keyboardHandler = this._keyboardInputHandler,
            canvas = this._canvas,
            window = this._window,
            server = this._server;

        var lastGameObject = null;

        mouseHandler.on(events.E_MOUSE_UP, function (x, y, button) {
            if (button !== input.Button.LEFT)
                return;
            var position = new geom.Vector(x, y);
            var newGameObject = new game.data.GameObject(null, new phys.Body(position,
                new phys.Circle(30), 1), new visual.Circle(30, webgl.BLUE_COLOR));
            server.send(new game.message.ObjectsCreationMessage([newGameObject]));
            lastGameObject = newGameObject;
        });

        keyboardHandler.registerWhileKeyDown(input.KEY_SPACE, 1000 / 60, function (deltaTime, timeFromKeyDown) {
            var speed = new geom.Vector(0, 0.1);
            lastGameObject.body.position = lastGameObject.body.position.add(speed.multiply(deltaTime));
            server.send(new game.message.ObjectsModificationsMessage([lastGameObject]));
        });

        mouseHandler.attachTo(canvas);
        keyboardHandler.attachTo(window);
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
     * @return {visual.TrianglesMesh}
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