qx.Class.define("qooxtunes.ui.dlg.wait_popup",
    {
        extend :  qx.ui.popup.Popup,

        type : 'singleton',

        statics : {

            show : function (message)
            {
                var dlg = qooxtunes.ui.dlg.wait_popup.getInstance ();
                dlg.__a_message.setLabel (message);
                dlg.show ();
            },

            hide : function ()
            {
                var dlg = qooxtunes.ui.dlg.wait_popup.getInstance ();
                dlg.hide ();
            }
        },

        construct : function ()
        {
            this.base(arguments);

            this.set ({height: 64, width: 200,
                layout: new qx.ui.layout.Canvas(),
                opacity: 0.8
            });

            this.__a_message = new qx.ui.basic.Atom (this.tr ('Please wait...'), 'qooxtunes/loader.gif');
            this.__a_message.set ({height: 64, width: 200, backgroundColor: '#000', textColor: '#fff', center: true});

            this.add (this.__a_message, {top: 0, left: 0});

            this.addListener ('appear', this.center, this);

        },


        members : {

            center : function()
            {
                var parent = this.getLayoutParent();
                if (parent)
                {
                    var bounds = parent.getBounds();
                    if (bounds)
                    {
                        var hint = this.getSizeHint();

                        var left = Math.round((bounds.width - hint.width) / 2);
                        var top = Math.round((bounds.height - hint.height) / 2);

                        if (top < 0) {
                            top = 0;
                        }

                        this.moveTo(left, top);

                        return;
                    }
                }
            }
        }

    });
