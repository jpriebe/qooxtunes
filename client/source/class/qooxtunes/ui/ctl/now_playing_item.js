qx.Class.define("qooxtunes.ui.ctl.now_playing_item",
{
    extend :  qx.ui.container.Composite,

    construct : function (playlist_id, idx, id, title, artist)
    {
        this.base (arguments);

        this.__playlist_id = playlist_id;
        this.__idx = idx;
        this.__id = id;
        this.__title = title;
        this.__artist = artist;

        this.init ();
    },

    members : {
        __playlist_id : -1,
        __idx : -1,
        __id : -1,
        __title : '',
        __artist : '',

        on_btn_delete_execute : function (e)
        {
            var rpc = qooxtunes.io.remote.xbmc.getInstance ();

            var me = this;
            rpc.callAsync("Playlist.Remove", [this.__playlist_id, this.__idx],
                function (result) {
                    // would be nice to bubble this up to the playback control to force an update
                    // to the entire now_playing widget, but that would be slow anyway...
                    me.getLayoutParent().remove (me);
                }
            );
        },

        init : function ()
        {
            this.setLayout(new qx.ui.layout.Canvas ());
            this.setHeight (46);

            this.__btn_delete = new qx.ui.form.Button(null, "qooxtunes/icon/16/remove.png");
            this.__btn_delete.setDecorator (null);
            this.__btn_delete.setVisibility ('hidden');
            this.__btn_delete.addListener ('execute', this.on_btn_delete_execute, this);
            this.addListener ('mouseover', function (e) { this.__btn_delete.show (); }, this);
            this.addListener ('mouseout', function (e) { this.__btn_delete.hide (); }, this);
            this.add (this.__btn_delete, {left: 0, top: 12});

            this.__l_title = qooxtunes.util.ui.build_label (this.__title, 'small', true);
            this.add (this.__l_title,  {left: 28, top: 8});

            this.__l_artist = qooxtunes.util.ui.build_label (this.__artist, 'small', false);
            this.add (this.__l_artist, {left: 28, top: 22});

        }
    }
});