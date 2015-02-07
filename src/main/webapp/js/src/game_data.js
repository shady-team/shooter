goog.provide('game.data');

goog.require('util');
goog.require('rtt');
goog.require('geom');
goog.require('phys');
goog.require('visual');
goog.require('game.const');

/** @typedef {Object.<string,game.data.GameObjectModification>} */
game.data.ModificationsBatch;

(function () {
    /**
     * @param {?string} id
     * @param {phys.Body.<?>} body
     * @param {visual.TrianglesMesh} mesh
     * @param {number=} course - in degrees (clockwise)
     * @constructor
     * @implements {rtt.Typed}
     */
    game.data.GameObject = function (id, body, mesh, course) {
        this.id = id || util.genUUID();
        this.body = body;
        this.mesh = mesh;
        if (!course) {
            course = 0;
        }
        /**
         * @type {number}
         */
        this.course = course;//TODO: migrate to phys.Body. But for now it is only needed for PlayerObject rendering (circle)
    };

    game.data.GameObject.prototype.type = rtt.registerType(game.data.GameObject.prototype, 'game.data.GameObject');

    /**
     * @param {game.data.GameObjectModification} modification
     */
    game.data.GameObject.prototype.applyModification = function (modification) {
        if (util.isDefined(modification.newPosition)) {
            this.body.position = modification.newPosition;
        }
        if (util.isDefined(modification.newSpeed)) {
            this.body.speed = modification.newSpeed;
        }
        if (util.isDefined(modification.addToCourse)) {
            this.course += modification.addToCourse;
        }
    };

    /**
     * @param {?string} id
     * @param {phys.MotionBody.<?>} body
     * @param {visual.TrianglesMesh} mesh
     * @constructor
     * @extends {game.data.GameObject}
     */
    game.data.Bullet = function (id, body, mesh) {
        game.data.GameObject.call(this, id, body, mesh);
    };

    rtt.extend(game.data.Bullet, game.data.GameObject, 'game.data.Bullet');

    /**
     * @param {?string} id
     * @param {phys.MotionBody.<?>} body
     * @param {visual.TrianglesMesh} mesh
     * @constructor
     * @extends {game.data.GameObject}
     */
    game.data.PlayerObject = function (id, body, mesh) {
        game.data.GameObject.call(this, id, body, mesh);
    };

    rtt.extend(game.data.PlayerObject, game.data.GameObject, 'game.data.PlayerObject');

    /**
     * @type {phys.MotionBody.<?>}
     */
    game.data.PlayerObject.prototype.body;

    /**
     * @param {game.data.GameObjectModification} modification
     * @override
     */
    game.data.PlayerObject.prototype.applyModification = function (modification) {
        game.data.GameObject.prototype.applyModification.call(this, modification);
        if (util.isDefined(modification.newMaxSpeed)) {
            this.body.maxSpeed = /** @type {!number} */ (modification.newMaxSpeed);
        }
        if (util.isDefined(modification.newInternalForce)) {
            this.body.internalForce = modification.newInternalForce;
        }
    };

    /**
     * @return {geom.Vector} normalized vector of player orientation
     */
    game.data.PlayerObject.prototype.getCourseVector = function () {
        return new geom.Vector(Math.cos(this.course * Math.PI / 180), Math.sin(this.course * Math.PI / 180));
    };

    /**
     * @return {game.data.Bullet}
     */
    game.data.PlayerObject.prototype.createBullet = function () {
        var bullet = new game.data.Bullet(
            null,
            new phys.MotionBody(this.body.position.add(this.getCourseVector().multiply(game.const.player.radius + game.const.bullet.radius)),
                new phys.Circle(game.const.bullet.radius), game.const.bullet.weight, game.const.bullet.speed),
            new visual.Circle(game.const.bullet.radius, game.const.bullet.color)
        );
        bullet.body.internalForce = this.getCourseVector().multiply(game.const.bullet.speed);
        return bullet;
    };

    /**
     * @interface
     */
    game.data.GameObjectModification = function () {
    };

    /**
     * @type {?geom.Vector}
     */
    game.data.GameObjectModification.prototype.newPosition;

    /**
     * @type {?geom.Vector}
     */
    game.data.GameObjectModification.prototype.newSpeed;

    /**
     * @type {?number}
     */
    game.data.GameObjectModification.prototype.newMaxSpeed;

    /**
     * @type {?geom.Vector}
     */
    game.data.GameObjectModification.prototype.newInternalForce;

    /**
     * @type {?number}
     */
    game.data.GameObjectModification.prototype.addToCourse;

    /**
     * @constructor
     */
    game.data.ModificationBuilder = function () {
        /**
         * @type {game.data.GameObjectModification}
         * @private
         */
        this._modification = /** @type {game.data.GameObjectModification} */({});
    };

    /**
     * @param {geom.Vector} position
     * @return {game.data.ModificationBuilder} this
     */
    game.data.ModificationBuilder.prototype.setPosition = function (position) {
        this._modification.newPosition = position;
        return this;
    };

    /**
     * @param {geom.Vector} speed
     * @return {game.data.ModificationBuilder} this
     */
    game.data.ModificationBuilder.prototype.setSpeed = function (speed) {
        this._modification.newSpeed = speed;
        return this;
    };

    /**
     * @param {number} maxSpeed
     * @return {game.data.ModificationBuilder} this
     */
    game.data.ModificationBuilder.prototype.setMaxSpeed = function (maxSpeed) {
        this._modification.newMaxSpeed = maxSpeed;
        return this;
    };

    /**
     * @param {number} delta
     * @return {game.data.ModificationBuilder} this
     */
    game.data.ModificationBuilder.prototype.setAddToCourse = function (delta) {
        this._modification.addToCourse = delta;
        return this;
    };

    /**
     * @param {geom.Vector} internalForce
     * @return {game.data.ModificationBuilder} this
     */
    game.data.ModificationBuilder.prototype.setInternalForce = function (internalForce) {
        this._modification.newInternalForce = internalForce;
        return this;
    };

    /**
     * @return {game.data.GameObjectModification}
     */
    game.data.ModificationBuilder.prototype.build = function () {
        return this._modification;
    };

    /**
     * @return {game.data.ModificationBuilder}
     */
    game.data.buildModification = function () {
        return new game.data.ModificationBuilder();
    };

    /**
     * @constructor
     */
    game.data.ModificationsBatchBuilder = function () {
        /**
         * @type {game.data.ModificationsBatch}
         * @private
         */
        this._batch = {};
    };

    /**
     * @param {string} id
     * @param {game.data.GameObjectModification} modification
     * @return {game.data.ModificationsBatchBuilder} this
     */
    game.data.ModificationsBatchBuilder.prototype.add = function (id, modification) {
        this._batch[id] = modification;
        return this;
    };

    /**
     * @return {game.data.ModificationsBatch}
     */
    game.data.ModificationsBatchBuilder.prototype.build = function() {
        return this._batch;
    };

    /**
     * @return {game.data.ModificationsBatchBuilder}
     */
    game.data.buildModificationsBatch = function () {
        return new game.data.ModificationsBatchBuilder();
    };
})();