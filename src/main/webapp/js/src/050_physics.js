// requires util, geom

/** @const */
var phys = {};

(function () {
    /**
     * @constructor
     */
    phys.Shape = function Shape() {
    };

    /**
     * @type {string}
     */
    phys.Shape.prototype.descriptor = "";

    /**
     * @constructor
     * @extends {phys.Shape}
     * @param {number} radius
     */
    phys.Circle = function Circle(radius) {
        /**
         * @const
         * @type {number}
         */
        this.radius = radius;
    };

    /**
     * @static
     * @const
     * @type {string}
     */
    phys.Circle.descriptor = "circle";

    /**
     * @const
     * @type {string}
     */
    phys.Circle.prototype.descriptor = phys.Circle.descriptor;

    /**
     * @param {number} width
     * @param {number} height
     * @constructor
     * @extends {phys.Shape}
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

    /**
     * @static
     * @const
     * @type {string}
     */
    phys.Rectangle.descriptor = "rect";

    /**
     * @const
     * @type {string}
     */
    phys.Rectangle.prototype.descriptor = phys.Rectangle.descriptor;

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
     * @type {Object.<string, function(phys.Body.<?>,phys.Body.<?>):boolean>}
     */
    var collisionHandlers = Object.create(null);

    /**
     * @param {string} descriptorA
     * @param {string} descriptorB
     * @return {string}
     */
    function collisionKey(descriptorA, descriptorB) {
        return descriptorA + "&" + descriptorB;
    }

    /**
     * @param {function(phys.Body.<?>,phys.Body.<?>):boolean} resolver
     * @param {phys.Body.<?>} a
     * @param {phys.Body.<?>} b
     * @return {boolean}
     */
    function swapped(resolver, a, b) {
        return resolver.call(null, b, a);
    }

    /**
     * @param {string} descriptorA
     * @param {string} descriptorB
     * @param {function(phys.Body.<?>,phys.Body.<?>):boolean} resolver
     */
    function registerCollisionResolver(descriptorA, descriptorB, resolver) {
        collisionHandlers[collisionKey(descriptorA, descriptorB)] = resolver;
        if (descriptorA !== descriptorB) {
            collisionHandlers[collisionKey(descriptorB, descriptorA)] = swapped.bind(null, resolver);
        }
    }

    /**
     * @param {phys.Body.<?>} a
     * @param {phys.Body.<?>} b
     * @return {boolean}
     */
    function collide(a, b) {
        var handler = collisionHandlers[collisionKey(a.shape.descriptor, b.shape.descriptor)];
        return handler.call(null, a, b);
    }

    registerCollisionResolver(phys.Circle.descriptor, phys.Circle.descriptor, function (a, b) {
        util.assert(a != b, "colliding body with itself");
        var move = b.position.subtract(a.position),
            delta = a.shape.radius + b.shape.radius - move.length();
        if (delta <= 0) {
            return false;
        }
        var aPart = delta / (b.weight / a.weight + 1),
            bPart = delta / (a.weight / b.weight + 1),
            norm = move.normalized();
        a.position = a.position.subtract(norm.multiply(aPart));
        b.position = b.position.add(norm.multiply(bPart));
        return true;
    });
})();