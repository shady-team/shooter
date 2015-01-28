goog.provide('geom');

goog.require('util');
goog.require('rtt');

/** @const {number} */
var EPS = 1e-4;

(function () {
    /**
     * @interface
     * @extends {rtt.Typed}
     */
    geom.Primitive = function Primitive() {};

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
     * @const {geom.Vector}
     */
    geom.Vector.ZERO = new geom.Vector(0, 0);

    var vectorType = rtt.global.registerType('vec', geom.Vector.prototype);
    /**
     * @const {string}
     */
    geom.Vector.prototype.type = vectorType;

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
     * @return {geom.Vector}
     */
    geom.Vector.prototype.negate = function () {
        return new geom.Vector(-this.x, -this.y);
    };

    /**
     * @param {number} k
     * @return {geom.Vector}
     */
    geom.Vector.prototype.multiply = function (k) {
        return new geom.Vector(this.x * k, this.y * k);
    };

    /**
     * @param {number} k
     * @return {geom.Vector}
     */
    geom.Vector.prototype.divide = function (k) {
        return new geom.Vector(this.x / k, this.y / k);
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
        return this.x * v.x + this.y * v.y;
    };

    /**
     * @param {geom.Vector} v
     * @return {number}
     */
    geom.Vector.prototype.cross = function (v) {
        return this.x * v.y - this.y * v.x;
    };

    /**
     * @param {geom.Vector} v
     * @return {boolean}
     */
    geom.Vector.prototype.approximatelyEqual = function (v) {
        return Math.abs(this.x - v.x) < EPS && Math.abs(this.y - v.y) < EPS;
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

    var segmentType = rtt.global.registerType('segment', geom.Segment.prototype);
    /**
     * @const {string}
     */
    geom.Segment.prototype.type = segmentType;

    /**
     * @return {number}
     */
    geom.Segment.prototype.length = function() {
        return this.a.subtract(this.b).length();
    };

    var distance = new rtt.MutliMethod;

    /**
     * @param {string} typeA
     * @param {string} typeB
     * @param {function(?,?):number} calculator
     */
    function registerDistanceCalculator(typeA, typeB, calculator) {
        distance.overload(calculator, typeA, typeB);
        if (typeA !== typeB) {
            distance.overload(util.swapBinary(calculator), typeB, typeA);
        }
    }

    /**
     * @param {geom.Primitive} a
     * @param {geom.Primitive} b
     */
    geom.distance = function(a, b) {
        return distance.call(null, a, b);
    };

    registerDistanceCalculator(vectorType, vectorType,
        /**
         * @param {geom.Vector} a
         * @param {geom.Vector} b
         * @return {number}
         */
        function (a, b) {
            return a.subtract(b).length();
        }
    );

    registerDistanceCalculator(vectorType, segmentType,
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

    registerDistanceCalculator(segmentType, segmentType,
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