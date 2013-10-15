qx.Class.define("qooxtunes.ui.dlg.yes_no",
{
    extend :  qooxtunes.ui.dlg.standard,

    type : 'singleton',

    statics : {

        go : function (msg, yes_callback, no_callback, cancel_callback, w, h)
        {
            if (w == null)
            {
                w = 320;
            }
            if (h == null)
            {
                h = 150;
            }

            var dlg = qooxtunes.ui.dlg.yes_no.getInstance ();

            dlg.set({width: w, height: h});

            dlg.yes_callback = yes_callback;
            dlg.no_callback = no_callback;

            if (cancel_callback)
            {
                dlg.cancel_callback = cancel_callback;
                dlg.btn_cancel.setVisibility ('visible');
            }
            else
            {
                dlg.cancel_callback = null;
                dlg.btn_cancel.setVisibility ('excluded');
            }

            //dlg.lb1.setHtml ('<span style=\'font-size: 9pt;font-family: Tahoma, "Lucida Sans Unicode"\'>' + msg + '</span>');
            dlg.lb1.setHtml (msg);
        
            dlg.open();
        }
    },

    construct : function (vCaption, vIcon, vWindowManager)
    {
        this.base(arguments, 'qooxtunes');

        this.set({width : 320, height : 160, zIndex: 9999999});
        this.addListener("keypress", this.on_window_keypress, this);

        this.lb1 = new qx.ui.embed.Html('');
        this.add (this.lb1, {left: 8, top: 8, right: 8, bottom: 41});

        var bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));
        bl1.set ({height : 32});


        this.btn_yes = new qx.ui.form.Button(this.tr ("Yes"));
        this.btn_yes.set ({ height : 32, width : 80 });
        this.btn_yes.addListener("execute", this.on_btn_yes_execute, this);

        bl1.add(this.btn_yes);

        this.btn_no = new qx.ui.form.Button(this.tr ("No"));
        this.btn_no.set ({ height : 32, width : 80 });
        this.btn_no.addListener("execute", this.on_btn_no_execute, this);

        bl1.add(this.btn_no);

        this.btn_cancel = new qx.ui.form.Button(this.tr ("Cancel"));
        this.btn_cancel.set ({ height : 32, width : 80 });
        this.btn_cancel.addListener("execute", this.on_btn_cancel_execute, this);

        bl1.add(this.btn_cancel);

        this.add (bl1, {left: 8, right: 8, bottom: 8});
    },

    members : {


// Event handlers {{{
        on_btn_yes_execute : function ()
        {
            this.close();

            if (this.yes_callback != null)
            {
                this.yes_callback();
            }
        },

        on_btn_no_execute : function ()
        {
            this.close();

            if (this.no_callback != null)
            {
                this.no_callback();
            }
        },

        on_btn_cancel_execute : function ()
        {
            this.close();

            if (this.cancel_callback != null)
            {
                this.cancel_callback();
            }
        },

        on_window_keypress : function(e)
        {
            var ki = e.getKeyIdentifier().toLowerCase();
            if ((ki == 'enter') || (ki == 'y'))
            {
                this.on_btn_yes_execute();
            }

            if (this.cancel_callback !== null)
            {
                if (ki == 'n')
                {
                    this.on_btn_no_execute();
                }

                if (ki == 'escape')
                {
                    this.on_btn_cancel_execute();
                }
            }
            else
            {
                if ((ki == 'escape') || (ki == 'n'))
                {
                    this.on_btn_no_execute();
                }
            }
        }
/// }}}
    }
});


