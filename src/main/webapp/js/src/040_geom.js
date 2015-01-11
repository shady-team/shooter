// requires util

/** @const */
var geom = {};

(function () {
    /**
     * @interface
     */
    geom.Primitive = function Primitive() {};

    /**
     * @type {string}
     */
    geom.Primitive.descriptor;

    /**
     * 2D Vector
     * @param {!number} x
     * @param {!number} y
     * @constructor
     * @implements {geom.Primitive}
     */
    geom.Vector = function Vector(x, y) {
        /** @const */
        this.x = x;
        /** @const */
        this.y = y;
    };

    /**
     * @static
     * @const {string}
     */
    geom.Vector.DESCRIPTOR = 'vector';

    /**
     * @static
     * @const {geom.Vector}
     */
    geom.Vector.ZERO = new geom.Vector(0, 0);

    /**
     * @const {string}
     */
    geom.Vector.prototype.descriptor = geom.Vector.DESCRIPTOR;

    /**
     * @return {number}
     */
    geom.Vector.prototype.length = function () {
        return Math.sqrt(this.dot(this));
    };

    /**
     * @param {geom.Vector} v
     * @return {geom.Vector}
     */
    geom.Vector.prototype.add = function (v) {
        return new geom.Vector(this.x + v.x, this.y + v.y);
    };

    /**
     * @param {geom.Vector} v
     * @return {geom.Vector}
     */
    geom.Vector.prototype.subtract = function (v) {
        return new geom.Vector(this.x - v.x, this.y - v.y);
    };

    /**
     * @param {number} k
     * @return {geom.Vector}
     */
    geom.Vector.prototype.multiply = function (k) {
        return new geom.Vector(this.x * k, this.y * k);
    };

    /**
     * @return {geom.Vector}
     */
    geom.Vector.prototype.normalized = function () {
        var len = this.length();
        return new geom.Vector(this.x / len, this.y / len);
    };

    /**
     * @param {geom.Vector} v
     * @return {number}
     */
    geom.Vector.prototype.dot = function (v) {
        return this.x * v.x + this.y + v.y;
    };

    /**
     * @param {geom.Vector} v
     * @return {number}
     */
    geom.Vector.prototype.cross = function (v) {
        return this.x * v.y - this.y * v.x;
    };

    /**
     * @param {geom.Vector} a
     * @param {geom.Vector} b
     * @constructor
     * @implements {geom.Primitive}
     */
    geom.Segment = function Segment(a, b) {
        /** @const */
        this.a = a;
        /** @const */
        this.b = b;
    };

    /**
     * @const {string}
     */
    geom.Segment.DESCRIPTOR = 'segment';

    /**
     * @const {string}
     */
    geom.Segment.prototype.descriptor = geom.Segment.DESCRIPTOR;

    /**
     * @return {number}
     */
    geom.Segment.prototype.length = function() {
        return this.a.subtract(this.b).length();
    };

    /**
     * @type {Object.<string, function(geom.Primitive,geom.Primitive):number>}
     */
    var distanceCalculators = Object.create(null);

    /**
     * @param {string} a
     * @param {string} b
     * @return {string}
     */
    function pairDescriptor(a, b) {
        return a + "&" + b;
    }

    /**
     * @param {string} descriptorA
     * @param {string} descriptorB
     * @param {function(?,?):number} calculator
     */
    function registerDistanceCalculator(descriptorA, descriptorB, calculator) {
        distanceCalculators[pairDescriptor(descriptorA, descriptorB)] = calculator;
        if (descriptorA !== descriptorB) {
            distanceCalculators[pairDescriptor(descriptorB, descriptorA)] = util.swapBinary(calculator);
        }
    }

    /**
     * @param {geom.Primitive} a
     * @param {geom.Primitive} b
     */
    geom.distance = function distance(a, b) {
        var calculator = distanceCalculators[pairDescriptor(a.descriptor, b.descriptor)];
        util.assert(util.isDefined(calculator), "distance is not defined on pair of " + a.descriptor + " and " + b.descriptor);
        return calculator.call(null, a, b);
    };

    registerDistanceCalculator(geom.Vector.DESCRIPTOR, geom.Vector.DESCRIPTOR,
        /**
         * @param {geom.Vector} a
         * @param {geom.Vector} b
         * @return {number}
         */
        function (a, b) {
            return a.subtract(b).length();
        }
    );

    registerDistanceCalculator(geom.Vector.DESCRIPTOR, geom.Segment.DESCRIPTOR,
        /**
         * @param {geom.Vector} vec
         * @param {geom.Segment} seg
         * @return {number}
         */
        function (vec, seg) {
            if (vec.subtract(seg.b).dot(seg.b.subtract(seg.a)) > 0)
                return geom.distance(vec, seg.b);
            if (vec.subtract(seg.a).dot(seg.a.subtract(seg.b)) > 0)
                return geom.distance(vec, seg.a);
            return Math.abs(seg.b.subtract(seg.a).cross(vec.subtract(seg.a)) / seg.length());
        }
    );

    registerDistanceCalculator(geom.Segment.DESCRIPTOR, geom.Segment.DESCRIPTOR,
        /**
         * @param {geom.Vector} a
         * @param {geom.Segment} b
         * @return {number}
         */
        function (a, b) {
            // TODO
            return 0;
        }
    );
})();