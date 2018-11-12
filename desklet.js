const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Settings = imports.ui.settings;
const Lang = imports.lang;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;

const DEFAULT_RATE = "Loading...";
const DEFAULT_SOURCE = "ws://zenrus.ru:8888/";
const DEFAULT_CURRENCY = "usd";

const ZENRUS_WS_MAPPING = {
    usd: 0,
    eur: 1,
    brent: 2,
    bitcoin: 9,
    eth: 10,
    bch: 11,
}

function HelloDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

HelloDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,
    // called when extension is added
    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.initSettings(metadata, desklet_id);

        this.initConnection();

        this.setupUI();

        this.run();
    },
    // called when extension is disabled/removed
    on_desklet_removed: function () {
        this._websocketConnection.close(Soup.WebsocketCloseCode.NORMAL, "");
        this._httpSession.close();
    },

    initConnection: function() {
        this._httpSession = new Soup.Session();
        Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.ProxyResolverDefault());
    },

    onSettingsChanged: function() {
        global.log("onSettingsChanged called");
    },

    onCurrencyChanged: function() {
        this.updateExchangeRate();
    },

    initSettings: function(metadata, desklet_id) {
        this.settings = new Settings.DeskletSettings(this, metadata.uuid, desklet_id);
        this.settings.bind("currency", "cfgCurrency", this.onCurrencyChanged);
        this.cfgCurrency = this.cfgCurrency || DEFAULT_CURRENCY;
        this.cfgSource = DEFAULT_SOURCE;
        this.exchangeRate = DEFAULT_RATE;
        this._lastReceivedRates = [];
    },

    setupUI: function() {
        // main container for the desklet
        this.window = new St.Bin();
        this.text = new St.Label({
            style_class: 'exchange-rate'
        });
        this.text.set_text(this.exchangeRate);
        this.window.add_actor(this.text);
        this.setContent(this.window);
    },

    updateExchangeRate: function() {
        this.exchangeRate = this._lastReceivedRates[ZENRUS_WS_MAPPING[this.cfgCurrency]];
        this.text.set_text(this.cfgCurrency.toUpperCase() + " " + this.exchangeRate);
    },

    run: function() {
        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI(this.cfgSource)
        });
        this._httpSession.websocket_connect_async(message, null, null, null, Lang.bind(this, function(session, res) {
            this._websocketConnection = session.websocket_connect_finish(res);

            this._websocketConnection.connect("message", Lang.bind(this, function(connection, type, message) {
                let data = message.get_data();
                this._lastReceivedRates = data.toString().split(';');
                this.updateExchangeRate();
            }));
        }));
    }
}

function main(metadata, desklet_id) {
    return new HelloDesklet(metadata, desklet_id);
}
