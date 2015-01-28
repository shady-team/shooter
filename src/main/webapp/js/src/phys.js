goog.provide('phys');

goog.require('util');
goog.require('rtt');
goog.require('geom');

/** @typedef {{force:geom.Vector,impulse:geom.Vector}} */
phys.CollisionEffect;

/** @const {number} */
var RIGIDNESS = 100;

(function () {
    /**
     * @interface
     * @extends {rtt.Typed}
     */
    phys.Shape = function Shape() {
    };

    /**
     * @constructor
     * @implements {phys.Shape}
     * @param {number} radius
     */
    phys.Circle = function Circle(radius) {
        /**
         * @const
         * @type {number}
         */
        this.radius = radius;
    };

    var circleType = rtt.global.registerType('circle', phys.Circle.prototype);
    /**
     * @const {string}
     */
    phys.Circle.prototype.type = circleType;

    /**
     * @constructor
     * @implements {phys.Shape}
     * @param {number} width
     * @param {number} height
     */
    phys.Rectangle = function Rectangle(width, height) {
        /**
         * @const
         * @type {number}
         */
        this.width = width;
        /**
         * @const
         * @type {number}
         */
        this.height = height;
    };

    var rectType = rtt.global.registerType('rect', phys.Rectangle.prototype);
    /**
     * @const {string}
     */
    phys.Rectangle.prototype.type = rectType;

    /**
     * @param {geom.Vector} position
     * @param {S} shape
     * @param {number} weight
     * @constructor
     * @implements {rtt.Typed}
     * @template S
     */
    phys.Body = function Body(position, shape, weight) {
        this.position = position;
        /**
         * @type {geom.Vector}
         */
        this.speed = geom.Vector.ZERO;
        this.shape = shape;
        /**
         * @type {number}
         */
        this.weight = weight;
    };

    /**
     * @const {string}
     */
    phys.Body.prototype.type = rtt.global.registerType('body', phys.Body.prototype);

    /**
     * @type {Object.<string, function(phys.Body.<?>,phys.Body.<?>):phys.CollisionEffect>}
     */
    var collisionHandlers = util.emptyObject();

    /**
     * @param {string} a
     * @param {string} b
     * @return {string}
     */
    function collisionKey(a, b) {
        return a + "&" + b;
    }

    /**
     * @this {function(phys.Body.<?>,phys.Body.<?>):phys.CollisionEffect}
     * @param {phys.Body.<?>} a
     * @param {phys.Body.<?>} b
     * @return {phys.CollisionEffect}
     */
    function swappedCollisionResolver(a, b) {
        var result = this.call(null, b, a);
        result.force = result.force.negate();
        result.impulse = result.impulse.negate();
        return result;
    }

    /**
     * @param {string} typeA
     * @param {string} typeB
     * @param {function(phys.Body.<?>,phys.Body.<?>):phys.CollisionEffect} resolver
     */
    function registerCollisionResolver(typeA, typeB, resolver) {
        collisionHandlers[collisionKey(typeA, typeB)] = resolver;
        if (typeA !== typeB) {
            collisionHandlers[collisionKey(typeB, typeA)] = swappedCollisionResolver.bind(resolver);
        }
    }

    /**
     * @type {phys.CollisionEffect}
     */
    var ZERO_COLLISION_EFFECT = {
        force: geom.Vector.ZERO,
        impulse: geom.Vector.ZERO
    };

    /**
     * @param {phys.Body.<?>} a
     * @param {phys.Body.<?>} b
     * @return {phys.CollisionEffect}
     */
    phys.collide = function collide(a, b) {
        var handler = collisionHandlers[collisionKey(a.shape.type, b.shape.type)];
        return handler.call(null, a, b);
    };

    /**
     * @param {phys.Body.<phys.Circle>} a
     * @param {phys.Body.<phys.Circle>} b
     * @param {geom.Vector} norm
     * @return {geom.Vector}
     */
    function calcImpulse(a, b, norm) {
        var impulse = geom.Vector.ZERO,
            aImpulse = a.speed.dot(norm),
            bImpulse = b.speed.dot(norm);
        if (bImpulse > EPS) {
            impulse = norm.multiply(bImpulse * b.weight);
        }
        if (aImpulse < EPS) {
            impulse = impulse.subtract(norm.multiply(aImpulse * a.weight));
        }
        return impulse;
    }

    registerCollisionResolver(circleType, circleType,
        /**
         * @param {phys.Body.<phys.Circle>} a
         * @param {phys.Body.<phys.Circle>} b
         * @return {phys.CollisionEffect}
         */
        function (a, b) {
            util.assert(a !== b, "colliding body with itself");
            var move = a.position.subtract(b.position),
                delta = a.shape.radius + b.shape.radius - move.length();
            if (delta < EPS) {
                return ZERO_COLLISION_EFFECT;
            }
            var norm = move.normalized(),
                force = norm.multiply(delta * RIGIDNESS);
            return {
                force: force,
                impulse: calcImpulse(a, b, norm)
            };
        }
    );

    registerCollisionResolver(circleType, rectType,
        /**
         * @param {phys.Body.<phys.Circle>} circ
         * @param {phys.Body.<phys.Rectangle>} rect
         * @return {phys.CollisionEffect}
         */
        function (circ, rect) {
            var move = circ.position.subtract(rect.position);
            if (Math.abs(move.x) > circ.shape.radius + rect.shape.width / 2 - EPS
                || Math.abs(move.y) > circ.shape.radius + rect.shape.height / 2 - EPS) {
                return ZERO_COLLISION_EFFECT;
            }
            var diagLeft = new geom.Vector(-rect.shape.width / 2, -rect.shape.height / 2),
                diagRight = new geom.Vector(rect.shape.width / 2, -rect.shape.height / 2),
                corners = [
                    rect.position.add(diagLeft),
                    rect.position.add(diagRight),
                    rect.position.subtract(diagLeft),
                    rect.position.subtract(diagRight)
                ],
                top = new geom.Segment(corners[0], corners[1]),
                right = new geom.Segment(corners[1], corners[2]),
                bottom = new geom.Segment(corners[2], corners[3]),
                left = new geom.Segment(corners[3], corners[0]);
            if ((Math.abs(move.x) <= rect.shape.width / 2 - EPS && Math.abs(move.y) <= rect.shape.height / 2 - EPS) // center inside
                || geom.distance(circ.position, top) < circ.shape.radius - EPS
                || geom.distance(circ.position, right) < circ.shape.radius - EPS
                || geom.distance(circ.position, bottom) < circ.shape.radius - EPS
                || geom.distance(circ.position, left) < circ.shape.radius - EPS) {
                var norm, delta;
                if (Math.abs(move.x) * rect.shape.height > Math.abs(move.y) * rect.shape.width) {
                    norm = new geom.Vector(util.sign(move.x), 0);
                    delta = rect.shape.width / 2 - Math.abs(move.x) + circ.shape.radius;
                } else {
                    norm = new geom.Vector(0, util.sign(move.y));
                    delta = rect.shape.height / 2 - Math.abs(move.y) + circ.shape.radius;
                }
                return {
                    force: norm.multiply(delta * RIGIDNESS),
                    impulse: calcImpulse(circ, rect, norm)
                };
            }
            return ZERO_COLLISION_EFFECT;
        }
    );

    registerCollisionResolver(rectType, rectType,
        /**
         * @param {phys.Body.<phys.Rectangle>} a
         * @param {phys.Body.<phys.Rectangle>} b
         * @return {phys.CollisionEffect}
         */
        function (a, b) {
            // TODO
            return ZERO_COLLISION_EFFECT;
        }
    );

    /**
     * @param {number} gravity
     * @param {number} cof
     * @constructor
     */
    phys.World = function (gravity, cof) {
        /**
         * @const {number}
         */
        this.gravity = gravity;
        /**
         * @const {number}
         */
        this.cof = cof;
    };

    /**
     * @this {phys.World}
     * @template T
     * @param {Array.<T>} wrappers
     * @param {function(T):phys.Body.<?>} unwrapper
     * @param {number} time
     */
    function applyFriction(wrappers, unwrapper, time) {
        wrappers.forEach(function (wrapped) {
            var unwrapeped = unwrapper.call(null, wrapped);
            if (unwrapeped.speed.approximatelyEqual(geom.Vector.ZERO))
                return;
            var acceleration = unwrapeped.speed.normalized().multiply(this.cof * this.gravity),
                newSpeed = unwrapeped.speed.subtract(acceleration.multiply(time));
            if (unwrapeped.speed.dot(newSpeed) < EPS) {
                unwrapeped.speed = geom.Vector.ZERO;
            } else {
                unwrapeped.speed = newSpeed;
            }
        }, this);
    }

    /**
     * @this {phys.World}
     * @template T
     * @param {Array.<T>} wrappers
     * @param {?function(T):phys.Body.<?>} unwrapper
     * @param {number} time
     */
    function updatePositions(wrappers, unwrapper, time) {
        wrappers.forEach(function (wrapped) {
            var unwrapped = unwrapper.call(null, wrapped);
            unwrapped.position = unwrapped.position.add(unwrapped.speed.multiply(time));
        }, this);
    }

    /**
     * @template T
     * @param {Array.<T>} wrappers
     * @param {?function(T):phys.Body.<?>} unwrapper
     * @param {number} time
     */
    phys.World.prototype.simulate = function (wrappers, unwrapper, time) {
        var i, j,
            n = wrappers.length,
            impulses = util.arrayOf(n, geom.Vector.ZERO);
        unwrapper = unwrapper || util.identity;
        applyFriction.call(this, wrappers, unwrapper, time);
        for (i = 0; i < n; ++i) {
            var a = unwrapper.call(null, wrappers[i]);
            for (j = i + 1; j < n; ++j) {
                var b = unwrapper.call(null, wrappers[j]);
                var effect = phys.collide(a, b);
                impulses[i] = impulses[i].add(effect.impulse).add(effect.force.multiply(time));
                impulses[j] = impulses[j].subtract(effect.impulse).subtract(effect.force.multiply(time));
            }
        }
        for (i = 0; i < n; ++i) {
            var unwrapped = unwrapper.call(null, wrappers[i]);
            unwrapped.speed = unwrapped.speed.add(impulses[i].divide(unwrapped.weight));
        }
        updatePositions.call(this, wrappers, unwrapper, time);
    };
})();