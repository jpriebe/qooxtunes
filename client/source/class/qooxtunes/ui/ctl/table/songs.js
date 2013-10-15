qx.Class.define("qooxtunes.ui.ctl.table.songs",
{
    extend :  qooxtunes.ui.ctl.Table,

    construct : function (limited_columns)
    {
        if (typeof limited_columns !== "undefined")
        {
            this.__limited_columns = limited_columns;
        }

        this.build_table_model ();

        var custom =
        {
            tableColumnModel : function(obj) {
                return new qx.ui.table.columnmodel.Basic(obj);
            }
        };

        this.base (arguments, this.__tm, custom);

        this.init ();
    },

    members :
    {
        __limited_columns : false,

        __search_expression : '',
        __search_regex : '',

        search : function (search_expression, column)
        {
            this.__search_expression = search_expression.toLowerCase ();

            if (search_expression == '')
            {
                this.__search_expression = '';
                this.__search_regex = '';
                this.__tm.updateView(0); // needed?
                this.__tm.setView(0);
                return;
            }

            var terms = search_expression.split (/\s+/);
            this.__search_regex = new RegExp(terms.join ('|'));


            if (column == null)
            {
                // column 1 contains all our major search columns concatenated
                this.__search_column = 1;
            }

            if (column == 'title')
            {
                this.__search_column = 2;
            }
            if (column == 'artist')
            {
                this.__search_column = 3;
            }
            if (column == 'album')
            {
                this.__search_column = 4;
            }
            if (column == 'genre')
            {
                this.__search_column = 5;
            }
            if (column == 'comment')
            {
                this.__search_column = 11;
            }

            this.__tm.updateView(1);
            this.__tm.setView(1);
        },


        build_table_model : function ()
        {
            this.__tm = new smart.model.Default();

            if (this.__limited_columns)
            {
                this.__tm.setColumns([ "_SongID", "_SearchValue",
                    this.tr ("Track #"),
                    this.tr ("Name"),
                    this.tr ("Artist"),
                    this.tr ("Album")],
                    ['songid', 'search_value', 'track_num', 'title', 'artist', 'album']);
            }
            else
            {
                this.__tm.setColumns([ "_SongID", "_SearchValue",
                    this.tr ("Name"),
                    this.tr ("Artist"),
                    this.tr ("Album"),
                    this.tr ("Genre"),
                    this.tr ("Year"),
                    this.tr ("Track"),
                    this.tr ("Duration"),
                    this.tr ("Playcount"),
                    this.tr ("Rating"),
                    this.tr ("Comment")],
                    ['songid', 'search_value', 'title', 'artist', 'album', 'genre',
                        'year', 'track', 'duration', 'playcount', 'rating', 'comment']);
            }

            this.__tm.addIndex (0);

            this.__tm.newView (function (rowdata) {
                if (this.__search_regex == '')
                {
                    return true;
                }

                var data;
                if (rowdata[this.__search_column] instanceof Array)
                {
                    data = rowdata[this.__search_column].join (' ').toLowerCase ();
                }
                else
                {
                    data = rowdata[this.__search_column].toLowerCase();
                }

                if (data.match (this.__search_regex))
                {
                    return true;
                }
                return false;
            }, this);

        },

        load_all : function ()
        {
            var me = this;

            var rpc = qooxtunes.io.remote.xbmc.getInstance ();

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Loading XBMC library..."));
            rpc.callAsync("AudioLibrary.GetSongs", [
                ['title', 'artist', 'album', 'genre', 'year', 'track', 'duration', 'playcount', 'rating', 'comment'],
                { 'start' : 0 },
                { 'order': 'ascending', 'method': 'artist', 'ignorearticle': true }
            ],
                function (result, exc) {
                    var rowData = [];
                    for (var i = 0; i < result.songs.length; i++)
                    {
                        var song = result.songs[i];

                        var year = (song.year == 0) ? null : song.year;

                        var search_value = song.title + ' ' + song.artist[0] + ' ' + song.album + ' ' + song.genre + ' ' + song.comment;

                        rowData.push ([song.songid, search_value, song.title, song.artist[0], song.album, song.genre,
                            year, song.track, qooxtunes.util.time.duration_int_to_str(song.duration),
                            song.playcount, song.rating, song.comment]);
                    }
                    me.__tm.setData(rowData, false);

                    me.__tm.setView (0);
                    me.__tm.updateView (0);

                    me.__tm.sortByColumn (3, true);

                    qooxtunes.ui.dlg.wait_popup.hide ();
                }
            );
        },

        load_playlist : function (playlist)
        {
            var rpc_ext = qooxtunes.io.remote.xbmc_ext.getInstance ();

            var me = this;

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Loading playlist %1", playlist.name));
            rpc_ext.callAsync("get_playlist_tracks", ['music', playlist],
                function (result, exc) {
                    var rowData = [];
                    for (var i = 0; i < result.length; i++)
                    {
                        var song = result[i];

                        var search_value = song.title + ' ' + song.artist + ' ' + song.album;

                        rowData.push ([song.id, search_value, song.track_num, song.title, song.artist, song.album]);
                    }

                    me.__tm.setData ([], false);
                    me.__tm.setData(rowData, false);

                    me.__tm.setView (0);
                    me.__tm.updateView (0);
                    me.updateContent ();

                    me.__tm.sortByColumn (2, true);

                    qooxtunes.ui.dlg.wait_popup.hide ();
                }
            );
        },

        clear : function ()
        {
            this.__tm.setData ([]);
        },

        on_drag_start: function(e) {
            e.addAction("copy");
        },

        on_columnVisibilityMenuCreateEnd : function(e)
        {
            // remove hidden columns from the column visibility menu
            var edata = e.getData();
            var xary = edata.menu.getChildren();
            var rmary = [];
            for (var i = 0; i < xary.length; i++)
            {
                var mb = xary[i];

                // there are some non MenuButton items in the child list...
                if (!mb.getLabel)
                {
                    continue;
                }

                var lb = mb.getLabel();
                if ((lb.length == 0) || (lb.substr (0, 1) == '_'))
                {
                    rmary.push (mb);
                }
            }

            for (var i = 0; i < rmary.length; i++)
            {
                edata.menu.remove (rmary[i]);
            }
        },



        update_row : function (data, only_modified)
        {
            if (typeof only_modified === 'undefined')
            {
                only_modified = false;
            }

            var row = [];

            // find row by song ID
            var row_idx = this.__tm.locate (0, data[0]);

            row.push (data[0]); // id should never change
            row.push (''); // placeholder for the sort data

            if (this.__limited_columns)
            {
                row.push (this.__tm.getValue (2, row_idx)); // track number
            }

            row.push (data[1]); // title
            if (data[2] != null)
            {
                row.push (data[2][0]); // artist
            }
            else
            {
                row.push (null);
            }

            row.push (data[7]); // album

            var search_value = '';
            if (this.__limited_columns)
            {
                search_value = row[3] + ' ' + row[4] + ' ' + row[5];
            }
            else
            {
                if (data[4] != null)
                {
                    row.push (data[4][0]); // genre
                }
                else
                {
                    row.push (null);
                }

                // year
                if (data[5] !== null)
                {
                    row.push (parseInt (data[5]));
                }
                else
                {
                    row.push (null);
                }

                // track
                if (data[8] !== null)
                {
                    row.push (parseInt (data[8]));
                }
                else
                {
                    row.push (null);
                }

                row.push (this.__tm.getValue (8, row_idx)); // duration (we don't edit this, so get from the table)
                row.push (this.__tm.getValue (9, row_idx)); // playcount (we don't edit this, so get from the table)

                // rating
                if (data[6] !== null)
                {
                    row.push (parseInt (data[6]));
                }
                else
                {
                    row.push (null);
                }

                row.push (data[11]); // comment

                search_value = row[2] + ' ' + row[3] + ' ' + row[4] + ' ' + row[5] + ' ' + row[11];
            }

            row[1] = search_value;

            var id = row[0];
            for (var i = 0; i < this.__tm.getColumnCount (); i++)
            {
                if (!only_modified || row[i] !== null)
                {
                    // note that we have to locate our row each time we set a value, because setting the
                    // value could move the row due to sorting...
                    row_idx = this.__tm.locate (0, id);
                    //console.log ("setting row " + row_idx + ", column " + i + " to '" + row[i] + "'");
                    this.__tm.setValue (i, row_idx, row[i]);
                }
            }

        },

        on_multi_editor_ok : function (songids, data)
        {
            for (var i = 0; i < songids.length; i++)
            {
                data[0] = songids[i];
                this.update_row (data, true);
            }
        },


        on_editor_ok : function (data)
        {
            if (data != null)
            {
                this.update_row (data);
            }
        },

        on_editor_next : function (data)
        {
            if (data != null)
            {
                this.update_row (data);
            }

            this.set_selected_index (this.get_first_selected_index () + 1);

            var nav_result = {};
            var sel_items = this.get_selected_items ();
            nav_result.song_id = sel_items[0][0];
            nav_result.song_idx = this.get_first_selected_index ();
            nav_result.num_songs = this.__tm.getRowCount ();

            return nav_result;
        },

        on_editor_prev : function (data)
        {
            if (data != null)
            {
                this.update_row (data);
            }

            this.set_selected_index (this.get_first_selected_index () - 1);

            var nav_result = {};
            var sel_items = this.get_selected_items ();
            nav_result.song_id = sel_items[0][0];
            nav_result.song_idx = this.get_first_selected_index ();
            nav_result.num_songs = this.__tm.getRowCount ();

            return nav_result;
        },

        on_cmd_edit : function (e)
        {
            var sel_items = this.get_selected_items ();

            if (sel_items.length < 1)
            {
                return;
            }

            var song_ids = [];
            for (var i = 0; i < sel_items.length; i++)
            {
                song_ids.push (sel_items[i][0]);
            }

            if (song_ids.length == 0)
            {
                return;
            }

            var sel_idx = 0;
            if (song_ids.length == 1)
            {
                sel_idx = this.get_first_selected_index ();

                var num_songs = this.__tm.getRowCount ();

                var me = this;
                qooxtunes.ui.dlg.song_editor.go (song_ids[0], sel_idx, num_songs,
                    function (data) {
                        return me.on_editor_ok (data);
                    },
                    function (data) {
                        return me.on_editor_next (data);
                    },
                    function (data) {
                        return me.on_editor_prev (data);
                    });
            }
            else
            {
                var me = this;
                qooxtunes.ui.dlg.multi_song_editor.go (song_ids,
                    function (song_ids, data) {
                        return me.on_multi_editor_ok (song_ids, data);
                    }
                );
            }

        },

        on_cmd_download : function (e)
        {
            var sel_items = this.get_selected_items ();

            if (sel_items.length < 1)
            {
                return;
            }

            var ids = [];
            for (var i = 0; i < sel_items.length; i++)
            {
                ids.push (sel_items[i][0]);
            }

            var rpc = qooxtunes.io.remote.xbmc_ext.getInstance ();

            rpc.callAsync("get_download_songs_url", [
                ids
            ],
                function (result, exc) {
                    var host = rpc.get_hostname ();
                    var port = rpc.get_port ();
                    var path = result;

                    var url = '//' + host + ":" + port + path;

                    window.navigate_away = true;
                    window.location = url;
                }
            );

        },

        on_changeSelection : function (e) {
            var num_selected = this.getSelectionModel().getSelectedCount ();

            if (num_selected == 0)
            {
                this.__btn_edit.setEnabled (false);
                this.__btn_download.setEnabled (false);
                this.__btn_download.setLabel (this.tr ('Download song'));
            }
            else if (num_selected == 1)
            {
                this.__btn_edit.setEnabled (true);
                this.__btn_download.setEnabled (true);
                this.__btn_download.setLabel (this.tr ('Download song'));
            }
            else
            {
                this.__btn_edit.setEnabled (true);
                this.__btn_download.setEnabled (true);
                this.__btn_download.setLabel (this.tr ('Download songs'));
            }
        },

        get_cookie_name : function ()
        {
            var str_cookie_name = (this.__limited_columns)
                ? 'songs_table_column_state_limited'
                : 'songs_table_column_state';

            return str_cookie_name;
        },

        __loading_column_state : false,

        load_column_state : function ()
        {
            this.__loading_column_state = true;

            var str_cookie_name = this.get_cookie_name ();

            var str_state = qx.module.Cookie.get (str_cookie_name);

            if (str_state === null)
            {
                this.__loading_column_state = false;
                return;
            }

            var state = JSON.parse (str_state);

            var tcm = this.getTableColumnModel ();
            var num_cols = tcm.getOverallColumnCount();

            // if the application code has changed and the number of columns is different since
            // the time we saved the cookie, just ignore the cookie
            if (state.col_order.length != num_cols)
            {
                return;
            }

            tcm.setColumnsOrder(state.col_order);

            for (var i = 0; i < num_cols; i++)
            {
                tcm.setColumnVisible(i, (state.col_visible[i] == 1));
                tcm.setColumnWidth(i, state.col_widths[i]);
            }

            this.__loading_column_state = false;
        },

        save_column_state : function ()
        {
            if (this.__loading_column_state)
            {
                return;
            }

            var tcm = this.getTableColumnModel ();

            var num_cols = tcm.getOverallColumnCount();

            var hidden_cols = [];

            var state = {};
            state.col_widths = [];
            state.col_visible = [];
            for (var i = 0; i < num_cols; i++)
            {
                state.col_visible.push (tcm.isColumnVisible (i) ? 1 : 0);
                state.col_widths.push (tcm.getColumnWidth (i));

                if (!tcm.isColumnVisible (i))
                {
                    hidden_cols.push (i);
                }

            }
            var vis_cols = tcm.getVisibleColumns ();

            state.col_order = [];

            for (var i = 0; i < vis_cols.length; i++)
            {
                state.col_order.push (vis_cols[i]);
            }

            for (var i = 0; i < hidden_cols.length; i++)
            {
                state.col_order.push (hidden_cols[i]);
            }

            var str_state = JSON.stringify (state);

            var str_cookie_name = this.get_cookie_name ();

            qx.module.Cookie.set (str_cookie_name, str_state, 1000);
        },


        init : function ()
        {
            var sm = this.getSelectionModel();

            sm.setSelectionMode(qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION);

            sm.addListener ('changeSelection', this.on_changeSelection, this);

            this.__tm.indexedSelection (0, sm);

            var tcm = this.getTableColumnModel();
            tcm.setColumnVisible (0, false);
            tcm.setColumnVisible (1, false);

            if (!this.__limited_columns)
            {
                var cr = new qx.ui.table.cellrenderer.Number();
                var nf = new qx.util.format.NumberFormat ();
                nf.setGroupingUsed (false);
                cr.setNumberFormat (nf);
                tcm.setDataCellRenderer(6, cr);
            }

            this.addListener("columnVisibilityMenuCreateEnd", this.on_columnVisibilityMenuCreateEnd, this);
            this.addListener("dragstart", this.on_drag_start, this);

            this.__cm_songs = new qx.ui.menu.Menu ();

            this.__cmd_edit = new qx.ui.core.Command("Ctrl+I");
            this.__cmd_edit.addListener("execute", this.on_cmd_edit, this);

            this.__btn_edit = new qx.ui.menu.Button(this.tr ("Edit Info"), "", this.__cmd_edit);
            this.__cm_songs.add (this.__btn_edit);

            this.__cmd_download = new qx.ui.core.Command("Ctrl+F");
            this.__cmd_download.addListener("execute", this.on_cmd_download, this);

            this.__btn_download = new qx.ui.menu.Button(this.tr ("Download File"), "", this.__cmd_download);
            this.__cm_songs.add (this.__btn_download);

            this.setContextMenu (this.__cm_songs);

            this.addListener ('appear', function (e) {
                this.load_column_state ();

                tcm.addListener ('widthChanged', function (e) {
                    this.save_column_state ();
                }, this);
                tcm.addListener ('orderChanged', function (e) {
                    this.save_column_state ();
                }, this);
                tcm.addListener ('visibilityChanged', function (e) {
                    this.save_column_state ();
                }, this);
            }, this);

        }

    }
});