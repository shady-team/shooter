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
     * @constructor
     * @implements {rtt.Typed}
     */
    game.data.GameObject = function (id, body, mesh) {
        this.id = id || util.genUUID();
        this.body = body;
        this.mesh = mesh;
        this.course = 0;
        this.hitPoints = Infinity;
    };

    game.data.GameObject.prototype.type = rtt.registerType(game.data.GameObject.prototype, 'game.data.GameObject');

    /**
     * @param {number} course - in degrees (clockwise)
     */
    game.data.GameObject.prototype.setCourse = function (course) {
        this.course = course;//TODO: migrate to phys.Body. But for now it is only needed for PlayerObject rendering (circle)
    };

    /**
     * @param {number} hitPoints - how much damage summary this object can withstand
     */
    game.data.GameObject.prototype.setHitPoints = function (hitPoints) {
        this.hitPoints = hitPoints;
    };

    game.data.GameObject.prototype.hit = function () {
        this.hitPoints -= 1;
    };

    /**
     * @param {game.data.GameObject} target
     */
    game.data.GameObject.prototype.collideWith = function (target) {
    };

    /**
     * @return {boolean}
     */
    game.data.GameObject.prototype.isDestroyed = function () {
        return this.hitPoints <= 0;
    };

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
        if (util.isDefined(modification.deltaHitPoints)) {
            this.hitPoints += modification.deltaHitPoints;
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
     * @param {game.data.GameObject} target
     */
    game.data.Bullet.prototype.collideWith = function (target) {
        target.hit();
        this.hit();
    };

    /**
     * @param {?string} id
     * @param {phys.MotionBody.<?>} body
     * @param {visual.TrianglesMesh} mesh
     * @param {string} teamName
     * @constructor
     * @extends {game.data.GameObject}
     */
    game.data.PlayerObject = function (id, body, mesh, teamName) {
        game.data.GameObject.call(this, id, body, mesh);
        /**
         * @const
         * @type {string}
         */
        this.teamName = teamName;
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
        return geom.Vector.createPolarVector(this.course, 1.0);
    };

    /**
     * @return {game.data.Bullet}
     */
    game.data.PlayerObject.prototype.createBullet = function () {
        var bullet = new game.data.Bullet(
            null,
            new phys.MotionBody(this.body.position.add(this.getCourseVector().multiply(game.const.player.radius + game.const.bullet.radius + EPS)),
                new phys.Circle(game.const.bullet.radius), game.const.bullet.weight, game.const.bullet.speed),
            new visual.Circle(game.const.bullet.radius, game.const.bullet.color)
        );
        bullet.setHitPoints(1);
        var bulletCourse = this.course + util.randomNormalDistribution() * game.const.bullet.spreadAngle / 2.0;
        bullet.body.speed = geom.Vector.createPolarVector(bulletCourse, game.const.bullet.speed);
        bullet.body.internalForce = this.getCourseVector().multiply(game.const.bullet.speed * game.const.bullet.weight);
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
     * @type {?number}
     */
    game.data.GameObjectModification.prototype.deltaHitPoints;

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
     * @param {number} deltaHitPoints
     * @return {game.data.ModificationBuilder} this
     */
    game.data.ModificationBuilder.prototype.setDeltaHitPoints = function (deltaHitPoints) {
        this._modification.deltaHitPoints = deltaHitPoints;
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