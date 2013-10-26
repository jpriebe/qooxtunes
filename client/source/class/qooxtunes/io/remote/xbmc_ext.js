qx.Class.define("qooxtunes.io.remote.xbmc_ext",
    {
        extend : qx.core.Object,
        include : [qx.locale.MTranslation],
        type : 'singleton',

        construct : function ()
        {
            this._rpc = new qooxtunes.io.remote.Rpc();
            this._rpc.setProtocol ("2.0");

            this._hostname = document.location.hostname;
            this.find_port ();

            // 2-minute timeout -- exporting can be a bit slow somtimes
            this._rpc.setTimeout (120000);
        },

        members :
        {
            _port : 9100,
            _hostname : 'localhost',

            get_port : function ()
            {
                return this._port;
            },

            get_hostname : function ()
            {
                return this._hostname;
            },

            // this is a little bit of a hack -- but we're going to "port scan from 9100 to 9199 looking
            // for our "extended web service" port.  I can't think of a better way to pass this value
            // down
            find_port : function () {
                for (var i = 9100; i < 9200; i++)
                {
                    try {
                        this._rpc.setUrl ("//" + this._hostname + ":" + i + "/");
                        var result = this._rpc.callSync ("hello");
                        if (result == null)
                        {
                            continue;
                        }

                        console.log (this.tr ("[xbmc_ext.find_port] port = %1", i));
                        this._port = i;
                        break;
                    }
                    catch (e) {
                        continue;
                    }
                }
            },

            // wrapper for qx.io.remote.Rpc.callAsync() which puts the arguments into a
            // sane order
            callAsync : function (method, params, handler, self) {

                var args = [];

                var me = this;

                var handler_wrapper = function (result, exc) {
                    if (exc != null) {
                        qooxtunes.ui.dlg.msgbox.go (me.tr ("Error"),
                            me.tr ("Exception during async call: %1", exc));
                        return;
                    }

                    if (typeof self === "undefined")
                    {
                        handler (result, exc);
                    }
                    else
                    {
                        handler.apply (self, arguments);
                    }
                };

                args.push (handler_wrapper);
                args.push (method);
                if (params.length > 0)
                {
                    for (var i = 0; i < params.length; i++)
                    {
                        args.push (params[i]);
                    }
                }

                this._rpc.callAsync.apply (this._rpc, args);
            }
        }

    });