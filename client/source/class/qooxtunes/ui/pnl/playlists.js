qx.Class.define("qooxtunes.ui.pnl.playlists",
{
    extend :  qx.ui.container.Composite,

    construct : function ()
    {
        this.base (arguments);
        this.init ();
    },

    events :
    {
        editPlaylist : 'qx.event.type.Data'
    },

    members : {

        __current_playlist : null,
        __current_folder : null,
        __current_tree_node : null,

        // get an array of all the path components leading to a node
        get_path_components : function (node)
        {
            var path_components = [];

            while (true)
            {
                if (node.getUserData ('relpath') != null)
                {
                    path_components.push (node.getUserData ('relpath'));
                }
                else if (node.getUserData ('fullpath') != null)
                {
                    path_components.push (node.getUserData ('fullpath'));
                    break;
                }

                node = node.getParent ();
                if (node == null)
                {
                    break;
                }
            }

            path_components.reverse ();
            return path_components;
        },

        on_t_playlists_changeSelection : function (e) {
            var selection = e.getData();

            if (selection.length != 1)
            {
                this.__b_add.setEnabled (false);
                this.__b_rename.setEnabled (false);
                this.__b_delete.setEnabled (false);
                this.__current_folder = null;
                this.__current_playlist = null;
                this.__current_tree_node = null;

                this.__lb_playlist.setValue ('');

                this.__t_playlist.clear ();
                return;
            }

            var obj_type = selection[0].getUserData('obj_type');

            this.__current_tree_node = selection[0];
            if (obj_type == 'playlist')
            {
                this.__current_folder = null;
                this.__current_playlist = {
                    name: selection[0].getLabel (),
                    path: this.get_path_components (selection[0])
                };

            }
            else if (obj_type == 'folder')
            {
                this.__current_playlist = null;
                this.__current_folder = {
                    name: selection[0].getLabel (),
                    path: this.get_path_components (selection[0])
                };
            }

            this.__b_rename.setEnabled (true);

            if (this.__current_tree_node.getChildren().length > 0)
            {
                this.__b_delete.setEnabled (false);
            }
            else
            {
                this.__b_delete.setEnabled (true);
            }

            if (this.__current_folder !== null)
            {
                this.__b_add.setEnabled (true);
                this.__lb_playlist.setValue ('');
                this.__t_playlist.clear ();
                this.__b_addto.setEnabled (false);
            }
            else
            {
                this.__b_add.setEnabled (false);
                this.__lb_playlist.setValue (this.__current_playlist.name);
                this.__t_playlist.load_playlist (this.__current_playlist);
                this.__b_addto.setEnabled (true);
            }
        },

        load_playlist_folder : function (tree, parent)
        {
            var keys = Object.keys (tree);
            keys.sort (  function(a, b) {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
            });

            var key = '';
            for (var i = 0; i < keys.length; i++)
            {
                key = keys[i];

                var obj = tree[key];
                if (typeof obj.children !== "undefined")
                {
                    // add a folder
                    var tf = new qx.ui.tree.TreeFolder(obj.name);
                    tf.setUserData ('obj_type', 'folder');
                    if (typeof obj.relpath !== 'undefined')
                    {
                        tf.setUserData ('relpath', obj.relpath);
                    }
                    if (typeof obj.fullpath !== 'undefined')
                    {
                        tf.setUserData ('fullpath', obj.fullpath);
                    }
                    tf.setOpen (true);

                    parent.add (tf);

                    this.load_playlist_folder (obj.children, tf);
                }
                else
                {
                    // add a playlist
                    var tf = new qx.ui.tree.TreeFile(obj.name);
                    tf.setUserData ('obj_type', 'playlist');
                    if (typeof obj.relpath !== 'undefined')
                    {
                        tf.setUserData ('relpath', obj.relpath);
                    }
                    parent.add (tf);
                }
            }
        },

        load_playlists : function (playlists)
        {
            //this.__t_playlists.removeAll ();
            var root = new qx.ui.tree.TreeFolder (this.tr ('Playlists'));
            root.setOpen (true);
            this.__t_playlists.setRoot (root);

            this.load_playlist_folder (playlists, root);
        },

        get_playlists : function ()
        {
            var rpc_ext = qooxtunes.io.remote.xbmc_ext.getInstance ();

            var me = this;

            qooxtunes.ui.dlg.wait_popup.show (this.tr ("Loading playlists..."));
            rpc_ext.callAsync("get_playlists", ['music'],
                function (result, exc) {
                    me.load_playlists (result);
                    qooxtunes.ui.dlg.wait_popup.hide ();
                }
            );
        },

        clear_table_selection : function ()
        {
            this.__t_playlist.resetSelection ();
        },

        on_appear : function (e)
        {
            this.get_playlists ();
            this.__lb_playlist.setValue ('');
            this.__t_playlist.clear ();
        },

        on_b_addto_execute : function (e)
        {
            this.fireDataEvent ('editPlaylist', this.__current_playlist);
        },

        on_b_add_folder_execute : function (e)
        {
            this.add_folder ();
        },

        add_folder : function ()
        {
            var me = this;
            qooxtunes.ui.dlg.text_prompt.go (this.tr ("Enter the name of the new folder:"), '', null, function (folder_name) {

                if (!folder_name.match (/\w/))
                {
                    qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                        this.tr ("Folder name must contain one or more characters."));
                    return;
                }

                var path_components = [];
                for (var i = 0; i < me.__current_folder.path.length; i++)
                {
                    path_components.push (me.__current_folder.path[i]);
                }

                // this will get url-escaped and converted to a filename
                path_components.push (folder_name);

                var rpc = qooxtunes.io.remote.xbmc_ext.getInstance ();

                rpc.callAsync ('create_playlist_folder',
                    [ 'music', { name: folder_name, path: path_components } ],
                    function (result, exc) {
                        if (!result)
                        {
                            qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                                this.tr ("Could not create folder."));
                            return;
                        }

                        // result contains the actual filename used on the server
                        var t = new qx.ui.tree.TreeFolder(folder_name);
                        t.setUserData ('obj_type', 'folder');
                        t.setUserData ('relpath', result);
                        me.__current_tree_node.add (t);

                        me.__t_playlists.setSelection ([t]);
                    });
            });
        },

        on_b_add_playlist_execute : function (e)
        {
            this.add_playlist ();
        },

        add_playlist : function ()
        {
            var me = this;
            qooxtunes.ui.dlg.text_prompt.go (this.tr ("Enter the name of the new playlist:"), '', null, function (playlist_name) {

                var filename = playlist_name;
                if (!filename.match (/\w/))
                {
                    qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                        this.tr ("Playlist name must contain one or more characters."));
                    return;
                }
                filename += '.m3u';

                var path_components = [];
                for (var i = 0; i < me.__current_folder.path.length; i++)
                {
                    path_components.push (me.__current_folder.path[i]);
                }

                path_components.push (filename);

                var rpc = qooxtunes.io.remote.xbmc_ext.getInstance ();

                rpc.callAsync ('create_playlist',
                    [ 'music', { name: playlist_name, path: path_components } ],
                    function (result, exc) {
                        if (!result)
                        {
                            qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                                this.tr ("Could not save playlist."));
                            return;
                        }

                        // result contains the actual filename used on the server
                        var t = new qx.ui.tree.TreeFile(playlist_name);
                        t.setUserData ('obj_type', 'playlist');
                        t.setUserData ('relpath', result);
                        me.__current_tree_node.add (t);

                        me.__t_playlists.setSelection ([t]);
                    });
            });
        },

        on_b_rename_execute : function (e)
        {
            this.rename_playlist_or_folder ();
        },

        rename_playlist_or_folder : function ()
        {
            var name = '';
            var typestr = '';
            var path = null;
            var method = '';

            if (this.__current_playlist !== null)
            {
                name = this.__current_playlist.name;
                path = this.__current_playlist.path;
                typestr = 'playlist';
            }
            if (this.__current_folder !== null)
            {
                name = this.__current_folder.name;
                path = this.__current_folder.path;
                typestr = 'folder';
            }

            var me = this;
            
            qooxtunes.ui.dlg.text_prompt.go (
                this.tr ("Enter the new name of the %1:", typestr), name, null, function (obj_name) {

                var filename = obj_name;

                if (!filename.match (/\w/))
                {
                    qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                        this.tr ("Playlist name must contain one or more characters."));
                    return;
                }

                if (typestr == 'playlist')
                {
                    filename += '.m3u';
                }

                var old_path_components = [];
                var new_path_components = [];
                for (var i = 0; i < path.length; i++)
                {
                    old_path_components.push (path[i]);
                    new_path_components.push (path[i]);
                }

                new_path_components[new_path_components.length - 1] = filename;

                var rpc = qooxtunes.io.remote.xbmc_ext.getInstance ();

                rpc.callAsync ('rename_playlist_or_folder',
                    [ 'music', old_path_components, new_path_components ],
                    function (result, exc) {
                        if (!result)
                        {
                            qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                                this.tr ("Could not rename %1.", typestr));
                            return;
                        }

                        // result contains the actual filename used on the server
                        me.__current_tree_node.setLabel (obj_name);
                        me.__current_tree_node.setUserData ('relpath', result);

                        if (typestr == 'playlist')
                        {
                            me.__current_folder = null;
                            me.__current_playlist = {
                                name: me.__current_tree_node.getLabel (),
                                path: me.get_path_components (me.__current_tree_node)
                            };

                        }
                        else if (typestr == 'folder')
                        {
                            me.__current_folder = {
                                name: me.__current_tree_node.getLabel (),
                                path: me.get_path_components (me.__current_tree_node)
                            };
                        }
                    });
            });
        },

        on_b_delete_execute : function (e)
        {
            this.delete_playlist_or_folder ();
        },

        delete_playlist_or_folder : function ()
        {
            var name = '';
            var typestr = '';
            var path = null;
            var method = '';

            if (this.__current_playlist !== null)
            {
                name = this.__current_playlist.name;
                path = this.__current_playlist.path;
                typestr = 'playlist';
                method = 'delete_playlist';
            }
            if (this.__current_folder !== null)
            {
                name = this.__current_folder.name;
                path = this.__current_folder.path;
                typestr = 'folder';
                method = 'delete_folder';
            }

            var me = this;

            qooxtunes.ui.dlg.yes_no.go (this.tr ("Delete %1 \"%2\".  Are you sure?", typestr, name), function () {
                var rpc_ext = qooxtunes.io.remote.xbmc_ext.getInstance ();

                var path_components = [];
                for (var i = 0; i < path.length; i++)
                {
                    path_components.push (path[i]);
                }

                rpc_ext.callAsync(method, ['music', path_components],
                    function (result, exc) {
                        if (!result)
                        {
                            qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                                this.tr ("Could not delete %1.", typestr));
                            return;
                        }

                        me.__current_tree_node.getParent ().remove (me.__current_tree_node);
                    });
            });
        },

        get_tree_folder : function (instance) {
            if (instance == null) {
                return null;
            }

            if (instance.classname === "qx.ui.tree.TreeFolder") {
                return instance;
            } else {
                return this.get_tree_folder(instance.getLayoutParent());
            }
        },

        init_drag_and_drop : function ()
        {
            this.__t_playlists.setDraggable(true);
            this.__t_playlists.setDroppable(true);

            this.__t_playlists.addListener("dragstart", function(e) {
                e.addAction("move");
                e.addType("qx/tree-items");
            });

            this.__t_playlists.addListener("droprequest", function(e)
            {
                var type = e.getCurrentType();
                var treeFolder = this.getSelection();
                e.addData(type, treeFolder);
            });

            this.__t_playlists.addListener("dragend", function(e)
            {
                this.setDomPosition(-1000, -1000);
            }, this.__drag_indicator);

            this.__t_playlists.addListener("drag", function(e)
            {
                var orig = e.getOriginalTarget();

                if (!qx.ui.core.Widget.contains( this.__t_playlists, orig)) {
                    return;
                }

                var tf = this.get_tree_folder(orig);
                if (!tf) {
                    return;
                }

                var orig_coords = tf.getContainerLocation();
                this.__drag_indicator.setWidth(tf.getBounds().width);
                this.__drag_indicator.setDomPosition(orig_coords.left, orig_coords.top);
            }, this);

            this.__t_playlists.addListener("dragover", function(e)
            {
                if (e.getRelatedTarget()) {
                    e.preventDefault();
                }
            });

            this.__t_playlists.addListener("drop", function(e)
            {
                var orig = e.getOriginalTarget();

                var tf_target = this.get_tree_folder(orig);
                var tf_source = e.getData("qx/tree-items")[0];

                if (!tf_target) {
                    return;
                }

                if (tf_source !== tf_target.getParent()) {
                    var path_source = this.get_path_components (tf_source);
                    var path_target = this.get_path_components (tf_target);

                    var old_path_components = [];
                    var new_path_components = [];
                    for (var i = 0; i < path_source.length; i++)
                    {
                        old_path_components.push (path_source[i]);
                    }
                    for (var i = 0; i < path_target.length; i++)
                    {
                        new_path_components.push (path_target[i]);
                    }
                    new_path_components.push (path_source[path_source.length - 1]);

                    // now rename the object
                    var rpc = qooxtunes.io.remote.xbmc_ext.getInstance ();
                    rpc.callAsync ('rename_playlist_or_folder',
                        [ 'music', old_path_components, new_path_components ],
                        function (result, exc) {
                            if (!result)
                            {
                                qooxtunes.ui.dlg.msgbox.go (this.tr ("Error"),
                                    this.tr ("Could not move %1.", path_source[path_source.length - 1]));
                                return;
                            }

                            tf_source.getParent().remove (tf_source);
                            tf_target.add (tf_source);
                        });

                }
            }, this);
        },

        init : function ()
        {
            this.setLayout(new qx.ui.layout.Canvas());
            var pane = new qx.ui.splitpane.Pane("horizontal");

            this.__spc_playlists = new qx.ui.container.Composite(new qx.ui.layout.Canvas ()).set({
                width : 200,
                height: 100,
                decorator : "main"
            });

            this.__t_playlists = new qx.ui.tree.Tree ();
            this.__t_playlists.addListener ('changeSelection', this.on_t_playlists_changeSelection, this);
            this.__spc_playlists.add (this.__t_playlists, { top: 0, left: 0, right: 0, bottom: 48 });

            // not working...
            // qx.io.ImageLoader.load ("qooxtunes/icon/16/folder-close-alt.png");

            this.__drag_indicator = new qx.ui.core.Widget;
            this.__drag_indicator.setDecorator(new qx.ui.decoration.Single().set({
                top : [ 1, "solid", "#33508D" ]}));

            this.__drag_indicator.setHeight(0);
            this.__drag_indicator.setOpacity(0.5);
            this.__drag_indicator.setLayoutProperties({left: -1000, top: -1000});
            qx.core.Init.getApplication().getRoot().add(this.__drag_indicator);

            this.init_drag_and_drop ();

            var bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'left'));
            bl1.setHeight (32);

            var add_menu = new qx.ui.menu.Menu ();

            var b_add_playlist = new qx.ui.menu.Button(this.tr ("Playlist"));
            var b_add_folder = new qx.ui.menu.Button(this.tr ("Folder"));

            b_add_playlist.addListener("execute", this.on_b_add_playlist_execute, this);
            b_add_folder.addListener("execute", this.on_b_add_folder_execute, this);

            add_menu.add(b_add_playlist);
            add_menu.add(b_add_folder);

            this.__b_add = new qx.ui.form.MenuButton (null, 'icon/22/actions/list-add.png');
            this.__b_add.set ({enabled: false, width: 32, height: 32, padding: 0,
                toolTip: new qx.ui.tooltip.ToolTip (this.tr ("Add new playlist or folder"))});
            this.__b_add.setMenu (add_menu);
            //this.__b_add.addListener ('execute', this.on_b_add_execute, this);
            bl1.add (this.__b_add);

            this.__b_rename = new qx.ui.form.Button (null, 'icon/22/actions/document-properties.png');
            this.__b_rename.set ({enabled: false, width: 32, height: 32, padding: 0,
                toolTip: new qx.ui.tooltip.ToolTip (this.tr ("Edit name of selected playlist or folder"))});
            this.__b_rename.addListener ('execute', this.on_b_rename_execute, this);
            bl1.add (this.__b_rename);

            this.__b_delete = new qx.ui.form.Button (null, 'icon/22/actions/edit-delete.png');
            this.__b_delete.set ({enabled: false, width: 32, height: 32, padding: 0,
                toolTip: new qx.ui.tooltip.ToolTip (this.tr ("Delete selected playlist or folder"))});
            this.__b_delete.addListener ('execute', this.on_b_delete_execute, this);
            bl1.add (this.__b_delete);

            this.__spc_playlists.add (bl1, { left: 8, right: 8, bottom: 8 });

            this.__spc_playlist = new qx.ui.container.Composite(new qx.ui.layout.VBox()).set({
                decorator : "main"
            });

            this.__tb_playlist = new qx.ui.toolbar.ToolBar();

            this.__lb_playlist = new qx.ui.basic.Label ('');
            this.__lb_playlist.setFont (new qx.bom.Font(24,['Tahoma', 'Lucida Sans Unicode', 'sans-serif']));
            this.__lb_playlist.setAlignY("middle");
            this.__lb_playlist.setMarginLeft (4);
            this.__tb_playlist.add (this.__lb_playlist, { flex: 1 });

            this.__tb_playlist.addSpacer();

            var p1 = new qx.ui.toolbar.Part();
            this.__b_addto = new qx.ui.toolbar.Button(this.tr ("Add to..."));
            this.__b_addto.setEnabled (false);
            this.__b_addto.addListener ('execute', this.on_b_addto_execute, this);

            p1.add (this.__b_addto);
            this.__tb_playlist.add (p1);
            this.__spc_playlist.add(this.__tb_playlist);

            this.__t_playlist = new qooxtunes.ui.ctl.table.songs (true);
            this.__spc_playlist.add (this.__t_playlist, { flex : 1 });

            pane.add (this.__spc_playlists, 0);
            pane.add (this.__spc_playlist, 1);

            this.add (pane, { edge: 8 });

            this.addListener ('appear', this.on_appear, this);
        }
    }

});

