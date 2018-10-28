const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Settings = imports.ui.settings;
const Lang = imports.lang;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;

function HelloDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

HelloDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,
    // called when extension is added
    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.initSettings(metadata, desklet_id);

        this.setupClient();

        this.setupUI();
    },
    // called when extension is disabled/removed
    on_desklet_removed: function () {
        this.socketClient.close();
    },

    onRefreshIntervalChanged: function() {
        console.log('refresh interval changed')
    },

    onSettingsChanged: function() {
        console.log('settings changed')
    },

    initSettings: function(metadata, desklet_id) {
        this.settings = new Settings.DeskletSettings(this, metadata.uuid, desklet_id);
        this.settings.bind("currency", "cfgCurrency", this.onSettingsChanged);
        this.settings.bind("source", "cfgSource", this.onSettingsChanged);
        this.settings.bind("refreshInterval", "cfgRefreshInterval", this.onRefreshIntervalChanged);

        this.cfgCurrency = this.cfgCurrency || "usd";
        this.cfgSource = this.cfgSource || "zenrus";
        this.cfgRefreshInterval = this.cfgRefreshInterval || 10;
    },

    setupUI: function() {
        // main container for the desklet
        this.window = new St.Bin();
        this.text = new St.Label();
        this.text.set_text("Hello, world!");
        
        this.window.add_actor(this.text);
        this.setContent(this.window);
        global.log("UI setupped successfully");
    },

    setupClient: function() {
        this.apiClient = new ApiClient();
        this.socketClient = new SocketClient(this.apiClient);
    }
}

function main(metadata, desklet_id) {
    return new HelloDesklet(metadata, desklet_id);
}

const SocketClient = new Lang.Class({
    Name: "SocketClient",

    _init: function(apiClient) {
        apiClient._httpSession.httpsAliases = ["ws"];

        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI("ws://zenrus.ru:8888/")
        });

        apiClient._httpSession.websocket_connect_async(message, null, null, null, Lang.bind(this, function(session, res) {
            this._websocketConnection = session.websocket_connect_finish(res);

            this._websocketConnection.connect("message", Lang.bind(this, function(connection, type, message) {
                var data = message.get_data();
                global.log("message get data: " + data);
            }));
        }));
    },

    close: function() {
        this._websocketConnection.close(Soup.WebsocketCloseCode.NORMAL, "");
    }
});

const ApiClient = new Lang.Class({
    Name: "ApiClient",

    _init: function() {
        this._httpSession = new Soup.Session({ ssl_use_system_ca_file: true });
        Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.ProxyResolverDefault());
    },
});
