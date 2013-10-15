qx.Class.define("qooxtunes.ui.dlg.standard",
{
    extend :  qx.ui.window.Window,

    construct : function (caption, icon, center)
    {
        this.base (arguments, caption, icon);

        this.set ({
            modal: true,
            showClose: false,
            showMaximize: false,
            showMinimize: false,
            resizable: false,
            contentPadding: 0,
            layout: new qx.ui.layout.Canvas()
        });

        if (center || (center == null))
        {
            this.addListener ('appear', this.center, this);
        }
    }
});

