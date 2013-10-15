qx.Class.define("qooxtunes.ui.ctl.List",
{
    extend :  qx.ui.form.List,

    members : 
    {
        // we have a convention of adding a UserData field of
        // 'value' to each list item; this function will return 
        // this value for the selected listitem

        // only works for single select
        get_selected_value : function ()
        {
            var xary = this.getSelection ();
            if (xary.length != 1)
            {
                return null;
            }

            return xary[0].getUserData('value');
        },

        // works for single or multi select
        get_selected_values : function ()
        {
            var xary = this.getSelection ();
            var retval = [];

            for (var i = 0; i < xary.length; i++)
            {
                retval.push (xary[i].getUserData('value'));
            }

            return retval;
        },

        delete_selected_items : function ()
        {
            var xary = this.getSelection ();

            for (var i = 0; i < xary.length; i++)
            {
                this.remove (xary[i]);
            }
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
            // @todo - implement
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
