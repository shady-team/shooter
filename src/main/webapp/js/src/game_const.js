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
    game.const.player.maxSpeed = 200;
    /**
     * @const {number}
     */
    game.const.player.removedAngle = 30;
    /**
     * @const {number} - in ms
     */
    game.const.player.respawnTime = 500;
    /**
     * @const {number} - in degrees
     */
    game.const.player.viewAngle = 120;
    /**
     * @const {number}
     */
    game.const.player.viewRange = 300;


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
    game.const.bullet.speed = 300;
    /**
     * @const {webgl.Color}
     */
    game.const.bullet.color = webgl.WHITE_COLOR;
    /**
     * @const {number}
     */
    game.const.bullet.minSpreadAngle = 0.5;
    /**
     * @const {number}
     */
    game.const.bullet.maxSpreadAngle = 10;
    /**
     * @const {number} in ms
     */
    game.const.bullet.shootDelay = 60;
})();