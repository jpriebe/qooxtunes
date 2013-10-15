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

#asset(smart/*)

************************************************************************ */

qx.Class.define("smart.addons.TreeWithViewMenu",
{
  extend : smart.addons.AbstractTree,
  
  construct : function(dm, custom)
  {
    this.base(arguments, dm, custom);
    
    // We want our own header renderer for each column
    var tcm = this.getTableColumnModel();
    var numColumns = dm.getColumnCount();
    for (var col = 0; col < numColumns; col++)
    {
      tcm.setHeaderCellRenderer(col, new smart.headerrenderer.MultiView());
    }
  },

  properties :
  {
    /** Whether to display view abbreviation in the header */
    showAbbreviations :
    {
      check : "Boolean",
      init  : true,
      apply : "_applyShowAbbreviations"
    }
  },

  members :
  {
    // overridden
    handleHeaderClick : function(col, clickEvent)
    {
      // Get the table colum model so we can retrieve the header cell widgets
      var tcm = this.getTableColumnModel();

      // Get the header cell renderer for this column
      var hcr = tcm.getHeaderCellRenderer(col);

      // Get the header cell widget for this column
      var widget = hcr.getWidget(col);
      
      // Simulate a press on the view button, if it's visible, but open the
      // menu near where the mouse was clicked.
      var menuButton = widget.getChildControl("menu-view-button");
      if (menuButton.isVisible())
      {
        var menu = menuButton.getMenu();
        menu.setOpener(widget);
        menu.openAtMouse(clickEvent);
      }
    },

    // overridden
    _createViewButtonMenu : function(col, widget)
    {
      // Get the view selection data
      var viewSelectionData = this.getViewSelection();

      // If there's no view selection, or none for this column...
      if (! viewSelectionData || ! viewSelectionData[col])
      {
        // ... then there's nothing to do yet
        widget._excludeChildControl("menu-view-button");
        return;
      }
      
      // Retrieve the view button widget
      var menuButton = widget._showChildControl("menu-view-button");

      // Arrange for showing, or not, the abbreviation in the header
      menuButton.setShow(this.getShowAbbreviations() ? "both" : "icon");
      
      // We don't want an empty abbreviation taking up space, though
      menuButton.getChildControl("label").setMinWidth(0);

      // Create a menu for this column's view selections
      var menu = new qx.ui.menu.Menu();

      // For each view to be available from this column...
      for (var i = 0; i < viewSelectionData[col].length; i++)
      {
        // ... create its menu
        var viewData = viewSelectionData[col][i];
        
        // Validate some input
        if (qx.core.Environment.get("qx.debug")) 
        {
          this.assertNumber(viewData.view);
          this.assertString(viewData.abbrev);
        }

        // Create the menu button
        var viewButton = 
          new qx.ui.menu.Button(viewData.caption, viewData.icon);

        // Save the viewData object in the view button's user data
        viewButton.setUserData("viewData", viewData);

        // Get called when this menu button is selected
        viewButton.addListener(
          "execute",
          function(e)
          {
            // Retrieve the saved view id
            var viewButton = e.getTarget();
            var viewData = viewButton.getUserData("viewData");
            
            // Use that view now.
            this.setViewAbbreviation(viewData.abbrev);
          },
          this);

        // Add the button to the menu
        menu.add(viewButton);
        
        // Add this view to the abbreviation map: maps to view id
        this.__viewAbbreviationMap[viewData.abbrev] = viewData;

        // Also keep track of the menu button corresponding to a column number
        this.__columnViewButtonMap[col] = menuButton;

        // Save the column number locally in this view data
        viewData.__col = col;
      }

      // Establish this new menu
      menuButton.resetEnabled();
      menuButton.setMenu(menu);
      
      // Switch to the selected view
      this._applyView(this.getViewAbbreviation());
    },


    // property apply method
    _applyView : function(value, old)
    {
      // Is the null view selected?
      if (value === null)
      {
        // Yup. Select the primal view
        this.getDataModel().setView(0);
      }

      // Retrieve view data from the abbreviations map, given the abbreviation
      var viewData = this.__viewAbbreviationMap[value];

      // Determine if we're displaying view abbreviations
      var bShowAbbreviations = this.getShowAbbreviations();

      // For each column...
      for (var col in this.__columnViewButtonMap)
      {
        // Retrieve the menu button for this column
        var menuButton = this.__columnViewButtonMap[col];
        
        // If this is the column containing the view being selected...
        if (viewData && col == viewData.__col)
        {
          // ... then set the menu button label and icon to the appropriate one
          menuButton.setLabel(bShowAbbreviations ? viewData.abbrev : null);
          menuButton.setIcon(viewData.icon);

          // Switch to this view
          this.getDataModel().setView(viewData.view);
        }
        else
        {
          // Otherwise, make the menu button invisible (but still active)
          menuButton.setLabel(null);
          menuButton.setIcon("smart/view-available.png");
        }
      }
    },

    // property apply method
    _applyViewSelection : function(value, old)
    {
      // If the view selection map is being removed...
      if (! value)
      {
        // ... then use an empty map
        value = { };
      }
      
      // (Re-)Create the view abbreviation map
      this.__viewAbbreviationMap = { };
      
      // Ditto for the column button map
      this.__columnViewButtonMap = { };
      
      // Get the table column model so we can retrieve the header cell widgets
      var tcm = this.getTableColumnModel();

      // For each column...
      for (var col in value)
      {
        // Convert the string col to integer column
        var column = col - 0;

        // Get the header cell renderer for this column
        var hcr = tcm.getHeaderCellRenderer(column);

        // If the header cell widget has not been created...
        var widget = hcr.getWidget(column);
        if (! widget)
        {
          // ... then we'll get called again when it is.
          return;
        }

        // Create the view selection button menu (of whatever type it is)
        this._createViewButtonMenu(col, widget);
      }
    },
    
    // property apply method
    _applyShowAbbreviations : function(value, old)
    {
      // For each column...
      for (var col in this.__columnViewButtonMap)
      {
        // Retrieve the menu button for this column
        var menuButton = this.__columnViewButtonMap[col];
        
        // Set visibility of the label according to requested value
        menuButton.setShow(value ? "both" : "icon");
      }      
    }
  }
});

