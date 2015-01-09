/** @const */
var geom = {};

(function () {
    /**
     * 2D Vector
     * @param {!number} x
     * @param {!number} y
     * @constructor
     */
    geom.Vector = function Vector(x, y) {
        /** @const {number} */
        this.x = x;
        /** @const {number} */
        this.y = y;
    };

    geom.Vector.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
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
})();