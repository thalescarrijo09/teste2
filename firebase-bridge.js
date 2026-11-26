// Ponte Firebase Realtime Database para os Tablets (substitui o PeerJS)
// Cole abaixo a URL do seu Firebase Realtime Database (entre as aspas):
const FIREBASE_DATABASE_URL = "https://tabuada-970e8-default-rtdb.firebaseio.com/";

(function () {
  function cleanData(obj) {
    return JSON.parse(JSON.stringify(obj === undefined ? null : obj));
  }

  function Emitter() {
    this._ev = {};
  }
  Emitter.prototype.on = function (name, fn) {
    if (!this._ev[name]) this._ev[name] = [];
    this._ev[name].push(fn);
  };
  Emitter.prototype._emit = function (name, arg) {
    (this._ev[name] || []).forEach(function (fn) {
      try { fn(arg); } catch (e) { console.error(e); }
    });
  };

  function getDb() {
    const url = String(FIREBASE_DATABASE_URL || "").trim().replace(/\/+$/, "");
    if (!url || url.indexOf("COLE_AQUI") !== -1 || !url.startsWith("https://")) {
      return null;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp({ databaseURL: url });
    }
    return firebase.database();
  }

  // Conexão no lado do Operador (Host)
  function HostConn(clientRef) {
    Emitter.call(this);
    this.open = true;
    this._clientRef = clientRef;
    this._inboxRef = clientRef.child("inbox");
    this._outboxRef = clientRef.child("outbox");
    this._onlineRef = clientRef.child("online");
    this._closed = false;
  }
  HostConn.prototype = Object.create(Emitter.prototype);
  HostConn.prototype._start = function () {
    const self = this;
    this._onOutbox = function (snap) {
      if (self._closed) return;
      const val = snap.val();
      snap.ref.remove().catch(function () {});
      if (val !== null) self._emit("data", val);
    };
    this._outboxRef.on("child_added", this._onOutbox);

    this._onOnline = function (snap) {
      if (self._closed) return;
      if (!snap.val()) self.close(false);
    };
    this._onlineRef.on("value", this._onOnline);
  };
  HostConn.prototype.send = function (msg) {
    if (!this.open || this._closed) return;
    this._inboxRef.push(cleanData(msg)).catch(function (err) {
      console.error("Erro ao enviar ao tablet:", err);
    });
  };
  HostConn.prototype.close = function (removeNode) {
    if (this._closed) return;
    this._closed = true;
    this.open = false;
    if (this._onOutbox) this._outboxRef.off("child_added", this._onOutbox);
    if (this._onOnline) this._onlineRef.off("value", this._onOnline);
    if (removeNode !== false) {
      this._clientRef.remove().catch(function () {});
    }
    this._emit("close");
  };

  // Conexão no lado do Tablet (Cliente)
  function ClientConn(db, roomId) {
    Emitter.call(this);
    this.open = false;
    this._db = db;
    this._roomRef = db.ref("tabuada_salas/" + roomId);
    this._hostRef = this._roomRef.child("host");
    this._clientId = "tb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    this._clientRef = this._roomRef.child("clients/" + this._clientId);
    this._inboxRef = this._clientRef.child("inbox");
    this._outboxRef = this._clientRef.child("outbox");
    this._connectedSession = null;
    this._closed = false;

    const self = this;
    this._onHost = function (snap) {
      if (self._closed) return;
      const host = snap.val();
      if (host && host.online && host.session) {
        if (!self.open) {
          self._connectedSession = host.session;
          self._attachClient(host.session);
        } else if (self._connectedSession !== host.session) {
          self.close();
        }
      } else if (self.open) {
        self.close();
      }
    };
    this._hostRef.on("value", this._onHost, function (err) {
      if (err && err.code === "PERMISSION_DENIED") {
        alert("Permissão negada no Firebase! Verifique se o Realtime Database está em Modo de Teste.");
      }
      self._emit("error", err);
    });
  }
  ClientConn.prototype = Object.create(Emitter.prototype);
  ClientConn.prototype._attachClient = function (session) {
    const self = this;
    this._clientRef.onDisconnect().remove();
    this._clientRef.set({ online: true, session: session }).then(function () {
      if (self._closed) return;
      self._onInbox = function (snap) {
        if (self._closed) return;
        const val = snap.val();
        snap.ref.remove().catch(function () {});
        if (val !== null) self._emit("data", val);
      };
      self._inboxRef.on("child_added", self._onInbox);
      self.open = true;
      self._emit("open");
    }).catch(function (err) {
      self._emit("error", err);
    });
  };
  ClientConn.prototype.send = function (msg) {
    if (!this.open || this._closed) return;
    this._outboxRef.push(cleanData(msg)).catch(function (err) {
      console.error("Erro ao enviar ao operador:", err);
    });
  };
  ClientConn.prototype.close = function (silent) {
    if (this._closed) return;
    this._closed = true;
    const wasOpen = this.open;
    this.open = false;
    if (this._onHost) this._hostRef.off("value", this._onHost);
    if (this._onInbox) this._inboxRef.off("child_added", this._onInbox);
    this._clientRef.remove().catch(function () {});
    if (!silent && wasOpen) this._emit("close");
  };

  // Interface compatível com controle.html e tablet.html
  function FirebasePeer(id) {
    Emitter.call(this);
    this.id = typeof id === "string" ? id : null;
    this.destroyed = false;
    this.disconnected = false;
    this._hostConns = {};
    this._lastClientConn = null;

    const db = getDb();
    if (!db) {
      const self = this;
      setTimeout(function () {
        alert("Cole a URL do Firebase Realtime Database na linha 3 do arquivo firebase-bridge.js!");
        self._emit("error", { type: "missing-config" });
      }, 150);
      return;
    }
    this._db = db;

    if (this.id) {
      this._startHost();
    } else {
      const self = this;
      setTimeout(function () {
        if (!self.destroyed) self._emit("open", "client");
      }, 50);
    }
  }
  FirebasePeer.prototype = Object.create(Emitter.prototype);

  FirebasePeer.prototype._startHost = function () {
    const self = this;
    const roomRef = this._db.ref("tabuada_salas/" + this.id);
    const hostRef = roomRef.child("host");
    const clientsRef = roomRef.child("clients");
    const session = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

    this._roomRef = roomRef;
    this._hostRef = hostRef;
    this._clientsRef = clientsRef;

    clientsRef.remove().catch(function () {}).finally(function () {
      if (self.destroyed) return;
      hostRef.onDisconnect().remove();
      hostRef.set({ online: true, session: session }).then(function () {
        if (self.destroyed) return;

        self._onClientAdded = function (snap) {
          if (self.destroyed) return;
          const cid = snap.key;
          const val = snap.val();
          if (!val || !val.online) return;
          const conn = new HostConn(snap.ref);
          self._hostConns[cid] = conn;
          self._emit("connection", conn);
          conn._start();
        };

        self._onClientRemoved = function (snap) {
          const cid = snap.key;
          if (self._hostConns[cid]) {
            self._hostConns[cid].close(false);
            delete self._hostConns[cid];
          }
        };

        clientsRef.on("child_added", self._onClientAdded);
        clientsRef.on("child_removed", self._onClientRemoved);
        self._emit("open", self.id);
      }).catch(function (err) {
        if (err && err.code === "PERMISSION_DENIED") {
          alert("Permissão negada no Firebase! Coloque as regras do Realtime Database em Modo de Teste.");
        }
        self._emit("error", { type: "firebase-error", message: err.message });
      });
    });
  };

  FirebasePeer.prototype.connect = function (targetId) {
    if (this._lastClientConn) {
      this._lastClientConn.close(true);
    }
    const conn = new ClientConn(this._db, targetId);
    this._lastClientConn = conn;
    return conn;
  };

  FirebasePeer.prototype.reconnect = function () {};

  FirebasePeer.prototype.destroy = function () {
    this.destroyed = true;
    if (this._clientsRef && this._onClientAdded) {
      this._clientsRef.off("child_added", this._onClientAdded);
    }
    if (this._clientsRef && this._onClientRemoved) {
      this._clientsRef.off("child_removed", this._onClientRemoved);
    }
    Object.keys(this._hostConns).forEach(function (cid) {
      this._hostConns[cid].close(false);
    }, this);
    this._hostConns = {};
    if (this._hostRef) {
      this._hostRef.remove().catch(function () {});
    }
    if (this._lastClientConn) {
      this._lastClientConn.close(true);
      this._lastClientConn = null;
    }
  };

  window.Peer = FirebasePeer;
})();
