qx.Class.define("qooxtunes.io.remote.xbmc",
{
    extend : qx.core.Object,
    include : [qx.locale.MTranslation],
    type : 'singleton',


    construct : function ()
    {
        this._rpc = new qx.io.remote.Rpc();
        this._rpc.setUrl ("/jsonrpc");
        this._rpc.setProtocol ("2.0");
        
        // 2-minute timeout -- a 10,000 song library might take 5-10 seconds to
        // pull on a slowish server
        this._rpc.setTimeout (120000);
    },

    members :
    {
        // wrapper for qx.io.remote.Rpc.callAsync() which puts the arguments into a
        // sane order
        callAsync : function (method, params, handler, self) {

            var args = [];

            var me = this;

            var handler_wrapper = function (result, exc) {
                if (exc != null) {
                    qooxtunes.ui.dlg.msgbox.go (me.tr ("Error"),
                        me.tr ("Exception during async call: %1",  exc))
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
            for (var i = 0; i < params.length; i++)
            {
                args.push (params[i]);
            }

            this._rpc.callAsync.apply (this._rpc, args);
        }
    }

});
