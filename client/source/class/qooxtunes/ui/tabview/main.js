qx.Class.define("qooxtunes.ui.tabview.main",
{
    extend :  qx.ui.tabview.TabView,

    construct : function ()
    {
        this.base (arguments);
        this.init ();
    },

    members : {
        init : function ()
        {
            var p;

            p = new qooxtunes.ui.tabview.page.music ();
            this.add (p);
            /*
            p = new qooxtunes.ui.tabview.page.video ();
            this.add (p);
            p = new qooxtunes.ui.tabview.page.photos ();
            this.add (p);
            */
        }
    }

});

