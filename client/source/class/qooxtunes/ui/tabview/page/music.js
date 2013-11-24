qx.Class.define("qooxtunes.ui.tabview.page.music",
{
    extend :  qx.ui.tabview.Page,

    construct : function ()
    {
        this.base (arguments, this.tr ("Music"), "qooxtunes/icon/16/music.png");
        this.init ();
    },

    members : {
        __filter_timeout : null,

        __search_field : null,

        on_table_searchChanged : function (e)
        {
            this.__tf_search.setValue (e.getData());
            this.do_search ();
        },

        do_search : function ()
        {
            var search_value = this.__tf_search.getValue ().trim ();

            var matches;

            var t = this.__p_library.get_table ();
            if ((matches = search_value.match (/artist\s*=(.+)/)) != null)
            {
                t.search ('^' + matches[1].trim () + '$', 'artist', true);
                return;
            }
            if ((matches = search_value.match (/album\s*=(.+)/)) != null)
            {
                t.search ('^' + matches[1].trim () + '$', 'album', true);
                return;
            }
            if ((matches = search_value.match (/title\s*=(.+)/)) != null)
            {
                t.search ('^' + matches[1].trim () + '$', 'title', true);
                return;
            }

            t.search (search_value, this.__search_field);
        },

        on_tf_search_input : function (e)
        {
            if (this.__filter_timeout != null)
            {
                clearTimeout (this.__filter_timeout);
            }

            var me = this;
            this.__filter_timeout = setTimeout (function () {
                    me.do_search ();
                }, 300);
        },


        on_rbg_main_changeSelection : function (e)
        {
            var selectedButton = e.getData()[0];

            var option = selectedButton.getUserData('option');

            if (option == 'library')
            {
                this.__p_library.show ();
                this.__tf_search.show ();
                this.__mb_search.show ();
                this.__p_playlists.hide ();
                this.__p_playlists.clear_table_selection ();
            }
            else
            {
                this.__p_playlists.show ();
                this.__tf_search.hide ();
                this.__mb_search.hide ();
                this.__p_library.hide ();
                this.__p_library.clear_table_selection ();
            }
        },

        on_p_playlists_editPlaylist : function (e)
        {
            // flip to the library tab
            this.__rbg_main.setSelection ([ this.__rb_library ]);
            this.__p_library.edit_playlist (e.getData ());
        },

        on_p_playlists_doneEditingPlaylist : function (e)
        {
            // flip to the playlist tab
            this.__rbg_main.setSelection ([ this.__rb_playlists ]);
        },

        __enforcing_search_mutex : false,

        on_m_search_changeValue : function (e)
        {
            if (this.__enforcing_search_mutex)
            {
                return;
            }

            this.__enforcing_search_mutex = true;

            var t = e.getTarget();

            if (t.getValue ())
            {
                this.__search_field = t.getUserData ('search_field');

                var children = this.__m_search.getChildren();
                for (var i = 0; i < children.length; i++)
                {
                    var c = children[i];
                    if (c == t)
                    {
                        continue;
                    }
                    if (typeof c.setValue !== 'undefined')
                    {
                        c.setValue (false);
                    }
                }
            }
            else
            {
                t.setValue (true);
            }

            var search_value = this.__tf_search.getValue ().trim ();
            var t = this.__p_library.get_table ();
            t.search (search_value, this.__search_field);

            this.__enforcing_search_mutex = false;
        },

        init : function ()
        {
            this.setLayout(new qx.ui.layout.VBox());


            this.__tb_main = new qx.ui.toolbar.ToolBar();
            this.__tb_main.setSpacing(5);

            var p1 = new qx.ui.toolbar.Part();
            this.__rb_library = new qx.ui.toolbar.RadioButton(this.tr ("Library"));
            this.__rb_library.setUserData ('option', 'library');

            this.__rb_playlists = new qx.ui.toolbar.RadioButton(this.tr ("Playlists"));
            this.__rb_playlists.setUserData ('option', 'playlists');

            p1.add(this.__rb_library);
            p1.add(this.__rb_playlists);
            this.__tb_main.add(p1);
            this.__tb_main.addSpacer ();

            this.__rbg_main = new qx.ui.form.RadioGroup(this.__rb_library, this.__rb_playlists);
            this.__rbg_main.addListener ('changeSelection', this.on_rbg_main_changeSelection, this);


            this.__tf_search = new qx.ui.form.TextField ();
            this.__tf_search.setValue ('');
            this.__tf_search.setWidth (200);
            this.__tf_search.addListener ('input', this.on_tf_search_input, this);
            this.__tf_search.setAlignY ("middle");
            this.__tf_search.setMarginRight (8);
            this.__tb_main.add (this.__tf_search);

            this.__m_search = new qx.ui.menu.Menu ();

            var b = new qx.ui.menu.Button(this.tr ("Search by"));
            this.__m_search.add (b);

            this.__b_search_all = new qx.ui.menu.CheckBox(this.trc ("search by all fields", "All"));
            this.__b_search_all.setUserData ('search_field', null);
            this.__b_search_all.addListener ('click', this.on_m_search_changeValue, this);
            this.__b_search_all.setValue (true);
            this.__m_search.add (this.__b_search_all);

            this.__b_search_title = new qx.ui.menu.CheckBox(this.trc ("search by title", "Title"));
            this.__b_search_title.setUserData ('search_field', 'title');
            this.__b_search_title.addListener ('click', this.on_m_search_changeValue, this);
            this.__m_search.add (this.__b_search_title);

            this.__b_search_artist = new qx.ui.menu.CheckBox(this.trc ("search by artist", "Artist"));
            this.__b_search_artist.setUserData ('search_field', 'artist');
            this.__b_search_artist.addListener ('click', this.on_m_search_changeValue, this);
            this.__m_search.add (this.__b_search_artist);

            this.__b_search_album = new qx.ui.menu.CheckBox(this.trc ("search by album", "Album"));
            this.__b_search_album.setUserData ('search_field', 'album');
            this.__b_search_album.addListener ('click', this.on_m_search_changeValue, this);
            this.__m_search.add (this.__b_search_album);

            this.__b_search_genre = new qx.ui.menu.CheckBox(this.trc ("search by genre", "Genre"));
            this.__b_search_genre.setUserData ('search_field', 'genre');
            this.__b_search_genre.addListener ('click', this.on_m_search_changeValue, this);
            this.__m_search.add (this.__b_search_genre);

            this.__b_search_comment = new qx.ui.menu.CheckBox(this.trc ("search by comments", "Comments"));
            this.__b_search_comment.setUserData ('search_field', 'comment');
            this.__b_search_comment.addListener ('click', this.on_m_search_changeValue, this);
            this.__m_search.add (this.__b_search_comment);

            this.__mb_search = new qx.ui.toolbar.MenuButton("", "icon/22/actions/system-search.png" );
            this.__mb_search.setMenu(this.__m_search);

            this.__tb_main.add (this.__mb_search);

            this.add(this.__tb_main);

            var c = new qx.ui.container.Composite (new qx.ui.layout.Canvas ());

            this.__p_library = new qooxtunes.ui.pnl.music_library ();
            this.__p_library.addListener ('doneEditingPlaylist', this.on_p_playlists_doneEditingPlaylist, this);

            this.__p_library.get_table ().addListener ('searchChanged', this.on_table_searchChanged, this);

            c.add (this.__p_library, { edge: 0 });

            this.__p_playlists = new qooxtunes.ui.pnl.playlists ();
            this.__p_playlists.setVisibility ('hidden');
            this.__p_playlists.addListener ('editPlaylist', this.on_p_playlists_editPlaylist, this);

            c.add (this.__p_playlists, { edge: 0 });

            this.add (c, {flex: 1});
        }
    }

});

