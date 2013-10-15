/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      (c) 2009-2010 by Arcode Corporation
      (c) 2010 by Derrell Lipman

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Derrell Lipman

************************************************************************ */

/*
 * An abstract smart table/tree. Subclasses can fill in the abstract
 * methods to provide a table/tree with various views and unique sorts.
 */
qx.Class.define("smart.addons.AbstractTree",
{
  extend : qx.ui.table.Table,
  type   : "abstract",
  
  // overridden
  construct : function(dm, custom)
  {
    if (! custom)
    {
      custom = {};
    }

    // Unless the user provides a special selection manager...
    if (! custom.selectionManager)
    {
      // ... use our own.
      custom.selectionManager =
        function(obj)
        {
          return new smart.selection.Manager(obj);
        };
    }
      
    // Unless the user provides a special row renderer...
    if (! custom.dataRowRenderer)
    {
      // ... use the one from TreeVirtual.
      custom.dataRowRenderer =
        new qx.ui.treevirtual.SimpleTreeDataRowRenderer();
    }
    
    // Call the superclass
    this.base(arguments, dm, custom);
    
    // Get the column model
    var columnModel = this.getTableColumnModel();
    
    // Get notified when the scroller wants to apply its normal sorting
    var scrollerArr = this._getPaneScrollerArr();
    for (var i = 0; i < scrollerArr.length; i++) 
    {
      scrollerArr[i].addListener("beforeSort", this.__onHeaderClick, this);
    }
  },

  properties :
  {
    /**
     * Whether a click on the open/close button should also cause selection of
     * the row.
     */
    openCloseClickSelectsRow :
    {
      check : "Boolean",
      init : false
    },
    
    /** The abbreviation of the view to be shown */
    viewAbbreviation :
    {
      check : "String",
      init  : null,
      apply : "_applyView"
    },

    /**
     * A map containing information on which columns show which view
     * selections.
     *
     * The map contains column numbers for keys.
     *
     * The value of each entry in the map is an array of maps, each
     * corresponding to a menu entry for selection of a view. These maps each
     * contain the following members: 'view' contains the view number; 'caption'
     * is what to display in the menu; 'icon' is the resolved path of an icon to
     * display, corresponding to that menu item selection.
     */
    viewSelection :
    {
      init : null,
      apply : "_applyViewSelection"
    }
  },

  members :
  {
    __viewAbbreviations : null,

    /**
     * Return the data model for this tree.
     *
     * @return {qx.ui.table.ITableModel} The data model.
     */
    getDataModel : function()
    {
      return this.getTableModel();
    },


    /**
     * Handle displaying (or not) a means of allowing the user to select a
     * view, when the header is clicked.
     *
     * @param col {Integer}
     *   The column number in which the header was clicked
     *
     * @param e {qx.event.type.Event}
     *   The header click event
     */
    handleHeaderClick : function(col, e)
    {
      throw new Error("handleHeaderClick is abstract");
    },


    /**
     * Create, in what ever way is appropriate to the selection widget being
     * used, the "menu" of views that may be selected from a particular
     * column.
     *
     * @param col {Integer}
     *   The column number
     *
     * @param widget {qx.ui.core.Widget}
     *   The widget that was instantiated by the header cell renderer to act
     *   as the user selection mechanism for the view to be used.
     */
    _createViewButtonMenu : function(col, widget)
    {
      throw new Error("_createViewButtonMenu is abstract");
    },


    // property apply method
    _applyView : function(value, old)
    {
      throw new Error("_applyView is abstract");
    },


    // property apply method
    _applyViewSelection : function(value, old)
    {
      throw new Error("_applyViewSelection is abstract");
    },


    /**
     * Event handler. Called when a key was pressed.
     *
     * We handle the Enter key to toggle opened/closed tree state.  All
     * other keydown events are passed to our superclass.
     *
     * @param evt {Map}
     *   The event.
     */
    _onKeyPress : function(evt)
    {
      var dm;

      if (! this.getEnabled())
      {
        return;
      }

      var identifier = evt.getKeyIdentifier();

      var consumed = false;
      var modifiers = evt.getModifiers();

      if (modifiers == 0)
      {
        switch(identifier)
        {
          case "Enter":
            // Get the data model
            dm = this.getDataModel();

            var focusedCol = this.getFocusedColumn();
            var treeCol = dm.getTreeColumn();

            if (focusedCol == treeCol)
            {
              // Get the focused node
              var focusedRow = this.getFocusedRow();
              var node = dm.getNode(focusedRow);

              if (! node.bHideOpenClose)
              {
                dm.setState(node, { bOpened : ! node.bOpened });
              }

              consumed = true;
            }
            break;

          case "Left":
            this.moveFocusedCell(-1, 0);
            break;

          case "Right":
            this.moveFocusedCell(1, 0);
            break;
        }
      }
      else if (modifiers == qx.event.type.Dom.CTRL_MASK)
      {
        switch(identifier)
        {
          case "Left":
            // Get the data model
            dm = this.getDataModel();

            // Get the focused node
            var focusedRow = this.getFocusedRow();
            var treeCol = dm.getTreeColumn();
            var node = dm.getNode(focusedRow);

            // If it's an open branch and open/close is allowed...
            if ((node.type == qx.ui.treevirtual.MTreePrimitive.BRANCH) &&
                ! node.bHideOpenClose &&
                node.bOpened)
            {
              // ... then close it
              dm.setState(node, { bOpened : ! node.bOpened });
            }

            // Reset the focus to the current node
            this.setFocusedCell(treeCol, focusedRow, true);

            consumed = true;
            break;

          case "Right":
            // Get the data model
            dm = this.getDataModel();

            // Get the focused node
            focusedRow = this.getFocusedRow();
            treeCol = dm.getTreeColumn();
            node = dm.getNode(focusedRow);

            // If it's a closed branch and open/close is allowed...
            if ((node.type == qx.ui.treevirtual.MTreePrimitive.BRANCH) &&
                ! node.bHideOpenClose &&
                ! node.bOpened)
            {
              // ... then open it
              dm.setState(node, { bOpened : ! node.bOpened });
            }

            // Reset the focus to the current node
            this.setFocusedCell(treeCol, focusedRow, true);

            consumed = true;
            break;
        }
      }
      else if (modifiers == qx.event.type.Dom.SHIFT_MASK)
      {
        switch(identifier)
        {
          case "Left":
            // Get the data model
            dm = this.getDataModel();

            // Get the focused node
            var focusedRow = this.getFocusedRow();
            var treeCol = dm.getTreeColumn();
            var node = dm.getNode(focusedRow);

            // If we're not at the top-level already...
            if (node.parentNodeId != 0)
            {
              // Find out what rendered row our parent node is at
              var rowIndex = dm.getRowFromNodeId(node.parentNodeId);

              // Set the focus to our parent
              this.setFocusedCell(this._focusedCol, rowIndex, true);
            }

            consumed = true;
            break;

          case "Right":
            // Get the data model
            dm = this.getDataModel();

            // Get the focused node
            focusedRow = this.getFocusedRow();
            treeCol = dm.getTreeColumn();
            node = dm.getNode(focusedRow);

            // If we're on a branch and open/close is allowed...
            if ((node.type == qx.ui.treevirtual.MTreePrimitive.BRANCH) &&
                ! node.bHideOpenClose)
            {
              // ... then first ensure the branch is open
              if (! node.bOpened)
              {
                dm.setState(node, { bOpened : ! node.bOpened });
              }

              // If this node has children...
              if (node.children.length > 0)
              {
                // ... then move the focus to the first child
                this.moveFocusedCell(0, 1);
              }
            }

            consumed = true;
            break;
        }
      }

      // Was this one of the events that we handle?
      if (consumed)
      {
        // Yup.  Don't propagate it.
        evt.preventDefault();
        evt.stopPropagation();
      }
      else
      {
        // It's not one of ours.  Let our superclass handle this event
        this.base(arguments, evt);
      }
    },
    
    /**
     * Event Handler. Called when the header is clicked. This is a private
     * method that simply ensures that the default action (sorting as a normal
     * table does) is prevented. It then calls the overridable method
     * handleHeaderClick() method.
     *
     * @param e {qx.event.type.Data}
     *   The data event. The data provided is an object containing a member
     *   'column' indicating in which colunn the header was clicked, and a
     *   member 'ascending' which is irrelevant in this tree. It also contains
     *   a 'clickEvent' member which contains the original event object for
     *   the click on the header.
     */
    __onHeaderClick : function(e)
    {
      var eventData = e.getData();
      this.handleHeaderClick(eventData.column, eventData.clickEvent);
      
      // Prevent the default "sort" action
      e.preventDefault();
    }    
  }
});

