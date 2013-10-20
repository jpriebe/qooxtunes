/*
 * a modified combo box that does a few things:
 *   - adds auto complete
 *   - exposes add_item(label, value) to simulate the old
 *     ListItem that had an associated value; stores the value
 *     in a UserData key of 'value'
 *   - provides get_selected_value() and set_selected_value() to
 *     conveniently get the value of the selected item and to
 *     set the selection to the item with a particular value
 */
qx.Class.define("qooxtunes.ui.ctl.ComboBox",
    {
        extend :  qx.ui.form.ComboBox,

        construct : function ()
        {
            this.base (arguments);

            //this.__childControls.textfield.addListener ('input', this.auto_complete, this);
            this.getChildControl ('textfield').addListener ('input', this.auto_complete, this);
        },

        members :
        {
            auto_complete : function (e)
            {
                var typed_val = this.getChildControl ('textfield').getValue ().toLowerCase ();
                var n_typed_chars = typed_val.length;

                var xary = this.getChildren();
                for (var i = 0; i < xary.length; i++)
                {
                    var l = xary[i].getLabel ();
                    var test_str = l.substr (0, n_typed_chars).toLowerCase ();

                    if (test_str == typed_val)
                    {
                        this.getChildControl ('textfield').setValue (l);
                        this.setTextSelection (n_typed_chars);
                        break;
                    }
                }
            },


            // we have a convention of adding a UserData field of
            // 'value' to each list item; this function will return 
            // this value for the selected listitem
            get_selected_value : function ()
            {
                var xary = this.getSelection ();
                if (xary.length != 1)
                {
                    return null;
                }

                return xary[0].getUserData('value');
            },

            get_selected_label : function ()
            {
                var xary = this.getSelection ();
                if (xary.length != 1)
                {
                    return '';
                }

                return xary[0].getLabel ();
            },

            set_selected_value : function (val)
            {
                var xary = this.getChildren();
                for (var i = 0; i < xary.length; i++)
                {
                    var item = xary[i];
                    if (item.getUserData('value') == val)
                    {
                        this.setSelection ([item]);
                        return;
                    }
                }
            },

            // adds an item with a label and a value; the value is
            // automatically added as user data
            add_item : function (label, val, icon)
            {
                var li = new qx.ui.form.ListItem (label, icon);
                li.setUserData ('value', val);
                this.add (li);

                return li;
            }
        }
    });
