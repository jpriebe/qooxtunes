qx.Class.define("qooxtunes.ui.ctl.list.songs",
{
    extend :  qooxtunes.ui.ctl.List,

    construct : function (drag_source)
    {
        this.base (arguments);

        this.__t_drag_source = drag_source;
        this.init ();
    },

    members :
    {
        __t_drag_source : null,

        __drag_indicator : null,

        __current_list_item : null,

        __playlist : null,

        get_playlist : function ()
        {
            return this.__playlist;
        },

        load_playlist : function (playlist)
        {
            this.__playlist = playlist;

            var rpc_ext = qooxtunes.io.remote.xbmc_ext.getInstance ();

            var me = this;

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Loading playlist %1...",  name));
            rpc_ext.callAsync("get_playlist_tracks", ['music', this.__playlist],
                function (result) {
                    me.removeAll ();
                    for (var i = 0; i < result.length; i++)
                    {
                        var song = result[i];
                        var caption = song.title  + " - " + song.artist;

                        me.add_item (caption, song.id);
                    }
                    qooxtunes.ui.dlg.wait_popup.hide ();
                }
            );
        },

        add_selected_to_list : function ()
        {
            var sel_items = this.__t_drag_source.get_selected_items ();

            for (var i = 0; i < sel_items.length; i++)
            {
                var song_info = sel_items[i];
                var id = song_info[0];
                var title = song_info[2];
                var artist = song_info[3];

                var caption = title  + " - " + artist;

                this.add_item (caption, id);
            }
        },

        reorder_list : function(list_item)
        {
            // Only continue if the target is a list item.
            if (list_item.classname != "qx.ui.form.ListItem") {
                return ;
            }

            var sel = this.getSortedSelection();

            for (var i=0, l=sel.length; i<l; i++)
            {
                this.addBefore(sel[i], list_item);

                // recover selection as it get lost during child move
                this.addToSelection(sel[i]);
            }
        },

        init : function ()
        {
            this.setSelectionMode ("multi");

            // Create drag indicator
            this.__drag_indicator = new qx.ui.core.Widget();
            this.__drag_indicator.setDecorator(new qx.ui.decoration.Decorator().set({
                widthTop: 1,
                styleTop: "solid",
                colorTop: "black"
            }));
            this.__drag_indicator.setHeight(0);
            this.__drag_indicator.setOpacity(0.5);
            this.__drag_indicator.setZIndex(100);
            this.__drag_indicator.setLayoutProperties({left: -1000, top: -1000});
            this.__drag_indicator.setDroppable(true);
            qx.core.Init.getApplication().getRoot().add(this.__drag_indicator);

            // Just add a move action
            this.addListener("dragstart", function(e) {
                e.addAction("move");
            });

            this.addListener("dragend", function(e)
            {
                // Move indicator away
                this.__drag_indicator.setDomPosition(-1000, -1000);
            });

            this.addListener("drag", function(e)
            {
                var orig = e.getOriginalTarget();

                // store the current listitem - if the user drops on the indicator
                // we can use this item instead of calculating the position of the
                // indicator
                if (orig instanceof qx.ui.form.ListItem) {
                    this.__current_list_item = orig;
                }

                if (!qx.ui.core.Widget.contains(this, orig) && orig != this.__drag_indicator) {
                    return;
                }

                var origCoords = orig.getContentLocation();

                this.__drag_indicator.setWidth(orig.getBounds().width);
                this.__drag_indicator.setDomPosition(origCoords.left, origCoords.top);
            });

            this.addListener("dragover", function(e)
            {
                // maybe do this -- if the user drags into the list from the table,
                // start a new drag event within the list so that we can get the
                // drag indicators...

                var t = e.getRelatedTarget();
                if ((t != null) && (t != this.__t_drag_source)) {
                    e.preventDefault();
                }
            });

            this.addListener("drop", function(e) {
                if (e.getRelatedTarget () == this.__t_drag_source) {
                    this.add_selected_to_list ();
                    return;
                }
                this.reorder_list(e.getOriginalTarget());
            }, this);

            this.__drag_indicator.addListener("drop", function(e) {
                if (e.getRelatedTarget () == this.__t_drag_source) {
                    this.add_selected_to_list ();
                    return;
                }
                this.reorder_list(this.__current_list_item);
            }, this);
        }


    }
});