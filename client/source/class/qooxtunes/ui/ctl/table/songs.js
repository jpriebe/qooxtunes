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

    events :
    {
        'searchChanged' : "qx.event.type.Data"
    },

    members :
    {
        __rpc : null,
        __rpc_ext : null,

        __limited_columns : false,

        __search_expression : '',
        __search_regex : '',
        __search_case_sensitive : false,

        search : function (search_expression, column, regex)
        {
            if (typeof regex === 'undefined')
            {
                regex = false;
            }

            if (regex)
            {
                this.__search_case_sensitive = true;
                this.__search_regex = search_expression;
            }
            else
            {
                this.__search_case_sensitive = false;
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
            }


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

            var col_name, col_artist, col_album, col_track;
            if (this.__limited_columns)
            {
                this.__tm.setColumns([ "_SongID", "_SearchValue",
                    this.tr ("Track #"),
                    this.tr ("Name"),
                    this.tr ("Artist"),
                    this.tr ("Album")],
                    ['songid', 'search_value', 'track_num', 'title', 'artist', 'album']);
                col_name = 3;
                col_artist = 4;
                col_album = 5;
                col_track = 2;
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

                col_name = 2;
                col_artist = 3;
                col_album = 4;
                col_track = 7;
            }

            // sort song titles, ignoring leading articles
            this.__tm.setSortMethods(col_name, {
                ascending  : function(row1, row2) {
                    var v1 = row1[col_name].replace (/^(a|an|the)\s+/i, '');
                    var v2 = row2[col_name].replace (/^(a|an|the)\s+/i, '');
                    return (v1 < v2) ? -1 : ((v1 > v2) ? 1 : 0);
                },
                descending  : function(row1, row2) {
                    var v2 = row1[col_name].replace (/^(a|an|the)\s+/i, '');
                    var v1 = row2[col_name].replace (/^(a|an|the)\s+/i, '');
                    return (v1 < v2) ? -1 : ((v1 > v2) ? 1 : 0);
                }
            });

            // sort artists with a subsort of album and track number (with songid as fallback)
            this.__tm.setSortMethods(col_artist, {
                ascending  : function(row1, row2) {
                    var v1 = row1[col_artist].replace (/^(a|an|the)\s+/i, '');
                    var v2 = row2[col_artist].replace (/^(a|an|the)\s+/i, '');
                    if (v1 == v2)
                    {
                        v1 = row1[col_album].replace (/^(a|an|the)\s+/i, '');
                        v2 = row2[col_album].replace (/^(a|an|the)\s+/i, '');
                        if (v1 == v2)
                        {
                            v1 = parseInt (row1[col_track]);
                            v2 = parseInt (row2[col_track]);
                            if (v1 == v2)
                            {
                                v1 = parseInt (row1[0]);
                                v2 = parseInt (row2[0]);
                            }
                        }
                    }
                    return (v1 < v2) ? -1 : ((v1 > v2) ? 1 : 0);
                },
                descending  : function(row1, row2) {
                    var v2 = row1[col_artist].replace (/^(a|an|the)\s+/i, '');
                    var v1 = row2[col_artist].replace (/^(a|an|the)\s+/i, '');
                    if (v1 == v2)
                    {
                        v2 = row1[col_album].replace (/^(a|an|the)\s+/i, '');
                        v1 = row2[col_album].replace (/^(a|an|the)\s+/i, '');
                        if (v1 == v2)
                        {
                            v2 = parseInt (row1[col_track]);
                            v1 = parseInt (row2[col_track]);
                            if (v1 == v2)
                            {
                                v2 = parseInt (row1[0]);
                                v1 = parseInt (row2[0]);
                            }
                        }
                    }
                    return (v1 < v2) ? -1 : ((v1 > v2) ? 1 : 0);
                }
            });

            // sort albums with a subsort of track number (with songid as fallback)
            this.__tm.setSortMethods(col_album, {
                ascending  : function(row1, row2) {
                    var v1 = row1[col_album].replace (/^(a|an|the)\s+/i, '');
                    var v2 = row2[col_album].replace (/^(a|an|the)\s+/i, '');
                    if (v1 == v2)
                    {
                        v1 = parseInt (row1[col_track]);
                        v2 = parseInt (row2[col_track]);
                        if (v1 == v2)
                        {
                            v1 = parseInt (row1[0]);
                            v2 = parseInt (row2[0]);
                        }
                    }
                    return (v1 < v2) ? -1 : ((v1 > v2) ? 1 : 0);
                },
                descending  : function(row1, row2) {
                    var v2 = row1[col_album].replace (/^(a|an|the)\s+/i, '');
                    var v1 = row2[col_album].replace (/^(a|an|the)\s+/i, '');
                    if (v1 == v2)
                    {
                        v2 = parseInt (row1[col_track]);
                        v1 = parseInt (row2[col_track]);
                        if (v1 == v2)
                        {
                            v2 = parseInt (row1[0]);
                            v1 = parseInt (row2[0]);
                        }
                    }
                    return (v1 < v2) ? -1 : ((v1 > v2) ? 1 : 0);
                }
            });

            this.__tm.addIndex (0);

            this.__tm.newView (function (rowdata) {
                if (this.__search_regex == '')
                {
                    return true;
                }

                var data;
                if (rowdata[this.__search_column] instanceof Array)
                {
                    data = rowdata[this.__search_column].join (' ');
                    if (!this.__search_case_sensitive)
                    {
                        data = data.toLowerCase ();
                    }
                }
                else
                {
                    data = rowdata[this.__search_column];
                    if (!this.__search_case_sensitive)
                    {
                        data = data.toLowerCase ();
                    }
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

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Loading XBMC library..."));
            this.__rpc.callAsync("AudioLibrary.GetSongs", [
                ['title', 'artist', 'album', 'genre', 'year', 'track', 'duration', 'playcount', 'rating', 'comment'],
                { 'start' : 0 },
                { 'order': 'ascending', 'method': 'artist', 'ignorearticle': true }
            ],
                function (result) {
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
            var me = this;

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Loading playlist %1", playlist.name));
            this.__rpc_ext.callAsync("get_playlist_tracks", ['music', playlist],
                function (result) {
                    var rowData = [];
                    for (var i = 0; i < result.length; i++)
                    {
                        var song = result[i];

                        var search_value = song.title + ' ' + song.artist + ' ' + song.album;

                        rowData.push ([song.id, search_value, song.track_num, song.title, song.artist, song.album]);
                    }

                    me.__tm.clearAllRows ();
                    me.__tm.setData(rowData);

                    me.__tm.setView (0);
                    me.__tm.updateView (0);
                    me.updateContent ();

                    me.__tm.sortByColumn (2, true);

                    // this will force the table to update the number of rows displayed at the bottom
                    me.set_selected_index (0);
                    me.clear_selection ();

                    // this is sooooo hacky, but
                    // we need a way to get the table to recaculate its number of rows and its
                    // scrollbar height, etc.
                    me._onResize ();

                    qooxtunes.ui.dlg.wait_popup.hide ();
                }
            );
        },

        clear : function ()
        {
            this.__tm.setData ([]);
        },

        on_dragstart: function(e) {
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
            if (!this.__limited_columns)
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
            }

            var id = row[0];
            // skip columns 0 and 1 (ID and search value)
            for (var i = 2; i < this.__tm.getColumnCount (); i++)
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

            // now set the search value
            row_idx = this.__tm.locate (0, id);

            if (this.__limited_columns)
            {
                search_value = this.__tm.getValue (3, row_idx) + ' '
                    + this.__tm.getValue (4, row_idx) + ' '
                    + this.__tm.getValue (5, row_idx);
            }
            else
            {
                search_value = this.__tm.getValue (2, row_idx) + ' '
                    + this.__tm.getValue (3, row_idx)  + ' '
                    + this.__tm.getValue (4, row_idx) + ' '
                    + this.__tm.getValue (5, row_idx)  + ' '
                    + this.__tm.getValue (11, row_idx);
            }

            console.log ("new search value: " + search_value);
            this.__tm.setValue (1, row_idx, search_value)
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

        on_cmd_select_all : function (e)
        {
            var num_rows = this.__tm.getRowCount ();
            var m = this.getSelectionModel ();
            m.setSelectionInterval (0, num_rows - 1);
        },

        playlist_action : function (onsuccess, onfailure)
        {
            this.__rpc.callAsync("Playlist.GetPlaylists", [],
                function (result) {
                    playlist_id = -1;
                    for (var i = 0; i < result.length; i++)
                    {
                        if (result[i].type == 'audio')
                        {
                            playlist_id = result[i].playlistid;
                            break;
                        }
                    }

                    if (playlist_id != -1)
                    {
                        onsuccess (playlist_id);
                    }
                }
            );
        },

        queue_next_item : function (playlist_id)
        {
            if (this.__play_queue.length == 0)
            {
                var pbc = qooxtunes.ui.ctl.playback_control.getInstance ();

                if (pbc.get_active_track() == null)
                {
                    this.__rpc.callAsync ("Player.Open", [ { playlistid: playlist_id }],
                        function (result) {
                        }
                    );
                }
                return;
            }

            var song_id = this.__play_queue.shift ();

            var me = this;
            this.__rpc.callAsync ("Playlist.Add", [playlist_id, { songid: song_id }],
                function (result) {
                    me.queue_next_item (playlist_id);
                }
            );
        },

        build_play_queue : function (allow_single)
        {
            if (typeof allow_single === 'undefined')
            {
                allow_single = false;
            }

            var sel_items = this.get_selected_items ();

            if (sel_items.length < 1)
            {
                return;
            }

            this.__play_queue = [];

            if (sel_items.length > 1)
            {
                for (var i = 0; i < sel_items.length; i++)
                {
                    this.__play_queue.push (sel_items[i][0]);
                }
                return;
            }

            var sel_indices = this.get_selected_indices ();

            if (allow_single)
            {
                this.__play_queue.push (sel_items[0][0]);
                return;
            }

            // otherwise, if user has selected one song, queue up the next 300...
            var start_idx = sel_indices[0];
            var max_idx = start_idx + 300;

            var num_rows = this.__tm.getRowCount ();
            if (max_idx > num_rows)
            {
                max_idx = num_rows;
            }

            for (var i = start_idx; i < max_idx; i++)
            {
                this.__play_queue.push (this.__tm.getRowData (i)[0]);
            }


        },



        play_selected : function (playlist_id)
        {
            this.build_play_queue ();

            if (this.__play_queue.length == 0)
            {
                return;
            }

            var me = this;

            var pbc = qooxtunes.ui.ctl.playback_control.getInstance ();
            var player = pbc.get_active_player();

            if (player)
            {
                me.__rpc.callAsync ("Player.Stop", [player.playerid],
                    function (result) {
                        me.__rpc.callAsync ("Playlist.Clear", [playlist_id],
                            function (result) {
                                pbc.update_player (function () {
                                    me.queue_next_item (playlist_id);
                                });
                            }
                        );
                    }
                );
            }
            else
            {
                me.__rpc.callAsync ("Playlist.Clear", [playlist_id],
                    function (result) {
                        me.queue_next_item (playlist_id);
                    }
                );
            }
        },


        queue_selected : function (playlist_id)
        {
            this.build_play_queue (true);

            if (this.__play_queue.length == 0)
            {
                return;
            }

            this.queue_next_item (playlist_id);
        },


        on_cmd_play : function (e)
        {
            var sel_items = this.get_selected_items ();

            if (sel_items.length < 1)
            {
                return;
            }

            var me = this;

            // QUESTION - do I need to check the ID of the audio playlist every time I want to
            // act on it, or will it stay constant throughout the app?
            this.playlist_action(
                function (playlist_id)
                {
                    // success
                    me.play_selected (playlist_id);
                },
                function ()
                {
                    // fail
                }
            );
        },

        on_cmd_queue : function (e)
        {
            var sel_items = this.get_selected_items ();

            if (sel_items.length < 1)
            {
                return;
            }

            var me = this;

            // QUESTION - do I need to check the ID of the audio playlist every time I want to
            // act on it, or will it stay constant throughout the app?
            this.playlist_action(
                function (playlist_id)
                {
                    // success
                    me.queue_selected (playlist_id);
                },
                function ()
                {
                    // fail
                }
            );
        },

        on_cmd_filter_for_artist : function (e)
        {
            var sel_items = this.get_selected_items ();

            if (sel_items.length != 1)
            {
                return;
            }

            var artist = sel_items[0][3];

            this.fireDataEvent ('searchChanged', 'artist=' + artist);
        },

        on_cmd_filter_for_album : function (e)
        {
            var sel_items = this.get_selected_items ();

            if (sel_items.length != 1)
            {
                return;
            }

            var album = sel_items[0][4];

            this.fireDataEvent ('searchChanged', 'album=' + album);
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

            var host = this.__rpc_ext.get_hostname ();
            var port = this.__rpc_ext.get_port ();
            this.__rpc_ext.callAsync("get_download_songs_url", [
                ids
            ],
                function (result) {
                    var path = result;

                    var url = '//' + host + ":" + port + path;

                    window.navigate_away = true;
                    window.location = url;
                }
            );

        },

        on_cmd_export : function (e)
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

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Exporting..."));

            var me = this;
            this.__rpc_ext.callAsync("export_songs", [
                ids
            ],
                function (result) {
                    qooxtunes.ui.dlg.wait_popup.hide ();

                    if (result == false) {
                        qooxtunes.ui.dlg.msgbox.go (me.tr ("Export"), me.tr ("Error exporting to export folder."));
                    }
                    else {
                        var msg = '';
                        if (sel_items.length == 1)
                        {
                            msg = me.tr ('Successfully exported song to export folder.');
                        }
                        else
                        {
                            msg = me.tr ('Successfully exported songs to export folder.');
                        }
                        qooxtunes.ui.dlg.msgbox.go (me.tr ("Export"), msg);
                    }
                }
            );

        },

        on_changeSelection : function (e) {
            var num_selected = this.getSelectionModel().getSelectedCount ();

            if (num_selected == 0)
            {
                this.__btn_play.setEnabled (false);
                this.__btn_queue.setEnabled (false);
                this.__btn_filter_for_artist.setEnabled (false);
                this.__btn_filter_for_album.setEnabled (false);
                this.__btn_edit.setEnabled (false);
                this.__btn_export.setEnabled (false);
                this.__btn_download.setEnabled (false);
                this.__btn_export.setLabel (this.tr ('Export song'));
                this.__btn_download.setLabel (this.tr ('Download song'));
            }
            else if (num_selected == 1)
            {
                this.__btn_play.setEnabled (true);
                this.__btn_queue.setEnabled (true);
                this.__btn_filter_for_artist.setEnabled (true);
                this.__btn_filter_for_album.setEnabled (true);
                this.__btn_edit.setEnabled (true);
                this.__btn_export.setEnabled (true);
                this.__btn_download.setEnabled (true);
                this.__btn_download.setLabel (this.tr ('Download song'));
                this.__btn_export.setLabel (this.tr ('Export song'));
            }
            else
            {
                this.__btn_play.setEnabled (true);
                this.__btn_queue.setEnabled (true);
                this.__btn_filter_for_artist.setEnabled (false);
                this.__btn_filter_for_album.setEnabled (false);
                this.__btn_edit.setEnabled (true);
                this.__btn_export.setEnabled (true);
                this.__btn_download.setEnabled (true);
                this.__btn_export.setLabel (this.tr ('Export songs'));
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
            this.__rpc = qooxtunes.io.remote.xbmc.getInstance ();
            this.__rpc_ext = qooxtunes.io.remote.xbmc_ext.getInstance ();

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
            this.addListener("dragstart", this.on_dragstart, this);

            this.__cm_songs = new qx.ui.menu.Menu ();

            this.__cmd_select_all = new qx.ui.core.Command("Ctrl+A");
            this.__cmd_select_all.addListener("execute", this.on_cmd_select_all, this);

            this.__btn_select_all = new qx.ui.menu.Button(this.tr ("Select All"), "", this.__cmd_select_all);
            this.__cm_songs.add (this.__btn_select_all);

            this.__cm_songs.add (new qx.ui.menu.Separator ());

            this.__cmd_play = new qx.ui.core.Command("Ctrl+P");
            this.__cmd_play.addListener("execute", this.on_cmd_play, this);

            this.addListener ('dblclick', this.on_cmd_play, this);

            this.__btn_play = new qx.ui.menu.Button(this.tr ("Play"), "", this.__cmd_play);
            this.__cm_songs.add (this.__btn_play);

            this.__cmd_queue = new qx.ui.core.Command("Ctrl+Q");
            this.__cmd_queue.addListener("execute", this.on_cmd_queue, this);

            this.__btn_queue = new qx.ui.menu.Button(this.tr ("Queue"), "", this.__cmd_queue);
            this.__cm_songs.add (this.__btn_queue);

            this.__cm_songs.add (new qx.ui.menu.Separator ());

            this.__cmd_filter_for_artist = new qx.ui.core.Command();
            this.__cmd_filter_for_artist.addListener("execute", this.on_cmd_filter_for_artist, this);

            this.__btn_filter_for_artist = new qx.ui.menu.Button(this.tr ("Filter for Artist"), "", this.__cmd_filter_for_artist);

            this.__cmd_filter_for_album = new qx.ui.core.Command();
            this.__cmd_filter_for_album.addListener("execute", this.on_cmd_filter_for_album, this);

            this.__btn_filter_for_album = new qx.ui.menu.Button(this.tr ("Filter for Album"), "", this.__cmd_filter_for_album);

            if (!this.__limited_columns)
            {
                this.__cm_songs.add (this.__btn_filter_for_artist);
                this.__cm_songs.add (this.__btn_filter_for_album);
                this.__cm_songs.add (new qx.ui.menu.Separator ());
            }

            this.__cmd_edit = new qx.ui.core.Command("Ctrl+I");
            this.__cmd_edit.addListener("execute", this.on_cmd_edit, this);

            this.__btn_edit = new qx.ui.menu.Button(this.tr ("Edit Info"), "", this.__cmd_edit);
            this.__cm_songs.add (this.__btn_edit);

            this.__cm_songs.add (new qx.ui.menu.Separator ());

            this.__cmd_export = new qx.ui.core.Command("Ctrl+E");
            this.__cmd_export.addListener("execute", this.on_cmd_export, this);

            this.__btn_export = new qx.ui.menu.Button(this.tr ("Export Song"), "", this.__cmd_export);
            this.__cm_songs.add (this.__btn_export);

            this.__cmd_download = new qx.ui.core.Command("Ctrl+F");
            this.__cmd_download.addListener("execute", this.on_cmd_download, this);

            this.__btn_download = new qx.ui.menu.Button(this.tr ("Download Song"), "", this.__cmd_download);
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