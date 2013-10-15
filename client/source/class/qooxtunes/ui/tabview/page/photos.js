qx.Class.define("qooxtunes.ui.tabview.page.photos",
{
    extend :  qx.ui.tabview.Page,

    construct : function ()
    {
        this.base (arguments, this.tr ("Photos"), "icon/32/mimetypes/media-image.png");
        this.init ();
    },

    members : {
        init : function ()
        {
        }
    }

});

