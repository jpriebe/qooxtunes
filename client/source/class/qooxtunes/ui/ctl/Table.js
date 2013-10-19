qx.Class.define("qooxtunes.ui.ctl.Table",
{
    extend :  qx.ui.table.Table,

    construct : function (tableModel, custom)
    {
        this.base (arguments, tableModel, custom);
        this.set ( { showCellFocusIndicator: false } );
    },

    members : 
    {
        get_first_selected_index : function ()
        {
            var m = this.getSelectionModel ();
            var ranges = m.getSelectedRanges();

            if (ranges.length < 1)
            {
                return -1;
            }

            return ranges[0].minIndex;
        },


        get_selected_items : function ()
        {
            var m = this.getSelectionModel ();
            var ranges = m.getSelectedRanges();
                    
            var tm = this.getTableModel ();

            var xary = [];
            for (var i = 0; i < ranges.length; i++)
            {
                var range = ranges[i];

                for (var j = range.minIndex; j <= range.maxIndex; j++)
                {
                    var sel_item = tm.getRowData (j);
                    xary.push (sel_item);
                }
            }

            return xary;
        },

        get_selected_indices : function ()
        {
            var m = this.getSelectionModel ();
            var ranges = m.getSelectedRanges();
                    
            var xary = [];
            for (var i = 0; i < ranges.length; i++)
            {
                var range = ranges[i];

                for (var j = range.minIndex; j <= range.maxIndex; j++)
                {
                    xary.push (j);
                }
            }

            return xary;
        },

        clear_selection : function ()
        {
            var m = this.getSelectionModel ();
            m.resetSelection ();
        },

        set_selected_index : function (idx)
        {
            var m = this.getSelectionModel ();
            m.setSelectionInterval (idx, idx);
        },

        remove_selected_items : function ()
        {
            var m = this.getSelectionModel ();
            var ranges = m.getSelectedRanges();
                    
            var tm = this.getTableModel ();

            // work backward through the ranges so we don't mess
            // up the row indices as we delete them...
            for (var i = ranges.length - 1; i >= 0; i--)
            {
                var range = ranges[i];

                tm.removeRows (range.minIndex, range.maxIndex - range.minIndex + 1);
            }

            this.resetCellFocus();
        },

        set_column_width : function (idx, w)
        {
            var tcm = this.getTableColumnModel();
            var resize_behavior = tcm.getBehavior();
            resize_behavior.set (idx, {width: w});
        }
    }
});
