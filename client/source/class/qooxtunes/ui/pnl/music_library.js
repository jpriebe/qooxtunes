qx.Class.define("qooxtunes.ui.pnl.music_library",
    {
        extend :  qx.ui.container.Composite,

        construct : function ()
        {
            this.base (arguments);
            this.init ();
        },

        events :
        {
            doneEditingPlaylist : 'qx.event.type.Data'
        },

        members : {
            __t_library : null,

            get_table : function ()
            {
                return this.__t_library;
            },

            load_playlist : function (playlist)
            {
                this.__l_playlist.load_playlist (playlist);
            },


            edit_playlist : function (playlist)
            {
                this.__t_library.setDraggable(true);
                this.__lb_playlist.setValue (playlist.name);
                this.load_playlist (playlist);
                this.__spc_playlist.show ();
            },

            on_b_done_execute : function ()
            {
                var rpc = qooxtunes.io.remote.xbmc_ext.getInstance ();

                var songids = [];
                var items = this.__l_playlist.getChildren ();
                for (var i = 0; i < items.length; i++)
                {
                    var item = items[i];
                    var id = item.getUserData ('value');
                    songids.push (id);
                }

                var me = this;
                rpc.callAsync ('save_playlist_tracks',
                    [ 'music', this.__l_playlist.get_playlist (), songids ],
                    function (result, exc) {
                        if (!result)
                        {
                            qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                                this.tr ("Could not save playlist."))
                                return;
                        }

                        me.__t_library.setDraggable(false);
                        me.__spc_playlist.exclude ();

                        me.fireDataEvent ('doneEditingPlaylist', me.__l_playlist.get_playlist ());
                    });
            },

            on_l_playlist_keypress : function (e)
            {
                var ki = e.getKeyIdentifier().toLowerCase();
                if ((ki == 'delete') || (ki == 'backspace'))
                {
                    this.__l_playlist.delete_selected_items ();
                    e.preventDefault ();
                }

            },

            clear_table_selection : function ()
            {
                this.__t_library.resetSelection ();
            },

            init : function ()
            {
                this.setLayout(new qx.ui.layout.Canvas());

                var pane = new qx.ui.splitpane.Pane("horizontal");

                this.__spc_library = new qx.ui.container.Composite(new qx.ui.layout.Canvas ()).set({
                    decorator : "main"
                });

                this.__t_library = new qooxtunes.ui.ctl.table.songs ();
                this.__spc_library.add (this.__t_library, { edge: 0 });

                this.__spc_playlist = new qx.ui.container.Composite(new qx.ui.layout.VBox()).set({
                    width : 300,
                    maxWidth: 500,
                    decorator : "main"
                });

                this.__tb_playlist = new qx.ui.toolbar.ToolBar();
                this.__tb_playlist.setSpacing (4);

                this.__lb_playlist = new qx.ui.basic.Label ('');
                this.__lb_playlist.setFont (new qx.bom.Font(24,['Tahoma', 'Lucida Sans Unicode', 'sans-serif']));
                this.__lb_playlist.setAlignY("middle");
                this.__lb_playlist.setMarginLeft (4);
                this.__tb_playlist.add (this.__lb_playlist, { flex: 1 });

                this.__tb_playlist.addSpacer();

                var p1 = new qx.ui.toolbar.Part();
                this.__b_done = new qx.ui.toolbar.Button(this.tr ("Done"));
                this.__b_done.addListener ('execute', this.on_b_done_execute, this);

                p1.add (this.__b_done);
                this.__tb_playlist.add (p1);
                this.__spc_playlist.add(this.__tb_playlist);

                this.__l_playlist = new qooxtunes.ui.ctl.list.songs (this.__t_library);
                this.__l_playlist.setDraggable(true);
                this.__l_playlist.setDroppable(true);
                this.__l_playlist.addListener ('keypress', this.on_l_playlist_keypress, this);
                this.__spc_playlist.add (this.__l_playlist, { flex: 1 });

                pane.add (this.__spc_library, 1);
                pane.add (this.__spc_playlist, 0);

                this.__spc_playlist.exclude ();

                this.add (pane, { edge: 8 });

                this.__t_library.load_all ();
            }
        }

    });

