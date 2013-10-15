/*
 * a modified select box that does a few things:
 *   - exposes add_item(label, value) to simulate the old
 *     ListItem that had an associated value; stores the value
 *     in a UserData key of 'value'
 *   - provides get_selected_value() and set_selected_value() to
 *     conveniently get the value of the selected item and to
 *     set the selection to the item with a particular value
 */
qx.Class.define("qooxtunes.ui.ctl.SelectBox",
    {
        extend :  qx.ui.form.SelectBox,

        members :
        {
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
