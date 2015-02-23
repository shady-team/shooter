goog.provide('game.chat');

goog.require('events');

(function () {
    /**
     * @interface
     * @extends {events.WithEvents}
     */
    game.chat.Chat = function () {
    };

    game.chat.Chat.prototype.focus = function () {
    };

    game.chat.Chat.prototype.blur = function () {
    };

    /**
     * @param {string} author
     * @param {string} message
     */
    game.chat.Chat.prototype.addMessage = function (author, message) {
    };

    /** @const {string} */
    game.chat.E_MESSAGE_SENT = "messageSent";
    /** @const {string} */
    game.chat.E_MESSAGE_CANCELED = "messageCanceled";
})();