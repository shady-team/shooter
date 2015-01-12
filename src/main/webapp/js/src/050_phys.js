// requires util, geom
(function () {
    /**
     * @constructor
     */
    phys.Shape = function Shape() {
        /**
         * @const {string}
         */
        this.descriptor = this.constructor.DESCRIPTOR;
    };

    /**
     * @constructor
     * @extends {phys.Shape}
     * @param {number} radius
     */
    phys.Circle = function Circle(radius) {
        phys.Shape.call(this);
        /**
         * @const
         * @type {number}
         */
        this.radius = radius;
    };

    /**
     * @static
     * @const {string}
     */
    phys.Circle.DESCRIPTOR = "circle";

    /**
     * @static
     * @param {phys.Circle} obj
     * @return {phys.Circle}
     */
    phys.Circle.revive = function (obj) {
        return new phys.Circle(obj.radius);
    };

    /**
     * @constructor
     * @extends {phys.Shape}
     * @param {number} width
     * @param {number} height
     */
    phys.Rectangle = function Rectangle(width, height) {
        phys.Shape.call(this);
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

    /**
     * @static
     * @const {string}
     */
    phys.Rectangle.DESCRIPTOR = "rect";

    /**
     * @static
     * @param {phys.Rectangle} obj
     * @return {phys.Rectangle}
     */
    phys.Rectangle.revive = function (obj) {
        return new phys.Rectangle(obj.width, obj.height);
    };

    var reviversHolder = new util.ReviversHolder(
        /**
         * @param {phys.Shape} shape
         * @return {string}
         */
        function (shape) {
            return shape.descriptor;
        }
    );

    reviversHolder.registerReviver(phys.Circle.DESCRIPTOR, phys.Circle.revive);
    reviversHolder.registerReviver(phys.Rectangle.DESCRIPTOR, phys.Rectangle.revive);

    /**
     * @param {geom.Vector} position
     * @param {S} shape
     * @param {number} weight
     * @constructor
     * @template S
     */
    phys.Body = function Body(position, shape, weight) {
        this.position = position;
        this.shape = shape;
        this.weight = weight;
    };

    /**
     * @param {phys.Body} obj
     * @return {phys.Body}
     */
    phys.reviveBody = function (obj) {
        return new phys.Body(geom.Vector.revive(obj.position), reviversHolder.revive(obj.shape), obj.weight);
    };

    /**
     * @type {Object.<string, function(phys.Body.<?>,phys.Body.<?>):boolean>}
     */
    var collisionHandlers = Object.create(null);

    /**
     * @param {string} a
     * @param {string} b
     * @return {string}
     */
    function collisionKey(a, b) {
        return a + "&" + b;
    }

    /**
     * @param {string} descriptorA
     * @param {string} descriptorB
     * @param {function(phys.Body.<?>,phys.Body.<?>):boolean} resolver
     */
    function registerCollisionResolver(descriptorA, descriptorB, resolver) {
        collisionHandlers[collisionKey(descriptorA, descriptorB)] = resolver;
        if (descriptorA !== descriptorB) {
            collisionHandlers[collisionKey(descriptorB, descriptorA)] = util.swapBinary(resolver);
        }
    }

    /**
     * @param {phys.Body.<?>} a
     * @param {phys.Body.<?>} b
     * @return {boolean}
     */
    phys.collide = function collide(a, b) {
        var handler = collisionHandlers[collisionKey(a.shape.descriptor, b.shape.descriptor)];
        return handler.call(null, a, b);
    };

    /**
     * @param {phys.Body.<?>} a
     * @param {phys.Body.<?>} b
     * @param {geom.Vector} force
     */
    function applyForce(a, b, force) {
        var aPart = 1 / (a.weight / b.weight + 1), // protected against Infinities
            bPart = 1 / (b.weight / a.weight + 1);
        a.position = a.position.add(force.multiply(aPart));
        b.position = b.position.subtract(force.multiply(bPart));
    }

    registerCollisionResolver(phys.Circle.DESCRIPTOR, phys.Circle.DESCRIPTOR,
        /**
         * @param {phys.Body.<phys.Circle>} a
         * @param {phys.Body.<phys.Circle>} b
         * @return {boolean}
         */
        function (a, b) {
            util.assert(a !== b, "colliding body with itself");
            var move = a.position.subtract(b.position),
                delta = a.shape.radius + b.shape.radius - move.length();
            if (delta < EPS) {
                return false;
            }
            applyForce(a, b, move.normalized().multiply(delta));
            return true;
        }
    );

    registerCollisionResolver(phys.Circle.DESCRIPTOR, phys.Rectangle.DESCRIPTOR,
        /**
         * @param {phys.Body.<phys.Circle>} circ
         * @param {phys.Body.<phys.Rectangle>} rect
         * @return {boolean}
         */
        function (circ, rect) {
            var move = circ.position.subtract(rect.position);
            if (Math.abs(move.x) > circ.shape.radius + rect.shape.width / 2 - EPS
                || Math.abs(move.y) > circ.shape.radius + rect.shape.height / 2 - EPS) {
                return false;
            }
            var force = Math.abs(move.x) * rect.shape.height > Math.abs(move.y) * rect.shape.width
                    ? new geom.Vector(util.sign(move.x), 0)
                            .multiply(rect.shape.width / 2 - Math.abs(move.x) + circ.shape.radius)
                    : new geom.Vector(0, util.sign(move.y))
                            .multiply(rect.shape.height / 2 - Math.abs(move.y) + circ.shape.radius),
                diagLeft = new geom.Vector(-rect.shape.width / 2, -rect.shape.height / 2),
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
                applyForce(circ, rect, force);
                return true;
            }
            return false;
        }
    );

    registerCollisionResolver(phys.Rectangle.DESCRIPTOR, phys.Rectangle.DESCRIPTOR,
        /**
         * @param {phys.Body.<phys.Rectangle>} a
         * @param {phys.Body.<phys.Rectangle>} b
         * @return {boolean}
         */
        function (a, b) {
            // TODO
            return false;
        }
    );

    /**
     * @template T
     * @param {Array.<T>} wrappers
     * @param {function(T):phys.Body.<?>=} unwrapper
     */
    phys.simulate = function (wrappers, unwrapper) {
        var satisfied = false,
            iterations, i, j,
            n = wrappers.length;
        unwrapper = unwrapper || util.identity;
        for (iterations = 0; !satisfied; iterations++) {
            util.assert(iterations < 1000, "Too many iterations to satisfy constraints. Bug?");
            satisfied = true;
            for (i = 0; i < n; ++i) {
                var a = unwrapper.call(null, wrappers[i]);
                for (j = i + 1; j < n; ++j) {
                    var b = unwrapper.call(null, wrappers[j]);
                    satisfied &= !phys.collide(a, b);
                }
            }
        }
        util.log('physic simulation took ', iterations, ' iterations');
    };
})();