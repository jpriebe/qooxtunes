qx.Class.define("qooxtunes.ui.dlg.msgbox",
{
    extend :  qooxtunes.ui.dlg.standard,

    type : 'singleton',

    statics : {
        
        go : function (caption, html, w, h)
        {
            if('undefined' == typeof w) {w = 400;}
            if('undefined' == typeof h) {h = 200;}

            var dlg = qooxtunes.ui.dlg.msgbox.getInstance ();

            dlg.set ({width: w, height: h, 'caption': caption});

            dlg.h_msg.setHtml (html);

            dlg.open();
        }
    },

    construct : function (vCaption, vIcon, vWindowManager)
    {
        this.base (arguments, "icon/22/status/dialog_information.png");
        this.init ();
    },

    members : {

        init : function ()
        {
            var xfont = new qx.bom.Font (11, ['Tahoma', 'Lucida Sans Unicode', 'sans-serif']);

            this.h_msg = new qx.ui.embed.Html('');

            this.h_msg.setFont (xfont);
            this.add(this.h_msg, {left: 10, top: 10, right: 10, bottom: 43});

            var btn_ok = new qx.ui.form.Button("OK");
            var me = this;
            btn_ok.addListener("execute", function(e) { me.close(); });
            this.add(btn_ok, {right: 10, bottom: 10});


            this.addListener ("keypress", this.on_keypress, this);
        },

// event handlers {{{
        on_keypress : function (e)
        {
            if (e.getKeyIdentifier().toLowerCase() == 'enter')
            {
                // enter
                this.close();
            }
            if (e.getKeyIdentifier().toLowerCase() == 'escape')
            {
                // escape
                this.close();
            }
        }
// }}}
    }
});


