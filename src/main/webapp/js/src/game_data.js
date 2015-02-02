goog.provide('game.data');

goog.require('util');
goog.require('rtt');
goog.require('geom');
goog.require('phys');
goog.require('visual');

/** @typedef {Object.<string,game.data.GameObjectModification>} */
game.data.ModificationsBatch;

(function () {
    /**
     * @param {?string} id
     * @param {phys.Body.<?>} body
     * @param {visual.TrianglesMesh} mesh
     * @constructor
     * @implements {rtt.Typed}
     */
    game.data.GameObject = function (id, body, mesh) {
        this.id = id || util.genUUID();
        this.body = body;
        this.mesh = mesh;
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
    };

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