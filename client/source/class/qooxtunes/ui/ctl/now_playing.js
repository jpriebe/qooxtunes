qx.Class.define("qooxtunes.ui.ctl.now_playing",
{
    extend :  qx.ui.popup.Popup,

    construct : function ()
    {
        this.base (arguments);

        this.init ();
    },

    members : {
        __tracks : [],
        __items : [],
        __rpc : null,

        get_tracks : function (current_track_id, playlist_id)
        {
            var me = this;

            this.__rpc.callAsync("Playlist.GetItems", [playlist_id,
                [ 'title', 'artist' ]
            ],
                function (result) {
                    var found_track = false;
                    for (var i = 0; i < result.items.length; i++)
                    {
                        var itm = result.items[i];

                        if (itm.id == current_track_id)
                        {
                            found_track = true;
                            continue;
                        }

                        if (!found_track)
                        {
                            continue;
                        }

                        var np_itm = new qooxtunes.ui.ctl.now_playing_item (playlist_id, i, itm.id, itm.title, itm.artist[0]);
                        me.__item_pane.add (np_itm);
                    }
                }
            );
        },

        update : function (current_track_id)
        {
            this.__item_pane.removeAll ();

            var me = this;
            this.__rpc.callAsync("Playlist.GetPlaylists", [],
                function (result) {
                    playlist_id = -1;
                    for (var i = 0; i < result.length; i++)
                    {
                        if (result[i].type == 'audio')
                        {
                            playlist_id = result[i].playlistid;
                            me.get_tracks (current_track_id, playlist_id);
                            break;
                        }
                    }

                }
            );
        },

        init : function ()
        {
            this.setLayout (new qx.ui.layout.Canvas ());

            this.__rpc = qooxtunes.io.remote.xbmc.getInstance ();

            this.setWidth (320);
            this.setHeight (500);

            this.__item_pane = new qx.ui.container.Composite (new qx.ui.layout.VBox (0, null, new qx.ui.decoration.Single (1, 'solid', '#999999')));
            this.__scroll_pane = new qx.ui.container.Scroll (this.__item_pane);

            this.add (this.__scroll_pane, {edge: 0});
        }

    }
});
