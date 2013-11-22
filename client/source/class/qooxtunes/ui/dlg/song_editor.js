qx.Class.define("qooxtunes.ui.dlg.song_editor",
{
    extend : qooxtunes.ui.dlg.standard,

    type : "singleton",

    statics :
    {
        go : function (song_id, song_idx, num_songs, ok_callback, next_callback, prev_callback)
        {
            var dlg = qooxtunes.ui.dlg.song_editor.getInstance();

            dlg.__ok_callback = ok_callback;
            dlg.__next_callback = next_callback;
            dlg.__prev_callback = prev_callback;
            dlg.__song_id = song_id;

            dlg.__current_song_idx = song_idx;
            dlg.__num_songs = num_songs;

            dlg.request_genres (function () {
                dlg.request_songdetails (song_id, true);
            });
        }
    },

    construct : function ()
    {
        this.base(arguments, this.tr ("Song Info"), "icon/22/mimetypes/media-audio.png");
        this.init ();
    },

    members : {
        __song_id : -1,

        // used when stepping through library with next/prev
        __current_song_idx : -1,
        __num_songs : 0,

        __ok_callback : null,
        __next_callback : null,
        __prev_callback : null,

        __clean : true,

        on_keypress : function (e)
        {
            if (e.getKeyIdentifier().toLowerCase() == 'enter')
            {
                // enter
                this.on_btn_ok_execute();
            }
            if (e.getKeyIdentifier().toLowerCase() == 'escape')
            {
                // escape
                this.on_btn_cancel_execute();
            }
        },

        validate : function ()
        {
            var title = this.__tf_title.getValue ().trim ();
            if (title == '')
            {
                qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"), this.tr ("Title cannot be empty."));
                return false;
            }

            var artist = this.__tf_artist.getValue ().trim ();
            if (artist == '')
            {
                qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"), this.tr ("Artist cannot be empty."));
                return false;
            }

            return true;
        },


        go_previous : function ()
        {
            var nav_result = this.__prev_callback (this.gather_song_data ());

            this.__song_id = nav_result.song_id;
            this.__current_song_idx = [ nav_result.song_idx ];
            this.__num_songs = [ nav_result.num_songs ];

            this.request_songdetails(nav_result.song_id);
        },

        on_btn_previous_execute : function ()
        {
            var me = this;
            if (!this.__clean)
            {
                if (!this.validate())
                {
                    return;
                }
                this.save_songdetails (function () {
                    me.go_previous ();
                });
                return;
            }

            this.go_previous ();
        },

        go_next : function ()
        {
            var nav_result = this.__next_callback (this.gather_song_data ());

            this.__song_id = nav_result.song_id;
            this.__current_song_idx = [ nav_result.song_idx ];
            this.__num_songs = [ nav_result.num_songs ];

            this.request_songdetails(nav_result.song_id);
        },


        on_btn_next_execute : function ()
        {
            var me = this;
            if (!this.__clean)
            {
                if (!this.validate())
                {
                    return;
                }
                this.save_songdetails (function () {
                    me.go_next ();
                });
                return;
            }

            this.go_next ();
        },

        on_btn_ok_execute : function ()
        {
            if (this.__clean)
            {
                this.close ();
            }

            if (!this.validate ())
            {
                return;
            }

            var me = this;
            this.save_songdetails (function () {
                me.__ok_callback (me.gather_song_data ());
                me.close ();
            });
        },

        on_btn_cancel_execute : function ()
        {
            this.close ();
        },

        on_input : function ()
        {
            this.__clean = false;
        },


        on_tf_title_input : function ()
        {
            this.update_song_summary ();
        },

        on_tf_albumartist_input : function ()
        {
            this.update_song_summary ();
        },

        on_tf_album_input : function ()
        {
            this.update_song_summary ();
        },

        update_ui : function ()
        {
            if (this.__current_song_idx > 0)
            {
                this.__btn_previous.setEnabled (true);
            }
            else
            {
                this.__btn_previous.setEnabled (false);
            }

            if (this.__current_song_idx < this.__num_songs - 1)
            {
                this.__btn_next.setEnabled (true);
            }
            else
            {
                this.__btn_next.setEnabled (false);
            }
        },

        request_genres : function (callback)
        {
            var rpc = qooxtunes.io.remote.xbmc.getInstance ();

            // note: there seems to be a bug in the GetSongDetails call that 'file' doesn't
            // work as documented

            var me = this;
            rpc.callAsync ('AudioLibrary.GetGenres',
                [
                    ['title'],
                    { 'start' : 0 },
                    { 'order' : 'ascending', 'method' : 'label' }
                ],
                function (result) {
                    me.__cb_genre.removeAll ();
                    for (var i = 0; i < result.genres.length; i++)
                    {
                        var id = result.genres[i].genreid;
                        var label = result.genres[i].label;

                        me.__cb_genre.add_item (label, id);
                    }
                    callback ();
                });
        },
        
        request_songdetails : function (song_id, open_after_load)
        {
            if (typeof open_after_load === 'undefined')
            {
                open_after_load = false;
            }

            var rpc = qooxtunes.io.remote.xbmc.getInstance ();

            // note: there seems to be a bug in the GetSongDetails call that 'file' doesn't
            // work as documented

            var me = this;
            rpc.callAsync ('AudioLibrary.GetSongDetails',
                [song_id,
                    ['title', 'artist', 'albumartist', 'genre',
                        'year', 'rating', 'album', 'track', 'duration',
                        'comment', 'lyrics', 'musicbrainztrackid', 'musicbrainzartistid',
                        'musicbrainzalbumid', 'musicbrainzalbumartistid', 'playcount',
                        'fanart', 'thumbnail', 'file', 'albumid', 'lastplayed',
                        'disc', 'genreid', 'artistid', 'displayartist', 'albumartistid']
                    ],
                function (result) {

                    var songdetails = result.songdetails;

                    me.load_songdetails (songdetails);
                    me.__current_song_id = song_id;
                    me.update_ui ();

                    if (open_after_load)
                    {
                        me.open ();
                    }

                });
        },

        gather_song_data : function ()
        {
            if (this.__clean)
            {
                return null;
            }

            var data = [];

            data.push (this.__songdetails.songid);
            var title = this.__tf_title.getValue ().trim ();
            if (title == '')
            {
                data.push (null);
            }
            else
            {
                data.push (title);
            }

            // artist
            var artists = [];
            var artist = this.__tf_artist.getValue ().trim ();
            if (artist == '')
            {
                data.push (null);
            }
            else
            {
                artists.push (artist);
                data.push (artists);
            }

            // albumartist
            var albumartists = [];
            var albumartist = this.__tf_albumartist.getValue ().trim ();
            if (albumartist == '')
            {
                data.push (null);
            }
            else
            {
                albumartists.push (albumartist);
                data.push (albumartists);
            }

            // genre
            var genres = [];
            var genre = this.__cb_genre.getValue ();

            if (genre == '' || genre == null)
            {
                data.push (null);
            }
            else
            {
                genres.push (genre);
                data.push (genres);
            }

            // year
            var year = parseInt (this.__tf_year.getValue ().trim ());
            if (year == 0)
            {
                year = null;
            }
            data.push (year);

            // rating
            var rating = parseInt (this.__tf_rating.getValue ().trim ());
            data.push (rating);

            // album
            data.push (this.__tf_album.getValue ().trim ());

            // track
            var track = parseInt (this.__tf_track_number.getValue ().trim ());
            if (track == 0)
            {
                track = null;
            }
            data.push (track);

            // disc
            var disc = parseInt (this.__tf_disc_number.getValue ().trim ());
            if (disc == 0)
            {
                disc = null;
            }
            data.push (disc);

            // duration
            data.push (null);

            // comment
            data.push (this.__ta_comment.getValue ().trim ());

            // musicbrainztrackid
            // musicbrainzartistid
            // musicbrainzalbumid
            // musicbrainzalbumartistid

            return data;
        },


        save_songdetails : function (callback)
        {
            var params = this.gather_song_data ();

            var rpc = qooxtunes.io.remote.xbmc.getInstance ();

            var me = this;
            rpc.callAsync ('AudioLibrary.SetSongDetails',
                params,
                function (result) {
                    callback ();
                });
        },

        update_song_summary : function ()
        {
            var sd = this.__songdetails;

            var str_duration = qooxtunes.util.time.duration_int_to_str(sd.duration);
            str_duration = str_duration.replace (/^00:(\d\d:\d\d)/, "$1");

            this.__l_title.setValue (this.__tf_title.getValue() + " (" + str_duration + ")");
            this.__l_albumartist.setValue (this.__tf_albumartist.getValue ());
            this.__l_album.setValue (this.__tf_album.getValue ());

            this.__l_plays.setValue ("" + sd.playcount);
            this.__l_last_played.setValue ("" + sd.lastplayed);
        },

        load_songdetails : function (sd)
        {
            this.__songdetails = sd;

            var img_url = "/vfs/" + encodeURIComponent (sd.thumbnail);
            this.__i_artwork.setSource (img_url);

            this.__tf_title.setValue (sd.title);

            // @TODO -- handle multiple artists
            var artist = (sd.artist.length > 0) ? sd.artist[0] : '';
            this.__tf_artist.setValue (artist);

            var albumartist = (sd.albumartist.length > 0) ? sd.albumartist[0] : '';
            this.__tf_albumartist.setValue (albumartist);

            this.__tf_album.setValue (sd.album);

            this.__tf_year.setValue ('' + sd.year);

            // @TODO - handle multiple genres
            var genre = (sd.genre.length > 0) ? sd.genre[0] : '';
            this.__cb_genre.setValue (genre);

            this.__ta_comment.setValue (sd.comment);

            this.__tf_rating.setValue ("" + sd.rating);
            this.__tf_disc_number.setValue ("" + sd.disc);
            this.__tf_track_number.setValue ("" + sd.track);

            this.update_song_summary ();

            this.__clean = true;
        },

        build_label : function (value, bold)
        {
            var lb;

            lb = new qx.ui.basic.Label (value);

            if (typeof bold === "undefined")
            {
                bold = false;
            }

            if (bold)
            {
                lb.setFont (qx.bom.Font.fromString("11px sans-serif bold"));
            }
            else
            {
                lb.setFont (qx.bom.Font.fromString("11px sans-serif"));
            }

            return lb;
        },

        init : function ()
        {
            this.set ({width : 534, height : 593});

            this.__tv_editor = new qx.ui.tabview.TabView();

            this.__tvp_summary = new qx.ui.tabview.Page(this.tr ("Summary"));
            this.__tvp_summary.setLayout(new qx.ui.layout.Canvas());
            this.__tv_editor.add(this.__tvp_summary);

            var y = 16;

            this.__i_artwork = new qx.ui.basic.Image("");
            this.__i_artwork.setDecorator (new qx.ui.decoration.Single (1, 'solid', '#000000'));
            this.__i_artwork.setScale(true);
            this.__i_artwork.setWidth(120);
            this.__i_artwork.setHeight(120);
            this.__tvp_summary.add(this.__i_artwork, { left: 16, top: y });

            this.__l_title = new qx.ui.basic.Label ('');
            this.__tvp_summary.add (this.__l_title, { left: 152, top: y });

            y += 20;

            this.__l_albumartist = new qx.ui.basic.Label ('');
            this.__tvp_summary.add (this.__l_albumartist, { left: 152, top: y });

            y += 20;

            this.__l_album = new qx.ui.basic.Label ('');
            this.__tvp_summary.add (this.__l_album, { left: 152, top: y });

            y += 88;

            var lb;

            /*
            lb = this.build_label ('Kind:', true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            y += 16;

            lb = this.build_label ('Size:', true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            y += 16;

            lb = this.build_label ('Bit Rate:', true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            y += 16;

            lb = this.build_label ('Sample Rate:', true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            y += 16;

            lb = this.build_label ('Date Modified:', true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            y += 16;
            */

            lb = this.build_label (this.tr ('Plays:'), true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            this.__l_plays = this.build_label ('');
            this.__tvp_summary.add (this.__l_plays, { left: 100, top: y});

            y += 16;

            lb = this.build_label (this.tr ('Last Played:'), true);
            this.__tvp_summary.add (lb, { right: 380, top: y});

            this.__l_last_played = this.build_label ('');
            this.__tvp_summary.add (this.__l_last_played, { left: 100, top: y});

            
            this.__tvp_info = new qx.ui.tabview.Page(this.tr ("Info"));
            this.__tvp_info.setLayout(new qx.ui.layout.Canvas());
            this.__tv_editor.add(this.__tvp_info);

            this.addListener ('keypress', this.on_keypress, this);

            var y = 16;

            lb = this.build_label(this.tr ('Name'));
            this.__tvp_info.add (lb, { top: y, left: 16 });
            y += 14;

            this.__tf_title = new qx.ui.form.TextField ();
            this.__tvp_info.add (this.__tf_title, { top: y, left: 16, right: 16 });
            this.__tf_title.addListener ("input", this.on_tf_title_input, this);
            this.__tf_title.addListener ("input", this.on_input, this);
            y += 40;

            lb = this.build_label(this.tr ('Artist'));
            this.__tvp_info.add (lb, { top: y, left: 16 });

            lb = this.build_label(this.tr ('Year'));
            this.__tvp_info.add (lb, { top: y, left: 410 });

            y += 14;

            this.__tf_artist = new qx.ui.form.TextField ();
            this.__tf_artist.setWidth (378);
            this.__tf_artist.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_artist, { top: y, left: 16 });

            this.__tf_year = new qx.ui.form.TextField ();
            this.__tf_year.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_year, { top: y, left: 410, right: 16 });

            y += 40;

            lb = this.build_label(this.tr ('Album Artist'));
            this.__tvp_info.add (lb, { top: y, left: 16 });
            y += 14;

            this.__tf_albumartist = new qx.ui.form.TextField ();
            this.__tf_albumartist.addListener ("input", this.on_tf_albumartist_input, this);
            this.__tf_albumartist.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_albumartist, { top: y, left: 16, right: 16 });
            y += 40;

            lb = this.build_label(this.tr ('Album'));
            this.__tvp_info.add (lb, { top: y, left: 16 });
            y += 14;

            this.__tf_album = new qx.ui.form.TextField ();
            this.__tf_album.addListener ("input", this.on_tf_album_input, this);
            this.__tf_album.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_album, { top: y, left: 16, right: 16 });
            y += 40;

            lb = this.build_label(this.tr ('Comments'));
            this.__tvp_info.add (lb, { top: y, left: 16 });
            y += 14;

            this.__ta_comment = new qx.ui.form.TextArea ();
            this.__ta_comment.setHeight (60);
            this.__ta_comment.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__ta_comment, { top: y, left: 16, right: 16 });

            y += 73;

            lb = this.build_label(this.tr ('Genre'));
            this.__tvp_info.add (lb, { top: y, left: 16 });
            y += 14;

            this.__cb_genre = new qooxtunes.ui.ctl.ComboBox ();
            this.__cb_genre.addListener ("changeValue", this.on_input, this);
            this.__tvp_info.add (this.__cb_genre, { top: y, left: 16, right: 16 });

            y += 40;

            lb = this.build_label(this.tr ('Rating'));
            this.__tvp_info.add (lb, { top: y, left: 16 });

            lb = this.build_label(this.tr ('Disc #'));
            this.__tvp_info.add (lb, { top: y, left: 224 });

            lb = this.build_label(this.tr ('Track #'));
            this.__tvp_info.add (lb, { top: y, right: 16 });

            y += 14;

            this.__tf_rating = new qx.ui.form.TextField ();
            this.__tf_rating.setWidth (40);
            this.__tf_rating.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_rating, { top: y, left: 16 });

            this.__tf_disc_number = new qx.ui.form.TextField ();
            this.__tf_disc_number.setWidth (40);
            this.__tf_disc_number.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_disc_number, { top: y, left: 224 });

            this.__tf_track_number = new qx.ui.form.TextField ();
            this.__tf_track_number.setWidth (40);
            this.__tf_track_number.addListener ("input", this.on_input, this);
            this.__tvp_info.add (this.__tf_track_number, { top: y, right: 16 });

            y += 40;

            this.add (this.__tv_editor, { top: 16, left: 16, right: 16, bottom: 62});

            var bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

            // prev/next buttons
            this.__btn_previous = new qx.ui.form.Button(this.tr ("Previous"));
            this.__btn_previous.set ({ width : 100 });
            this.__btn_previous.addListener("execute", this.on_btn_previous_execute, this);
            bl1.add(this.__btn_previous);

            this.__btn_next = new qx.ui.form.Button(this.tr ("Next"));
            this.__btn_next.set ({ width : 100 });
            this.__btn_next.addListener("execute", this.on_btn_next_execute, this);
            bl1.add(this.__btn_next);

            this.add (bl1, { left: 16, bottom: 16});


            var bl2 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

            // ok and cancel buttons
            this.__btn_ok = new qx.ui.form.Button(this.tr ("OK"));
            this.__btn_ok.set ({ width : 100 });
            this.__btn_ok.addListener("execute", this.on_btn_ok_execute, this);
            bl2.add(this.__btn_ok);

            this.__btn_cancel = new qx.ui.form.Button(this.tr ("Cancel"));
            this.__btn_cancel.set ({ width : 100 });
            this.__btn_cancel.addListener("execute", this.on_btn_cancel_execute, this);
            bl2.add(this.__btn_cancel);

            this.add (bl2, { right: 16, bottom: 16});

            this.addListener ('appear', function () {
                this.__tf_title.focus ();
                this.__tf_title.setTextSelection (0);
            }, this);
        }
    }
});
