(function (exports) {
    var E_ICE = 'ice',
        E_OFFER = 'offer',
        E_ACCEPT = 'accept',
        E_REJECT = 'reject',

        ICE_SERVERS = [{url: "stun:stun.l.google.com:19302"}];

    function Observer(url) {
        var ws = new WebSocket(url);
        ws.onopen = _onopen.bind(this);
        ws.onerror = _onerror.bind(this);
        ws.onclose = _onclose.bind(this);
        ws.onmessage = _onmessage.bind(this);
        this._ws = ws;
        this._on = {};
    }

    function _onopen(evt) {
        this.onOpen && this.onOpen(evt);
    }

    function _onerror(evt) {
        console.log("observing connection establishment failed", evt);
    }

    function _onclose(evt) {
        this.onClose && this.onClose(evt);
    }

    function _onmessage(message) {
        var parts = message.data.split("\n\n", 2);
        var type = parts[0];
        var content = parts[1];
        type in this._on && this._on[type].call(this, JSON.parse(content));
    }

    Observer.prototype.on = function (type, handler) {
        this._on[type] = handler;
    };

    Observer.prototype.send = function (type, message) {
        this._ws.send(type + "\n\n" + JSON.stringify(message));
    };

    function WebRTC(observer) {
        this._observer = observer;
        this._peerConnections = {};
        this._dataChannels = {};
        initSubscriptions.call(this);

        // reject all by default
        this.onIncomingConnection = function (offer, accept, reject) { reject(); };
    }

    WebRTC.prototype.sendOffer = function (peerId) {
        var observer = this._observer;
        var pc = createPeerConnection.call(this, peerId);
        var channel = pc.createDataChannel("dc-" + peerId, {ordered: false, maxRetransmits: 0});
        pc.createOffer(function (desc) {
            pc.setLocalDescription(desc, function () {
                observer.send(E_OFFER, {id: peerId, description: desc});
            }, function (err) {
                console.log('Failed to setLocalDescription():', err);
            });
        }, function (err) {
            console.log('Failed to createOffer():', err);
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
                    console.log(err);
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
                var dc = self._dataChannels[id];
                pc.setRemoteDescription(new RTCSessionDescription(accept.description), function () {}, function (err) {
                    console.log("Failed to setRemoteDescription():", err);
                    pc.close();
                });
            }
        });

        observer.on(E_REJECT, function (reject) {
            var id = reject.id;
            if (id in self._peerConnections) {
                self._peerConnections[id].close();
                self.onOfferRejected && self.onOfferRejected(reject);
            }
        });

        observer.on(E_ICE, function (ice) {
            if (ice.id in self._peerConnections)
                self._peerConnections[ice.id].addIceCandidate(new RTCIceCandidate(ice.candidate));
        });
    }

    /**
     * @this {WebRTC}
     */
    function createPeerConnection(id) {
        var observer = this._observer;
        var config = {iceServers: ICE_SERVERS};
        var peerConnection = new RTCPeerConnection(config);

        peerConnection.onicecandidate = function (evt) {
            var candidate = evt.candidate;
            if (candidate) {
                observer.send(E_ICE, {id: id, candidate: candidate});
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };

        return peerConnection;
    }

    function fireEvent(event, id, arg) {
        event in this && this[event].call(this, id, arg);
    }

    /**
     * @this {WebRTC}
     */
    function initDataChannelHandlers(id) {
        var dc = this._dataChannels[id];
        var self = this;

        dc.onopen = fireEvent.bind(this, 'onOpen', id);
        dc.onclose = function () {
            self.closeConnection(id);
            fireEvent.call(self, 'onClose', id);
        };
        dc.onerror = fireEvent.bind(this, 'onError', id);
        dc.onmessage = function (event) {
            fireEvent.call(self, 'onMessage', id, event.data);
        };
    }

    WebRTC.prototype.closeConnection = function (id) {
        if (id in this._peerConnections) {
            this._peerConnections[id].close();

            this._dataChannels[id] = null;
            this._peerConnections[id] = null;
        }
    };

    WebRTC.prototype.send = function (id, data) {
        if (!(id in this._dataChannels)) {
            throw new Error("No such id");
        }
        this._dataChannels[id].send(data);
    };

    exports.Observer = Observer;
    exports.WebRTC = WebRTC;
})(window);