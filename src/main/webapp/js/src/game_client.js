goog.provide('game.client');

goog.require('util');
goog.require('rtt');
goog.require('input');
goog.require('game.data');
goog.require('game.net');
goog.require('game.message');
goog.require('game.logic');
goog.require('game.const');
goog.require('game.chat');

(function () {
    /**
     * @param {game.net.Server} server
     * @param {HTMLElement} container
     * @param {game.chat.Chat} chat
     * @constructor
     */
    game.client.GameClient = function GameClient(server, container, chat) {
        this._server = server;
        this._canvas = initCanvas(container);
        this._chat = chat;

        webgl.setupWebGL(this._canvas);

        this._scene = new visual.Scene();
        this._inputHandler = new input.InputHandler();

        this.map = new game.logic.Map([], []);
        /**
         * @type {?game.data.PlayerObject}
         */
        this.playerObject = null;
        this.lastCameraPosition = new geom.Vector(0, 0);
        this.playerDeathTime = new Date().getTime();

        this.initUiEvents();
        this.initClientNetEvents();
    };

    /**
     * @param {HTMLElement} container
     * @return {HTMLCanvasElement}
     */
    function initCanvas(container) {
        var canvas = /** @type {HTMLCanvasElement} */ (document.createElement("canvas"));
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.setAttribute("tabindex", "1");

        setInterval(function() {
            if (canvas.clientWidth !== canvas.width
                || canvas.clientHeight !== canvas.height) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                webgl.height = canvas.height;
                webgl.width = canvas.width;
            }
        }, 20);

        container.innerHTML = "";
        container.appendChild(canvas);
        canvas.focus();

        return canvas;
    }

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
        var sceneWidth = 2700;
        return new geom.Vector(sceneWidth, this._canvas.height * sceneWidth / this._canvas.width)
    };

    game.client.GameClient.prototype.initUiEvents = function() {
        var inputHandler = this._inputHandler,
            server = this._server,
            chat = this._chat,
            canvas = this._canvas,
            client = this;

        inputHandler.on(input.E_MOUSE_UP, function (x, y, button) {
            if (button !== input.Button.RIGHT)
                return;

            var canvasToWorld = matrix.Matrix3.rectToRect(new geom.Rectangle(client.getCanvasSize().multiply(0.5), client.getCanvasSize()),
                new geom.Rectangle(client.getSceneCenter(), client.getSceneCenter().add(client.getSceneSize().multiply(0.5))));

            var position = canvasToWorld.translate(new geom.Vector(x, y)),
                newGameObject;
            if (button === input.Button.RIGHT) {
                newGameObject = new game.data.GameObject(
                    null,
                    new phys.Body(position, new phys.Circle(30), 1),
                    new visual.Circle(30, webgl.BLUE_COLOR)
                );
            }
            server.send(new game.message.ObjectsCreationMessage([newGameObject]));
        });

        inputHandler.on(input.E_MOUSE_MOVE, function (x, y) {
            if (client.playerObject === null)
                return;

            var canvasToWorld = matrix.Matrix3.rectToRect(new geom.Rectangle(client.getCanvasSize().multiply(0.5), client.getCanvasSize()),
                new geom.Rectangle(client.getSceneCenter(), client.getSceneCenter().add(client.getSceneSize().multiply(0.5))));
            var mouseInWorld = canvasToWorld.translate(new geom.Vector(x, y));
            var sight = mouseInWorld.subtract(client.playerObject.body.position);

            var modification = game.data.buildModification()
                .setCourse(sight.angle())
                .build();

            server.send(new game.message.ObjectsModificationsMessage(
                game.data.buildModificationsBatch()
                    .add(client.playerObject.id, modification)
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

            if (inputHandler.isKeyDown(input.Key.W))
                force = force.subtract(down);
            if (inputHandler.isKeyDown(input.Key.S))
                force = force.add(down);

            if (inputHandler.isKeyDown(input.Key.A))
                force = force.subtract(right);
            if (inputHandler.isKeyDown(input.Key.D))
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
            if (client.playerObject === null) {
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
                    newGameObject.setCourse(team.initialCourse);
                    newGameObject.setHitPoints(15);
                    client.playerObjectId = newGameObject.id;
                    server.send(new game.message.ObjectsCreationMessage([newGameObject]));
                }
                return;
            }

            if (inputHandler.isButtonDown(input.Button.LEFT)) {
                server.send(new game.message.FireBulletMessage(client.playerObjectId));
            }
        }

        inputHandler.on(input.E_KEY_IS_DOWN, moveHandler);
        inputHandler.on(input.E_KEY_UP, moveHandler);
        inputHandler.on(input.E_MOUSE_IS_DOWN, util.throttle(game.const.bullet.shootDelay, fireHandler));

        inputHandler.on(input.E_KEY_DOWN, function (code) {
            if (code !== input.Key.ENTER)
                return;
            chat.focus();
        });

        chat.on(game.chat.E_MESSAGE_SENT, function (message) {
            chat.blur();
            canvas.focus();

            server.send(new game.message.ChatMessage(null, message));
        });

        chat.on(game.chat.E_MESSAGE_CANCELED, function () {
            chat.blur();
            canvas.focus();
        });

        inputHandler.attachTo(this._canvas);
    };

    game.client.GameClient.prototype.initClientNetEvents = function() {
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
                    var player = /** @type {game.data.PlayerObject} */ (object);
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
                    this.playerObject = /** @type {game.data.PlayerObject} */ (object);//TODO: re-do this, by saving to map of object new created object BEFORE sending creation message to server, and ignore somehow message from server after that (or server should not send it to the source sender)
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
                if (id === this.playerObjectId) {//TODO: think about implementing this in event (with type=id) driven style
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

    handlersHolder.registerHandler(game.message.ChatMessage.prototype.type,
        /**
         * @param {game.message.ChatMessage} message
         * @this {game.client.GameClient}
         */
        function (message) {
            this._chat.addMessage(message.author, message.message);
        }
    );
})();