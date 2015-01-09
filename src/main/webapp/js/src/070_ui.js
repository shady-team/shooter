(function () {
    var observer, webRtc, server,
        field = document.getElementById("field"),
        loginForm = document.getElementById("login-form"),
        postLogin = document.getElementById("post-login"),
        peerList = document.getElementById("peers"),
        hostList = document.getElementById("hosts");
    loginForm.onsubmit = function (evt) {
        evt.preventDefault();

        var nickname = document.getElementById("nickname").value;
        observer = new net.Observer("ws://" + location.host + "/observer?nickname=" + encodeURI(nickname));
        observer.onOpen = function () {
            webRtc = new net.WebRTC(this);
            webRtc.onIncomingConnection = function (offer, accept, reject) {
                if (confirm(offer.id + " is offering connection.\nAccept?")) {
                    accept();
                } else {
                    reject('User rejected');
                }
            };
            webRtc.on(events.E_OPEN, function (id) {
                new game.GameClient(new game.RemoteServer(new game.WebRTCConnectorAdapter(webRtc), id), field);
            });
        };
        observer.on("peers", function (data) {
            updatePeerList(data);
        });
        observer.on("hosts", function (data) {
            updateHostList(data);
        });

        loginForm.style.display = "none";
        postLogin.style.display = "";
        document.getElementById("login").innerHTML = nickname;
    };

    function updatePeerList(peers) {
        if (server) {
            peerList.innerHTML = peers.reduce(function (prev, peer) {
                return prev + "<li>" + peer['nickname'] + "@" + peer['id'] + ' <button data-peer-id="' + peer.id + '">Invite</button></li>';
            }, "");
        } else {
            peerList.innerHTML = peers.reduce(function (prev, peer) {
                return prev + "<li>" + peer['nickname'] + "@" + peer['id'] + "</li>";
            }, "");
        }
    }

    function updateHostList(hosts) {
        if (server) {
            hostList.innerHTML = hosts.reduce(function (prev, host) {
                return prev + "<li>" + host['id'] + '</li>';
            }, "");
        } else {
            hostList.innerHTML = hosts.reduce(function (prev, host) {
                return prev + "<li>" + host['id'] + ' <button data-host-id="' + host['id'] + '">Connect</button></li>';
            }, "");
        }
    }

    hostList.addEventListener("click", function (evt) {
        if (evt.target.hasAttribute("data-host-id")) {
            var peerId = evt.target.getAttribute("data-host-id");
            evt.target.disabled = true;
            webRtc.sendOffer(peerId);
        }
    });

    peerList.addEventListener("click", function (evt) {
        if (evt.target.hasAttribute("data-peer-id")) {
            var peerId = evt.target.getAttribute("data-peer-id");
            evt.target.disabled = true;
            webRtc.sendOffer(peerId);
        }
    });

    function requestLists() {
        observer.send("hosts", '');
        observer.send("peers", '');
    }

    document.getElementById("host").addEventListener("click", function () {
        observer.send("host", {});
        webRtc.off(events.E_OPEN);
        var connector = new game.WebRTCConnectorAdapter(webRtc);
        server = new game.GameServer(connector);
        new game.GameClient(new game.LocalServer(connector), field);
        requestLists();
        this.disabled = true;
    });
})();