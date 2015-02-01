goog.provide('game.client');

goog.require('util');
goog.require('rtt');
goog.require('input');
goog.require('game.data');
goog.require('game.net');
goog.require('game.message');
goog.require('game.logic');

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
        this._scene = new visual.Scene();
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
            server = this._server;

        var lastGameObject = null;

        mouseHandler.on(input.E_MOUSE_UP, function (x, y, button) {
            if (button !== input.Button.LEFT)
                return;
            var position = new geom.Vector(x, y);
            var newGameObject = new game.data.GameObject(null, new phys.Body(position,
                new phys.Circle(30), 1), new visual.Circle(30, webgl.BLUE_COLOR));
            server.send(new game.message.ObjectsCreationMessage([newGameObject]));
            lastGameObject = newGameObject;
        });

        keyboardHandler.on(input.E_KEY_IS_DOWN, util.throttle(1000 / 60, function (deltaTime) {
            if (!keyboardHandler.isKeyDown(input.KEY_SPACE))
                return;
            var speed = new geom.Vector(0, 0.1);
            var newPosition = lastGameObject.body.position.add(speed.multiply(deltaTime));
            var batchBuilder = game.data.buildModificationsBatch();
            batchBuilder.add(lastGameObject.id, game.data.buildModification().setPosition(newPosition).build());
            server.send(new game.message.ObjectsModificationsMessage(batchBuilder.build()));
        }));

        mouseHandler.attachTo(canvas);
        keyboardHandler.attachTo(document.body);
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

    /**
     * @this {game.client.GameClient}
     */
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

    handlersHolder.registerHandler(game.message.ObjectsModificationsMessage.prototype.type,
        /**
         * @param {game.message.ObjectsModificationsMessage} message
         */
        function (message) {
            this._map.applyModificationsBatch(message.batch);
            redrawScene.call(this);
        }
    );

    handlersHolder.registerHandler(game.message.ObjectsCreationMessage.prototype.type,
        /**
         * @param {game.message.ObjectsCreationMessage} message
         */
        function (message) {
            this._map.addObjects(message.objects);
            redrawScene.call(this);
        }
    );
})();