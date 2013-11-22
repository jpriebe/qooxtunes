qx.Class.define("qooxtunes.ui.ctl.playback_control",
{
    extend :  qx.ui.container.Composite,

    construct : function ()
    {
        this.base (arguments);
        this.init ();
    },

    members :
    {
        __player_ids : [],
        __playing : false,
        __shuffled : false,
        __repeat : false,
        __current_song_id : null,
        __updating_scrubber : false,
        __mouse_down_in_scrubber : false,

        on_btn_back_execute : function (e)
        {
            if (this.__player_ids.length == 0)
            {
                return;
            }

            var me = this;
            var player_id = this.__player_ids[0].playerid;
            this._rpc.callAsync("Player.GoTo", [player_id, "previous"],
                function (result) {
                    me.update_player ();
                });
        },
        
        on_btn_forward_execute : function (e)
        {
            if (this.__player_ids.length == 0)
            {
                return;
            }

            var me = this;
            var player_id = this.__player_ids[0].playerid;
            this._rpc.callAsync("Player.GoTo", [player_id, "next"],
                function (result) {
                    me.update_player ();
                });
        },


        on_btn_play_execute : function (e)
        {
            if (this.__player_ids.length == 0)
            {
                return;
            }

            var player_id = this.__player_ids[0].playerid;
            var me = this;
            this._rpc.callAsync("Player.PlayPause", [player_id],
                function (result) {
                    me.update_player();
                }
            );
        },

        on_btn_repeat_execute : function (e)
        {
            var me = this;
            var player_id = this.__player_ids[0].playerid;
            this._rpc.callAsync("Player.SetRepeat", [player_id, "cycle"],
                function (result) {
                    me.update_player ();
                });
        },

        on_btn_shuffle_execute : function (e)
        {
            var me = this;
            var player_id = this.__player_ids[0].playerid;
            this._rpc.callAsync("Player.SetShuffle", [player_id, "toggle"],
                function (result) {
                    me.update_player ();
                });
        },

        on_s_scrubber_changeValue : function (e)
        {
            if (!this.__mouse_down_in_scrubber)
            {
                return;
            }

            var position = this.__s_scrubber.getValue ();

            var h = parseInt (position / 3600);
            position -= h * 3600;

            var m = parseInt (position / 60);
            position -= m * 60;

            var s = position;

            this.__l_time.setValue (this.format_time(h, m, s, 3));
        },

        on_s_scrubber_mousedown : function (e)
        {
            this.__mouse_down_in_scrubber = true;
        },

        on_s_scrubber_mouseup : function (e)
        {
            this.__mouse_down_in_scrubber = false;

            if (this.__updating_scrubber)
            {
                return;
            }

            console.log ('scrubber value changed to ' + this.__s_scrubber.getValue ());

            var perc = parseFloat (this.__s_scrubber.getValue () / this.__s_scrubber.getMaximum () * 100.0);

            var player_id = this.__player_ids[0].playerid;
            var me = this;
            this._rpc.callAsync("Player.Seek", [player_id, perc],
                function (result) {
                    me.update_player();
                });
        },

        format_time : function (h, m, s, min_num_places)
        {
            if (h < 10)
            {
                h = '0' + h;
            }
            if (m < 10)
            {
                m = '0' + m;
            }
            if (s < 10)
            {
                s = '0' + s;
            }

            if (min_num_places == 2)
            {
                if (h < 1)
                {
                    return '' + m + ':' + s;
                }
            }

            return '' + h + ':' + m + ':' + s;
        },


        update_song_info : function (song_id)
        {
            var need_text_update = true;

            if (song_id == this.__current_song_id)
            {
                need_text_update = false;
            }
            else
            {
                this.__current_song_id = song_id;
            }

            var me = this;
            if (need_text_update)
            {
                if (song_id == null)
                {
                    this.__l_title.setValue ('');
                    this.__l_artist.setValue ('');
                    this.__i_artwork.setSource ('qooxtunes/icon/64/music.png')
                    this.reset_timer ();
                    return;
                }
                else
                {
                    this._rpc.callAsync ('AudioLibrary.GetSongDetails',
                        [this.__current_song_id,
                            ['title', 'albumartist', 'album', 'thumbnail', 'duration']
                        ],
                        function (result) {
                            var sd = result.songdetails;

                            if (need_text_update)
                            {
                                var img_url = "/vfs/" + encodeURIComponent (sd.thumbnail);
                                me.__i_artwork.setSource (img_url);

                                me.__l_title.setValue (sd.title);
                                var album_artist = (sd.albumartist.length > 0) ? sd.albumartist[0] : '';
                                var line2 = album_artist + " - " + sd.album;
                                me.__l_artist.setValue (line2);

                                me.__s_scrubber.setMaximum (sd.duration);
                            }
                        }
                    );
                }

            }

            // don't update the scrubber or time while mouse is down
            if (this.__mouse_down_in_scrubber)
            {
                me.reset_timer ();
                return;
            }

            var player_id = this.__player_ids[0].playerid;
            this._rpc.callAsync ('Player.GetProperties',
                [player_id,
                ['speed', 'playlistid', 'position', 'percentage', 'time', 'totaltime', 'shuffled', 'repeat' ]],
                function (result) {
                    // me.__l_time.setValue ()
                    me.__l_time.setValue (me.format_time (result.time.hours, result.time.minutes, result.time.seconds, 3));
                    me.__l_total_time.setValue (me.format_time (result.totaltime.hours, result.totaltime.minutes, result.totaltime.seconds, 3));

                    if (me.__playing)
                    {
                        if (result.speed == 0)
                        {
                            console.log ("speed = 0; playing = false");
                            me.__playing = false;
                            me.__btn_play.setIcon ('qooxtunes/icon/32/play.png');
                        }
                    }
                    else
                    {
                        if (result.speed > 0)
                        {
                            console.log ("speed > 0; playing = true");
                            me.__playing = true;
                            me.__btn_play.setIcon ('qooxtunes/icon/32/pause.png');
                        }
                    }


                    var elapsed_seconds = result.time.hours * 3600 + result.time.minutes * 60 + result.time.seconds;
                    if (elapsed_seconds <= me.__s_scrubber.getMaximum ())
                    {
                        me.__updating_scrubber = true;

                        //console.log ('changing scrubber value to ' + elapsed_seconds);

                        me.__s_scrubber.setValue (elapsed_seconds);
                        me.__updating_scrubber = false;
                    }

                    if (result.shuffled)
                    {
                        if (!me.__shuffled)
                        {
                            me.__btn_shuffle.setIcon ('qooxtunes/icon/16/shuffle-active.png');
                            me.__shuffled = true;
                        }
                    }
                    else
                    {
                        if (me.__shuffled)
                        {
                            me.__btn_shuffle.setIcon ('qooxtunes/icon/16/shuffle.png');
                            me.__shuffled = false;
                        }
                    }

                    // "off", "all", "one"
                    if (result.repeat == "all")
                    {
                        if (me.__repeat != "all")
                        {
                            me.__btn_repeat.setIcon ('qooxtunes/icon/16/loop-active-all.png');
                            me.__repeat = "all";
                        }
                    }
                    else if (result.repeat == "one")
                    {
                        if (me.__repeat != "one")
                        {
                            me.__btn_repeat.setIcon ('qooxtunes/icon/16/loop-active-one.png');
                            me.__repeat = "one";
                        }
                    }
                    else
                    {
                        if (me.__repeat != "off")
                        {
                            me.__btn_repeat.setIcon ('qooxtunes/icon/16/loop.png');
                            me.__repeat = "off";
                        }
                    }

                    me.reset_timer ();
                }
            );
        },

        update_player_item : function ()
        {
            if (this.__player_ids.length == 0)
            {
                this.__l_title.setValue ('');
                this.__l_artist.setValue ('');
                this.reset_timer ();
                return;
            }

            var me = this;
            var player_id = this.__player_ids[0].playerid;
            this._rpc.callAsync("Player.GetItem", [player_id],
                function (result) {
                    if (typeof result.item === 'undefined')
                    {
                        this.reset_timer ();
                        return;
                    }

                    var item = result.item;

                    if (item.type == 'song')
                    {
                        me.update_song_info (item.id);
                    }
                });
        },

        update_player : function ()
        {
            var me = this;
            this._rpc.callAsync("Player.GetActivePlayers", [],
                function (result) {
                    me.__player_ids = result;
                    me.update_player_item ();
                });
        },

        reset_timer : function ()
        {
            var me = this;

            setTimeout (function () {
                me.update_player ();
            }, 500);
        },

        build_label : function (value, size, bold)
        {
            var lb;

            lb = new qx.ui.basic.Label (value);

            if (typeof bold === "undefined")
            {
                bold = false;
            }

            var px_size = '16px';
            if (size == 'small')
            {
                px_size = '11px';
            }
            else if (size == 'medium')
            {
                px_size = '14px';
            }


            if (bold)
            {
                lb.setFont (qx.bom.Font.fromString(px_size + " sans-serif bold"));
            }
            else
            {
                lb.setFont (qx.bom.Font.fromString(px_size + " sans-serif"));
            }

            return lb;
        },


        enable_controls : function (enable)
        {
            this.__btn_back.setEnabled (enable);
            this.__btn_play.setEnabled (enable);
            this.__btn_forward.setEnabled (enable);
        },



        
        init : function ()
        {
            this._rpc = qooxtunes.io.remote.xbmc.getInstance ();

            this.setLayout(new qx.ui.layout.HBox(8));
            this.setHeight (76);

            this.__cl1 = new qx.ui.container.Composite (new qx.ui.layout.Canvas());
            this.__cl1.setWidth (232);

            this.__bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

            this.__btn_back = new qx.ui.form.Button(null, "qooxtunes/icon/24/backward.png");
            this.__btn_back.setDecorator (null);
            this.__btn_back.addListener("mousedown", function (e) { this.__btn_back.setIcon ("qooxtunes/icon/24/backward-dark.png"); }, this);
            this.__btn_back.addListener("mouseup", function (e) { this.__btn_back.setIcon ("qooxtunes/icon/24/backward.png"); }, this);
            this.__btn_back.addListener("execute", this.on_btn_back_execute, this);
            this.__bl1.add (this.__btn_back);

            this.__btn_play = new qx.ui.form.Button(null, "qooxtunes/icon/32/play.png");
            this.__btn_play.setDecorator (null);
            this.__btn_play.addListener("mousedown", function (e) {
                if (this.__btn_play.getIcon () == "qooxtunes/icon/32/play.png")
                {
                    this.__btn_play.setIcon ("qooxtunes/icon/32/play-dark.png")
                }
                else
                {
                    this.__btn_play.setIcon ("qooxtunes/icon/32/pause-dark.png")
                }
            }, this);
            this.__btn_play.addListener("mouseup", function (e) {
                if (this.__btn_play.getIcon () == "qooxtunes/icon/32/play-dark.png")
                {
                    this.__btn_play.setIcon ("qooxtunes/icon/32/play.png")
                }
                else
                {
                    this.__btn_play.setIcon ("qooxtunes/icon/32/pause.png")
                }
            }, this);
            this.__btn_play.addListener("execute", this.on_btn_play_execute, this);
            this.__bl1.add (this.__btn_play);

            this.__btn_forward = new qx.ui.form.Button(null, "qooxtunes/icon/24/forward.png");
            this.__btn_forward.setDecorator (null);
            this.__btn_forward.addListener("mousedown", function (e) { this.__btn_forward.setIcon ("qooxtunes/icon/24/forward-dark.png"); }, this);
            this.__btn_forward.addListener("mouseup", function (e) { this.__btn_forward.setIcon ("qooxtunes/icon/24/forward.png"); }, this);
            this.__btn_forward.addListener("execute", this.on_btn_forward_execute, this);
            this.__bl1.add (this.__btn_forward);

            // preload the alternate images so you don't get annoying flashes
            // the first time you click the buttons
            /* not working
            qx.io.ImageLoader.load ("qooxtunes/icon/24/backward-dark.png");
            qx.io.ImageLoader.load ("qooxtunes/icon/32/play-dark.png");
            qx.io.ImageLoader.load ("qooxtunes/icon/32/pause.png");
            qx.io.ImageLoader.load ("qooxtunes/icon/32/pause-dark.png");
            qx.io.ImageLoader.load ("qooxtunes/icon/24/forward-dark.png");
            */


            this.__cl1.add (this.__bl1, { top: 16, left: 32 });

            this.__cl2 = new qx.ui.container.Composite (new qx.ui.layout.Canvas());
            this.__cl2.setBackgroundColor ('#eee');
            this.__cl2.setDecorator ('rounded');

            this.__i_artwork = new qx.ui.basic.Image('qooxtunes/icon/64/music.png');
            this.__i_artwork.setDecorator (new qx.ui.decoration.Single (1, 'solid', '#000000'));
            this.__i_artwork.setScale(true);
            this.__i_artwork.setWidth(60);
            this.__i_artwork.setHeight(60);
            this.__cl2.add(this.__i_artwork, { left: 8, top: 8 });

            this.__l_title = this.build_label ('', 'medium', true);
            this.__l_title.setTextAlign ('center');
            this.__cl2.add (this.__l_title, { top: 8, left: 76, right: 8 });

            this.__l_artist = this.build_label ('', 'small', false);
            this.__l_artist.setTextAlign ('center');
            this.__cl2.add (this.__l_artist, { top: 26, left: 76, right: 8 });


            this.__btn_repeat = new qx.ui.form.Button(null, "qooxtunes/icon/16/loop.png");
            this.__btn_repeat.setDecorator (null);
            this.__btn_repeat.addListener("execute", this.on_btn_repeat_execute, this);
            this.__cl2.add (this.__btn_repeat, { top: 40, left: 76});

            this.__l_time = this.build_label ('', 'small', false);
            this.__l_time.setWidth (48);
            this.__cl2.add (this.__l_time, { top: 44, left: 112 });

            this.__cl2.addListener ('resize', function () {
                // hack -- really shouldn't access private members like this
                //this.__l_title.setWidth (this.__cl2.__computedLayout.width - 60 - 24 - 24);
                //this.__l_artist.setWidth (this.__cl2.__computedLayout.width - 60 - 24 - 24);
                var w = this.__cl2.getBounds().width - 76 - 8;
                this.__l_title.setWidth (w);
                this.__l_artist.setWidth (w);
            }, this);

            this.__s_scrubber = new qx.ui.form.Slider();
            this.__s_scrubber.setDecorator ('rounded_slider');
            this.__s_scrubber.setKnobFactor (0.001);
            this.__s_scrubber.setHeight (12);
            this.__s_scrubber.setBackgroundColor ('#ccc');
            this.__s_scrubber.addListener ('mousedown', this.on_s_scrubber_mousedown, this);
            this.__s_scrubber.addListener ('mouseup', this.on_s_scrubber_mouseup, this);
            this.__s_scrubber.addListener ('changeValue', this.on_s_scrubber_changeValue, this);
            this.__cl2.add (this.__s_scrubber, { top : 45, left : 168, right: 100 });

            this.__l_total_time = this.build_label ('', 'small', false);
            this.__l_total_time.setTextAlign ('right');
            this.__l_total_time.setWidth (48);
            this.__cl2.add (this.__l_total_time, { top: 44, right: 44 });

            this.__btn_shuffle = new qx.ui.form.Button(null, "qooxtunes/icon/16/shuffle.png");
            this.__btn_shuffle.setDecorator (null);
            this.__btn_shuffle.addListener("execute", this.on_btn_shuffle_execute, this);
            this.__cl2.add (this.__btn_shuffle, { top: 40, right: 8});

            this.__cl3 = new qx.ui.container.Composite (new qx.ui.layout.Canvas());
            this.__cl3.setWidth (232);

            this.add (this.__cl1);
            this.add (this.__cl2, { flex: 1 });
            this.add (this.__cl3);

            this.update_player ();
        }
    }

 });