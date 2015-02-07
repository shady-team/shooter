goog.provide('game.client');

goog.require('util');
goog.require('rtt');
goog.require('input');
goog.require('game.data');
goog.require('game.net');
goog.require('game.message');
goog.require('game.logic');
goog.require('game.const');

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

    var playerObject = null;
    var playerObjectId = null;

    /**
     * @this {game.client.GameClient}
     */
    function initCanvasEvents() {
        var mouseHandler = this._mouseInputHandler,
            keyboardHandler = this._keyboardInputHandler,
            canvas = this._canvas,
            server = this._server;

        mouseHandler.on(input.E_MOUSE_UP, function (x, y, button) {
            if (button !== input.Button.LEFT && button !== input.Button.RIGHT)
                return;
            var position = new geom.Vector(x, y),
                newGameObject;
            if (button === input.Button.LEFT) {
                newGameObject = new game.data.GameObject(
                    null,
                    new phys.Body(position, new phys.Circle(30), 1),
                    new visual.Circle(30, webgl.BLUE_COLOR)
                );
            } else {
                newGameObject = new game.data.PlayerObject(
                    null,
                    new phys.MotionBody(position, new phys.Circle(game.const.player.radius),
                        game.const.player.weight, game.const.player.maxSpeed),
                    new visual.OrientedCircle(game.const.player.radius, webgl.RED_COLOR, game.const.player.removedAngle)
                );
                playerObjectId = newGameObject.id;
            }
            server.send(new game.message.ObjectsCreationMessage([newGameObject]));
        });

        function moveHandler() {
            if (playerObject === null)
                return;

            var forcePower = 1000;
            var force = geom.Vector.ZERO,
                right = matrix.Matrix3.rotation(90).translate(playerObject.getCourseVector().multiply(forcePower)),
                down = playerObject.getCourseVector().multiply(-forcePower);
            var addToCourse = 0,
                rotatingAngle = 10;

            if (keyboardHandler.isKeyDown(input.Key.W))
                force = force.subtract(down);
            if (keyboardHandler.isKeyDown(input.Key.S))
                force = force.add(down);

            if (keyboardHandler.isKeyDown(input.Key.A))
                force = force.subtract(right);
            if (keyboardHandler.isKeyDown(input.Key.D))
                force = force.add(right);

            if (keyboardHandler.isKeyDown(input.Key.J))
                addToCourse -= rotatingAngle;
            if (keyboardHandler.isKeyDown(input.Key.L))
                addToCourse += rotatingAngle;

            var modification = game.data.buildModification().setInternalForce(force).setAddToCourse(addToCourse);

            server.send(new game.message.ObjectsModificationsMessage(
                game.data.buildModificationsBatch().add(playerObject.id, modification.build()).build()
            ));
        }

        function fireHandler() {
            if (playerObject === null)
                return;

            if (keyboardHandler.isKeyDown(input.Key.K)) {
                var bullet = playerObject.createBullet();
                server.send(new game.message.ObjectsCreationMessage([bullet]));
            }
        }

        keyboardHandler.on(input.E_KEY_DOWN, moveHandler);
        keyboardHandler.on(input.E_KEY_UP, moveHandler);
        keyboardHandler.on(input.E_KEY_DOWN, fireHandler);
        keyboardHandler.on(input.E_KEY_UP, fireHandler);

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
     * @param {game.data.GameObject} object
     * @return {number}
     */
    function unwrapCourse(object) {
        return object.course;
    }

    /**
     * @this {game.client.GameClient}
     */
    function redrawScene() {
        this._scene.drawScene(this._map.getObjectsSnapshot(), unwrapMesh, unwrapPosition, unwrapCourse);
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
            for (var i = 0; i < message.objects.length; i++) {
                var object = message.objects[i];
                if (playerObjectId != null && object.id == playerObjectId) {
                    playerObject = object;//TODO: re-do this, by saving to map of object new created object BEFORE sending creation message to server, and ignore somehow message from server after that (or server should not send it to the source sender)
                }
            }
            redrawScene.call(this);
        }
    );
})();