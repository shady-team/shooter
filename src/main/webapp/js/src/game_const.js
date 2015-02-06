goog.provide('game.const');

goog.require('webgl');

(function () {
    game.const.player = {};
    /**
     * @const {number}
     */
    game.const.player.radius = 20;
    /**
     * @const {number}
     */
    game.const.player.weight = 0.6;
    /**
     * @const {number}
     */
    game.const.player.maxSpeed = 100;
    /**
     * @const {number}
     */
    game.const.player.removedAngle = 30;


    game.const.bullet = {};
    /**
     * @const {number}
     */
    game.const.bullet.radius = 2;
    /**
     * @const {number}
     */
    game.const.bullet.weight = 0.06;
    /**
     * @const {number}
     */
    game.const.bullet.speed = 200;
    /**
     * @const {webgl.Color}
     */
    game.const.bullet.color = webgl.RED_COLOR;
})();