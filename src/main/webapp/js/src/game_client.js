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
        this._mouseInputHandler = new input.InputHandler();
        this._keyboardInputHandler = new input.InputHandler();

        this.map = new game.logic.Map([], []);
        /**
         * @type {?game.data.PlayerObject}
         */
        this.playerObject = null;
        this.playerObjectId = null;
        this.lastCameraPosition = new geom.Vector(320, 240);
        this.playerDeathTime = new Date().getTime();

        this.initCanvas();
        this.initCanvasEvents();
        this.initClientEvents();
    };

    game.client.GameClient.prototype.initCanvas = function() {
        var canvas = this._canvas;
        canvas.width = 640;
        canvas.height = 480;
    };

    /**
     * @return {geom.Vector}
     */
    game.client.GameClient.prototype.getSceneCenter = function () {
        var cameraCenter = this.lastCameraPosition;
        if (this.playerObject !== null) {
            cameraCenter = this.playerObject.body.position;
            this.lastCameraPosition = cameraCenter;
        }
        return cameraCenter;
    };

    /**
     * @return {geom.Vector}
     */
    game.client.GameClient.prototype.getCanvasSize = function() {
        return new geom.Vector(this._canvas.width, this._canvas.height);
    };

    /**
     * @return {geom.Vector}
     */
    game.client.GameClient.prototype.getSceneSize = function() {
        var sceneWidth = 640;
        return new geom.Vector(sceneWidth, this._canvas.height * sceneWidth / this._canvas.width)
    };

    game.client.GameClient.prototype.initCanvasEvents = function() {
        var mouseHandler = this._mouseInputHandler,
            keyboardHandler = this._keyboardInputHandler,
            canvas = this._canvas,
            server = this._server;

        var client = this;
        mouseHandler.on(input.E_MOUSE_UP, function (x, y, button) {
            if (button !== input.Button.RIGHT)
                return;

            var sceneCenter = client.getSceneCenter();
            var canvasCenter = client.getCanvasSize().multiply(0.5);
            var translate = matrix.Matrix3.translation(-canvasCenter.x, -canvasCenter.y);
            var scale = matrix.Matrix3.scaling(client.getSceneSize().x / client.getCanvasSize().x, client.getSceneSize().y / client.getCanvasSize().y);
            var translateToScene = matrix.Matrix3.translation(sceneCenter.x, sceneCenter.y);
            var canvasToWorld = translateToScene.dot(scale.dot(translate));

            var position = canvasToWorld.translate(new geom.Vector(x, y)),
                newGameObject;
            if (button === input.Button.LEFT) {
                newGameObject = new game.data.GameObject(
                    null,
                    new phys.Body(position, new phys.Circle(30), 1),
                    new visual.Circle(30, webgl.BLUE_COLOR)
                );
            }
            server.send(new game.message.ObjectsCreationMessage([newGameObject]));
        });

        mouseHandler.on(input.E_MOUSE_MOVE, function (x, y) {
            if (client.playerObject === null)
                return;

            var sceneCenter = client.getSceneCenter();
            var canvasCenter = client.getCanvasSize().multiply(0.5);
            var translate = matrix.Matrix3.translation(-canvasCenter.x, -canvasCenter.y);
            var scale = matrix.Matrix3.scaling(client.getSceneSize().x / client.getCanvasSize().x, client.getSceneSize().y / client.getCanvasSize().y);
            var translateToScene = matrix.Matrix3.translation(sceneCenter.x, sceneCenter.y);
            var canvasToWorld = translateToScene.dot(scale.dot(translate));
            var mouseInWorld = canvasToWorld.translate(new geom.Vector(x, y));
            var sight = mouseInWorld.subtract(client.playerObject.body.position);

            var modification = game.data.buildModification()
                .setCourse(sight.angle())
                .build();

            server.send(new game.message.ObjectsModificationsMessage(
                game.data.buildModificationsBatch()
                    .add(client.playerObjectId, modification)
                    .build()
            ))
        });

        function moveHandler() {
            if (client.playerObject === null)
                return;

            var forcePower = 1000;
            var force = geom.Vector.ZERO,
                right = matrix.Matrix3.rotation(90).translate(client.playerObject.getCourseVector().multiply(forcePower)),
                down = client.playerObject.getCourseVector().multiply(-forcePower);

            if (keyboardHandler.isKeyDown(input.Key.W))
                force = force.subtract(down);
            if (keyboardHandler.isKeyDown(input.Key.S))
                force = force.add(down);

            if (keyboardHandler.isKeyDown(input.Key.A))
                force = force.subtract(right);
            if (keyboardHandler.isKeyDown(input.Key.D))
                force = force.add(right);

            var modification = game.data.buildModification()
                .setInternalForce(force)
                .build();

            server.send(new game.message.ObjectsModificationsMessage(
                game.data.buildModificationsBatch()
                    .add(client.playerObject.id, modification)
                    .build()
            ));
        }

        function fireHandler() {
            if (client.playerObject === null)
                return;

            if (mouseHandler.isButtonDown(input.Button.LEFT)) {
                var bullet = client.playerObject.createBullet();
                server.send(new game.message.ObjectsCreationMessage([bullet]));
            }
        }

        keyboardHandler.on(input.E_KEY_IS_DOWN, moveHandler);
        keyboardHandler.on(input.E_KEY_UP, moveHandler);
        keyboardHandler.on(input.E_MOUSE_IS_DOWN, util.throttle(game.const.bullet.shootDelay, fireHandler));

        function update() {
            var time = new Date().getTime();
            var team = client.map.chooseTeam();
            if (client.playerObjectId == null
                    && time - client.playerDeathTime >= game.const.player.respawnTime
                    && team != null) {
                var position = team.generateSpawnPosition();
                var newGameObject = new game.data.PlayerObject(
                    null,
                    new phys.MotionBody(position, new phys.Circle(game.const.player.radius),
                        game.const.player.weight, game.const.player.maxSpeed),
                    new visual.OrientedCircle(game.const.player.radius, team.teamColor, game.const.player.removedAngle),
                    team.name
                );
                newGameObject.setHitPoints(15);
                client.playerObjectId = newGameObject.id;
                server.send(new game.message.ObjectsCreationMessage([newGameObject]));
            }
        }

        this.map.activate(events.E_UPDATE_STEP);
        this.map.on(events.E_UPDATE_STEP, update);

        mouseHandler.attachTo(canvas);
        keyboardHandler.attachTo(document.body);
    };

    game.client.GameClient.prototype.initClientEvents = function() {
        var server = this._server;
        server.on(events.E_MESSAGE, onMessage.bind(this));
        server.on(events.E_OPEN, util.noop); // ensures that local server receives open message. do not put before registering on E_MESSAGE!
    };

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
        var frustums = [];
        var lightPositions = [];
        var lightRanges = [];
        var objects = this.map.getObjectsSnapshot();
        var teamName = null;
        if (this.playerObject != null) {
            teamName = this.playerObject.teamName;
            for (var i = 0; i < objects.length; i++) {
                /**
                 * @type {game.data.GameObject}
                 */
                var object = objects[i];
                if (this.playerObject != null && object.type == game.data.PlayerObject.prototype.type) {
                    /**
                     * @type {game.data.PlayerObject}
                     */
                    var player = object;  // TODO: how to fix cast warning?
                    if (teamName == player.teamName) {
                        frustums.push(matrix.Matrix3.frustumDirected(player.body.position,
                            player.course, game.const.player.viewAngle, game.const.player.radius / 8, game.const.player.viewRange));
                        lightPositions.push(player.body.position);
                        lightRanges.push(game.const.player.viewRange);
                    }
                }
            }
        }
        /**
         * @param {game.data.GameObject} object
         * @return {boolean}
         */
        function isObstacleChecker(object) {
            if (object.type == game.data.PlayerObject.prototype.type) {
                return teamName != object.teamName;
            } else {
                return object.isObstacle;
            }
        }
        this._scene.drawScene(this.getSceneCenter(), this.getCanvasSize(), this.getSceneSize().x,
            objects, unwrapMesh, isObstacleChecker, unwrapPosition, unwrapCourse, frustums, lightPositions, lightRanges);
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
         * @this {game.client.GameClient}
         */
        function (message) {
            this.map.applyModificationsBatch(message.batch);
            redrawScene.call(this);
        }
    );

    handlersHolder.registerHandler(game.message.ObjectsCreationMessage.prototype.type,
        /**
         * @param {game.message.ObjectsCreationMessage} message
         * @this {game.client.GameClient}
         */
        function (message) {
            this.map.addObjects(message.objects);
            for (var i = 0; i < message.objects.length; i++) {
                var object = message.objects[i];
                if (this.playerObjectId !== null && object.id == this.playerObjectId) {
                    this.playerObject = object;//TODO: re-do this, by saving to map of object new created object BEFORE sending creation message to server, and ignore somehow message from server after that (or server should not send it to the source sender)
                }
            }
            redrawScene.call(this);
        }
    );

    handlersHolder.registerHandler(game.message.ObjectsDeletionsMessage.prototype.type,
        /**
         * @param {game.message.ObjectsDeletionsMessage} message
         * @this {game.client.GameClient}
         */
        function (message) {
            for (var i = 0; i < message.ids.length; i++) {
                var id = message.ids[i];
                if (id == this.playerObjectId) {//TODO: think about implementing this in event (with type=id) driven style
                    this.playerObject = null;
                    this.playerObjectId = null;
                }
                this.map.removeObject(id);
            }
            redrawScene.call(this);
        }
    );

    handlersHolder.registerHandler(game.message.TeamsMessage.prototype.type,
        /**
         * @param {game.message.TeamsMessage} message
         * @this {game.client.GameClient}
         */
        function (message) {
            this.map.setTeams(message.teams);
        }
    );
})();