module('net', ['util', 'events'], function (util, events) {
    var /** @const */ E_ICE = 'ice',
        /** @const */ E_OFFER = 'offer',
        /** @const */ E_ACCEPT = 'accept',
        /** @const */ E_REJECT = 'reject',

        /** @const */ ICE_SERVERS = [{url: "stun:stun.l.google.com:19302"}];

    /**
     * @param {string} url
     * @constructor
     */
    function Observer(url) {
        this._ws = new WebSocket(url);
        /**
         * @type {Object<string,function(*)>}
         * @private
         */
        this._on = {};
        /**
         * @type {?function(Event)}
         */
        this.onOpen = null;
        /**
         * @type {?function(Event)}
         */
        this.onClose = null;
        initObserverEvents.call(this);
    }

    /**
     * @this {Observer}
     */
    function initObserverEvents() {
        var ws = this._ws;
        ws.onopen = wsOpen.bind(this);
        ws.onerror = wsError.bind(this);
        ws.onclose = wsClose.bind(this);
        ws.onmessage = wsMessage.bind(this);
    }

    /**
     * @this {Observer}
     * @param {Event} evt
     */
    function wsOpen(evt) {
        this.onOpen && this.onOpen(evt);
    }

    /**
     * @this {Observer}
     * @param {Event} evt
     */
    function wsError(evt) {
        util.logger.log("observing connection establishment failed", evt);
    }

    /**
     * @this {Observer}
     * @param {Event} evt
     */
    function wsClose(evt) {
        this.onClose && this.onClose(evt);
    }

    /**
     * @this {Observer}
     * @param {MessageEvent<?>} message
     */
    function wsMessage(message) {
        var parts = message.data.split("\n\n", 2),
            type = parts[0],
            content = parts[1];
        this._on[type] && this._on[type].call(this, JSON.parse(content));
    }

    /**
     * @param {string} type
     * @param {function(*)} handler
     */
    Observer.prototype.on = function (type, handler) {
        this._on[type] = handler;
    };

    /**
     * @param {string} type
     * @param {*} message
     */
    Observer.prototype.send = function (type, message) {
        this._ws.send(type + "\n\n" + JSON.stringify(message));
    };

    /**
     * @param {Observer} observer
     * @constructor
     * @extends {WithEvents}
     */
    function WebRTC(observer) {
        this._observer = observer;
        /**
         * @type {Object<string, RTCPeerConnection>}
         * @private
         */
        this._peerConnections = {};
        /**
         * @type {Object<string, RTCDataChannel>}
         * @private
         */
        this._dataChannels = {};
        initSubscriptions.call(this);

        /**
         * reject all by default
         * @param {*} offer
         * @param {function()} accept
         * @param {function(string=)} reject
         */
        this.onIncomingConnection = function (offer, accept, reject) { reject(); };
    }

    WebRTC.prototype = new events.WithEvents();

    /**
     * @param {string} peerId
     */
    WebRTC.prototype.sendOffer = function (peerId) {
        var observer = this._observer;
        var pc = createPeerConnection.call(this, peerId);
        var channel = pc.createDataChannel("dc-" + peerId, {ordered: false, maxRetransmits: 0});
        pc.createOffer(function (desc) {
            pc.setLocalDescription(desc, function () {
                observer.send(E_OFFER, {id: peerId, description: desc});
            }, function (err) {
                util.logger.log('Failed to setLocalDescription():', err);
            });
        }, function (err) {
            util.logger.log('Failed to createOffer():', err);
        });
        this._peerConnections[peerId] = pc;
        this._dataChannels[peerId] = channel;
        initDataChannelHandlers.call(this, peerId);
    };

    /**
     * @this {WebRTC}
     */
    function initSubscriptions() {
        var self = this;
        var observer = this._observer;

        observer.on(E_OFFER, function (offer) {
            var id = offer.id;

            self.onIncomingConnection(offer, function () {
                var pc = createPeerConnection.call(self, id);

                function rejectOnError(err) {
                    util.logger.log(err);
                    observer.send(E_REJECT, {id: id, reason: 'Error occurred'});
                    pc.close();
                }

                pc.ondatachannel = function (evt) {
                    self._dataChannels[id] = evt.channel;
                    initDataChannelHandlers.call(self, id);
                };
                pc.setRemoteDescription(new RTCSessionDescription(offer.description), function () {
                    pc.createAnswer(function (desc) {
                        pc.setLocalDescription(desc, function () {
                            observer.send(E_ACCEPT, {id: id, description: desc});
                        }, rejectOnError);
                    }, rejectOnError);
                }, rejectOnError);
                self._peerConnections[id] = pc;
            }, function (reason) {
                observer.send(E_REJECT, {id: id, reason: reason});
            });
        });

        observer.on(E_ACCEPT, function (accept) {
            var id = accept.id;
            if (id in self._peerConnections) {
                var pc = self._peerConnections[id];
                pc.setRemoteDescription(new RTCSessionDescription(accept.description), function () {}, function (err) {
                    util.logger.log("Failed to setRemoteDescription():", err);
                    pc.close();
                });
            }
        });

        observer.on(E_REJECT, function (reject) {
            var id = reject.id,
                pc = self._peerConnections[id];
            if (pc) {
                pc.close();
                self.onOfferRejected && self.onOfferRejected(reject);
            }
        });

        observer.on(E_ICE, function (ice) {
            var id = ice.id,
                pc = self._peerConnections[id];
            if (pc)
                pc.addIceCandidate(new RTCIceCandidate(ice.candidate));
        });
    }

    /**
     * @this {WebRTC}
     * @param {string} id
     * @return {RTCPeerConnection}
     */
    function createPeerConnection(id) {
        var observer = this._observer,
            config = {iceServers: ICE_SERVERS},
            peerConnection = new RTCPeerConnection(config);

        peerConnection.onicecandidate = function (evt) {
            var candidate = evt.candidate;
            if (candidate) {
                observer.send(E_ICE, {id: id, candidate: candidate});
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };

        return peerConnection;
    }

    /**
     * @this {WebRTC}
     */
    function initDataChannelHandlers(id) {
        var dc = this._dataChannels[id],
            self = this;

        dc.onopen = this.fire.bind(this, events.E_OPEN, id);
        dc.onclose = function (evt) {
            self.closeConnection(id);
            self.fire(events.E_CLOSE, id, evt);
        };
        dc.onerror = this.fire.bind(this, events.E_ERROR, id);
        dc.onmessage = function (event) {
            self.fire(events.E_MESSAGE, id, event.data);
        };
    }

    /**
     * @param {string} id
     */
    WebRTC.prototype.closeConnection = function (id) {
        if (id in this._peerConnections) {
            this._peerConnections[id].close();

            this._dataChannels[id] = null;
            this._peerConnections[id] = null;
        }
    };

    /**
     * @param {string} id
     * @param {string} data
     */
    WebRTC.prototype.send = function (id, data) {
        if (!(id in this._dataChannels)) {
            throw new Error("No such id");
        }
        this._dataChannels[id].send(data);
    };

    return {
        Observer: Observer,
        WebRTC: WebRTC
    };
});