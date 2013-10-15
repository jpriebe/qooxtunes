qx.Class.define("qooxtunes.ui.tabview.page.video",
{
    extend :  qx.ui.tabview.Page,

    construct : function ()
    {
        this.base (arguments, this.tr ("Video"), "icon/32/mimetypes/media-video.png");
        this.init ();
    },

    members : {
        init : function ()
        {
        }
    }

});

