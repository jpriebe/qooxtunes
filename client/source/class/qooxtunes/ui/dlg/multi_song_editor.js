qx.Class.define("qooxtunes.ui.dlg.multi_song_editor",
    {
        extend : qooxtunes.ui.dlg.standard,

        type : "singleton",

        statics :
        {
            go : function (song_ids, ok_callback)
            {
                var dlg = qooxtunes.ui.dlg.multi_song_editor.getInstance();

                dlg.__ok_callback = ok_callback;
                dlg.__song_ids = song_ids;

                dlg.clear_fields ();
                dlg.request_genres ();
                dlg.open ();
            }
        },

        construct : function ()
        {
            this.base(arguments, this.tr ("Song Info"), "icon/22/mimetypes/media-audio.png");
            this.init ();
        },

        members : {
            __song_ids : [],

            __num_modified_fields : 0,

            __ok_callback : null,

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
                return true;
            },


            on_btn_ok_execute : function ()
            {
                var fields = this.gather_modified_fields ();

                if (this.__num_modified_fields < 1)
                {
                    this.close ();
                }

                if (!this.validate ())
                {
                    return;
                }

                var me = this;
                this.save_modified_fields ();
            },

            on_btn_cancel_execute : function ()
            {
                this.close ();
            },

            on_tf_title_input : function ()
            {
                this.__cb_title.setValue (true);
            },

            on_tf_artist_input : function ()
            {
                this.__cb_artist.setValue (true);
            },

            on_tf_year_input : function ()
            {
                this.__cb_year.setValue (true);
            },

            on_tf_albumartist_input : function ()
            {
                this.__cb_albumartist.setValue (true);
            },

            on_tf_album_input : function ()
            {
                this.__cb_album.setValue (true);
            },

            on_ta_comment_input : function ()
            {
                this.__cb_comment.setValue (true);
            },

            on_c_genre_changeValue : function ()
            {
                this.__cb_genre.setValue (true);
            },

            on_tf_rating_input : function ()
            {
                this.__cb_rating.setValue (true);
            },

            on_tf_disc_number_input : function ()
            {
                this.__cb_disc_number.setValue (true);
            },

            on_tf_track_number_input : function ()
            {
                this.__cb_track_number.setValue (true);
            },

            update_ui : function ()
            {
            },

            clear_fields : function ()
            {
                this.__cb_title.setValue (false);
                this.__tf_title.setValue ('');
                this.__cb_artist.setValue (false);
                this.__tf_artist.setValue ('');
                this.__cb_year.setValue (false);
                this.__tf_year.setValue ('');
                this.__cb_albumartist.setValue (false);
                this.__tf_albumartist.setValue ('');
                this.__cb_album.setValue (false);
                this.__tf_album.setValue ('');
                this.__cb_comment.setValue (false);
                this.__ta_comment.setValue ('');
                this.__cb_genre.setValue (false);
                this.__c_genre.setValue ('');
                this.__cb_rating.setValue (false);
                this.__tf_rating.setValue ('');
                this.__cb_disc_number.setValue (false);
                this.__tf_disc_number.setValue ('');
                this.__cb_track_number.setValue (false);
                this.__tf_track_number.setValue ('');
            },

            request_genres : function ()
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
                    function (result, exc) {
                        me.__c_genre.removeAll ();
                        for (var i = 0; i < result.genres.length; i++)
                        {
                            var id = result.genres[i].genreid;
                            var label = result.genres[i].label;

                            me.__c_genre.add_item (label, id);
                        }
                    });
            },

            gather_modified_fields : function ()
            {
                this.__num_modified_fields = 0;
                var fields = [];

                // placeholder for song id
                fields[0] = -1;

                if (this.__cb_title.getValue())
                {
                    fields.push(this.__tf_title.getValue ().trim ());
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_artist.getValue())
                {
                    fields.push ([this.__tf_artist.getValue ().trim ()]);
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_albumartist.getValue())
                {
                    fields.push ([this.__tf_albumartist.getValue ().trim ()]);
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_genre.getValue())
                {
                    fields.push ([this.__c_genre.getValue ()]);
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_year.getValue())
                {
                    var str = this.__tf_year.getValue ().trim ();
                    if (str == '')
                    {
                        str = '0';
                    }
                    fields.push (parseInt (str));
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_rating.getValue())
                {
                    var str = this.__tf_rating.getValue ().trim ();
                    if (str == '')
                    {
                        str = '0';
                    }
                    fields.push (parseInt (str));
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_album.getValue())
                {
                    fields.push (this.__tf_album.getValue ().trim ());
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_track_number.getValue())
                {
                    var str = this.__tf_track_number.getValue ().trim ();
                    if (str == '')
                    {
                        str = '0';
                    }
                    fields.push (parseInt (str));
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                if (this.__cb_disc_number.getValue())
                {
                    var str = this.__tf_disc_number.getValue ().trim ();
                    if (str == '')
                    {
                        str = '0';
                    }
                    fields.push (parseInt (str))
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }

                // duration
                fields.push (null);

                if (this.__cb_comment.getValue())
                {
                    fields.push (this.__ta_comment.getValue ().trim ())
                    this.__num_modified_fields++;
                }
                else
                {
                    fields.push (null);
                }
                
                return fields;
            },


            __curr_save_idx : 0,
            __save_fields : [],

            __save_next : function ()
            {
                var me = this;

                var song_id = this.__song_ids[this.__curr_save_idx];
                this.__save_fields[0] = song_id;

                var rpc = qooxtunes.io.remote.xbmc.getInstance ();
                rpc.callAsync ('AudioLibrary.SetSongDetails',
                    this.__save_fields,
                    function (result, exc) {
                        me.__curr_save_idx++;

                        if (me.__curr_save_idx > me.__song_ids.length - 1)
                        {
                            me.__ok_callback (me.__song_ids, me.__save_fields);
                            me.close ();
                        }
                        else
                        {
                            me.__save_next (me.__save_fields);
                        }
                    });
            },



            save_modified_fields : function (callback)
            {
                this.__save_fields = this.gather_modified_fields ();
                this.__curr_save_idx = 0;
                this.__save_next ();
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
                var lb;

                this.set ({width : 534, height : 593});

                this.__tv_editor = new qx.ui.tabview.TabView();

                this.__tvp_info = new qx.ui.tabview.Page(this.tr ("Info"));
                this.__tvp_info.setLayout(new qx.ui.layout.Canvas());
                this.__tv_editor.add(this.__tvp_info);

                this.addListener ('keypress', this.on_keypress, this);

                var y = 16;

                lb = this.build_label(this.tr ('Name'));
                this.__tvp_info.add (lb, { top: y, left: 32 });
                y += 14;

                this.__cb_title = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_title, { top: y + 8, left: 16});

                this.__tf_title = new qx.ui.form.TextField ();
                this.__tvp_info.add (this.__tf_title, { top: y, left: 32, right: 16 });
                this.__tf_title.addListener ("input", this.on_tf_title_input, this);
                y += 40;

                lb = this.build_label(this.tr ('Artist'));
                this.__tvp_info.add (lb, { top: y, left: 32 });

                lb = this.build_label(this.tr ('Year'));
                this.__tvp_info.add (lb, { top: y, left: 410 });

                y += 14;

                this.__cb_artist = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_artist, { top: y + 8, left: 16});

                this.__tf_artist = new qx.ui.form.TextField ();
                this.__tf_artist.setWidth (354);
                this.__tf_artist.addListener ("input", this.on_tf_artist_input, this);
                this.__tvp_info.add (this.__tf_artist, { top: y, left: 32 });

                this.__cb_year = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_year, { top: y + 8, left: 394});

                this.__tf_year = new qx.ui.form.TextField ();
                this.__tf_year.addListener ("input", this.on_tf_year_input, this);
                this.__tvp_info.add (this.__tf_year, { top: y, left: 410, right: 16 });

                y += 40;

                lb = this.build_label(this.tr ('Album Artist'));
                this.__tvp_info.add (lb, { top: y, left: 32 });
                y += 14;

                this.__cb_albumartist = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_albumartist, { top: y + 8, left: 16});

                this.__tf_albumartist = new qx.ui.form.TextField ();
                this.__tf_albumartist.addListener ("input", this.on_tf_albumartist_input, this);
                this.__tvp_info.add (this.__tf_albumartist, { top: y, left: 32, right: 16 });
                y += 40;

                lb = this.build_label(this.tr ('Album'));
                this.__tvp_info.add (lb, { top: y, left: 32 });
                y += 14;

                this.__cb_album = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_album, { top: y + 8, left: 16});

                this.__tf_album = new qx.ui.form.TextField ();
                this.__tf_album.addListener ("input", this.on_tf_album_input, this);
                this.__tvp_info.add (this.__tf_album, { top: y, left: 32, right: 16 });
                y += 40;

                lb = this.build_label(this.tr ('Comments'));
                this.__tvp_info.add (lb, { top: y, left: 32 });
                y += 14;

                this.__cb_comment = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_comment, { top: y + 8, left: 16});

                this.__ta_comment = new qx.ui.form.TextArea ();
                this.__ta_comment.setHeight (60);
                this.__ta_comment.addListener ("input", this.on_ta_comment_input, this);
                this.__tvp_info.add (this.__ta_comment, { top: y, left: 32, right: 16 });

                y += 73;

                lb = this.build_label(this.tr ('Genre'));
                this.__tvp_info.add (lb, { top: y, left: 32 });
                y += 14;

                this.__cb_genre = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_genre, { top: y + 8, left: 16});

                this.__c_genre = new qooxtunes.ui.ctl.ComboBox ();
                this.__c_genre.addListener ("changeValue", this.on_c_genre_changeValue, this);
                this.__tvp_info.add (this.__c_genre, { top: y, left: 32, right: 16 });

                y += 40;

                lb = this.build_label(this.tr ('Rating'));
                this.__tvp_info.add (lb, { top: y, left: 32 });

                lb = this.build_label(this.tr ('Disc #'));
                this.__tvp_info.add (lb, { top: y, left: 224 });

                lb = this.build_label(this.tr ('Track #'));
                this.__tvp_info.add (lb, { top: y, right: 16 });

                y += 14;

                this.__cb_rating = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_rating, { top: y + 8, left: 16});

                this.__tf_rating = new qx.ui.form.TextField ();
                this.__tf_rating.setWidth (40);
                this.__tf_rating.addListener ("input", this.on_tf_rating_input, this);
                this.__tvp_info.add (this.__tf_rating, { top: y, left: 32 });

                this.__cb_disc_number = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_disc_number, { top: y + 8, left: 208});

                this.__tf_disc_number = new qx.ui.form.TextField ();
                this.__tf_disc_number.setWidth (40);
                this.__tf_disc_number.addListener ("input", this.on_tf_disc_number_input, this);
                this.__tvp_info.add (this.__tf_disc_number, { top: y, left: 224 });

                this.__cb_track_number = new qx.ui.form.CheckBox ();
                this.__tvp_info.add (this.__cb_track_number, { top: y + 8, right: 60});

                this.__tf_track_number = new qx.ui.form.TextField ();
                this.__tf_track_number.setWidth (40);
                this.__tf_track_number.addListener ("input", this.on_tf_track_number_input, this);
                this.__tvp_info.add (this.__tf_track_number, { top: y, right: 16 });

                y += 40;

                this.add (this.__tv_editor, { top: 16, left: 16, right: 16, bottom: 62});

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
