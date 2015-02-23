goog.provide('ui');

goog.require('events');
goog.require('net');
goog.require('game.client');
goog.require('game.server');
goog.require('game.chat');

(function () {
    /**
     * @param {HTMLElement} root
     * @constructor
     * @implements {game.chat.Chat}
     * @extends {events.EventBus}
     */
    ui.HtmlChat = function (root) {
        events.EventBus.call(this);
        this._root = root;
        this._messages = root.querySelector(".chat--messages");
        this._input = root.querySelector(".chat--input");

        var self = this;
        this._input.addEventListener("keypress", function (e) {
            if (e.keyCode === 13) {
                var message = this.value.trim();
                if (message != "") {
                    self.fire(game.chat.E_MESSAGE_SENT, message);
                } else {
                    self.fire(game.chat.E_MESSAGE_CANCELED);
                }
                this.value = "";
            }
            //if (e.keyCode)
        });
    };

    ui.HtmlChat.prototype = Object.create(events.EventBus.prototype);

    ui.HtmlChat.prototype.focus = function () {
        this._root.classList.add('chat-focused');
        this._input.focus();
    };

    ui.HtmlChat.prototype.blur = function () {
        this._root.classList.remove('chat-focused');
    };

    ui.HtmlChat.prototype.addMessage = function (author, message) {
        var div = document.createElement("div");
        div.className = "chat--message";
        div.innerHTML = '<span class="chat--messageAuthor">' + author + '</span><span class="chat--messageText">' + message +'</span>';
        this._messages.appendChild(div);
    };


    var $ = document.getElementById.bind(document);
    var observer, webRtc, server,
        container = $("game-container"),
        loginForm = $("login-form"),
        loginPopup = $("login-popup"),
        postLoginPopup = $("post-login-popup"),
        peerList = $("peers"),
        hostList = $("hosts"),
        chat = new ui.HtmlChat($("chat"));

    /**
     * @param {?Event=} evt
     */
    loginForm.onsubmit = function (evt) {
        evt.preventDefault();

        var nickname = $("nickname").value;
        observer = new net.Observer("ws://" + location.host + "/observer?nickname=" + encodeURI(nickname));
        observer.onOpen = function () {
            loginPopup.classList.remove("popup-visible");
            postLoginPopup.classList.add("popup-visible");
            webRtc = new net.WebRTC(this);
            webRtc.onIncomingConnection = function (offer, accept, reject) {
                if (confirm(offer.id + " is offering connection.\nAccept?")) {
                    accept();
                } else {
                    reject('User rejected');
                }
            };
            webRtc.on(events.E_OPEN, function (id) {
                postLoginPopup.classList.remove("popup-visible");
                new game.client.GameClient(new game.net.RemoteServer(new game.net.WebRTCConnectorAdapter(webRtc), id), container, chat);
            });
        };
        observer.on("peers", function (data) {
            updatePeerList(data);
        });
        observer.on("hosts", function (data) {
            updateHostList(data);
        });
        $("login-display").innerHTML = nickname;
    };

    function updatePeerList(peers) {
        peerList.innerHTML = peers.reduce(function (prev, peer) {
            return prev + "<li>" + peer['nickname'] + "@" + peer['id'] + "</li>";
        }, "");
    }

    function updateHostList(hosts) {
        hostList.innerHTML = hosts.reduce(function (prev, host) {
            return prev + "<li>" + host['id'] + ' <button class="button-mini" data-host-id="' + host['id'] + '">Connect</button></li>';
        }, "");
    }

    hostList.addEventListener("click", function (evt) {
        if (evt.target.hasAttribute("data-host-id")) {
            var peerId = evt.target.getAttribute("data-host-id");
            evt.target.disabled = true;
            webRtc.sendOffer(peerId);
        }
    });

    function requestLists() {
        observer.send("hosts", '');
        observer.send("peers", '');
    }

    $("host").addEventListener("click", function () {
        observer.send("host", {});
        webRtc.off(events.E_OPEN);
        var connector = new game.net.WebRTCConnectorAdapter(webRtc);
        server = new game.server.GameServer(connector);
        new game.client.GameClient(new game.net.LocalServer(connector), container, chat);
        postLoginPopup.classList.remove("popup-visible");
    });

    window.addEventListener("load", function () {
        $("login-popup").classList.add("popup-visible");
    });
})();