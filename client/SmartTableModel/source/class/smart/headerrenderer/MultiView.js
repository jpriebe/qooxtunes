/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      (c) 2010 by Arcode Corporation
      (c) 2010 by Derrell Lipman

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Derrell Lipman

************************************************************************ */

/**
 * A header cell renderer that allows view selection from a menu
 *
 * @appearance table-header-cell {qx.ui.basic.Atom}
 * @state hovered {table-header-cell}
 */
qx.Class.define("smart.headerrenderer.MultiView",
{
  extend : qx.ui.table.headerrenderer.Default,

  members :
  {
    __widget : null,

    /**
     * Get the header cell widget that contains the menu
     *
     * @param col {Integer}
     *   The column number for which the header cell widget is requested
     *
     * @return {smart.headerrenderer.HeaderCellWithMenu}
     */
    getWidget : function(col)
    {
      if (! this.__widget)
      {
        return null;
      }
      
      return this.__widget[col];
    },

    // overridden
    createHeaderCell : function(cellInfo)
    {
      // Instantiate the header cell which includes a menu
      var widget = new smart.headerrenderer.HeaderCellWithMenu();
      
      // Update it now, using the given cell information
      this.updateHeaderCell(cellInfo, widget);

      // Is this the first widget we've generated?
      if (! this.__widget)
      {
        // Yup. Create an array for holding the widgets
        this.__widget = [];
      }
      
      // Save this widget in association with its column
      this.__widget[cellInfo.col] = widget;
      
      // Create the view button menu for this column
      cellInfo.table._createViewButtonMenu(cellInfo.col, widget);

      return widget;
    },


    // overridden
    updateHeaderCell : function(cellInfo, cellWidget)
    {
      var This = this.self(arguments);

      // check for localization [BUG #2699]
      if (cellInfo.name && cellInfo.name.translate) {
        cellWidget.setLabel(cellInfo.name.translate());
      } else {
        cellWidget.setLabel(cellInfo.name);
      }

      // Set image tooltip if given
      var widgetToolTip = cellWidget.getToolTip();
      if (this.getToolTip() != null)
      {
        if (widgetToolTip == null)
        {
          // We have no tooltip yet -> Create one
          widgetToolTip = new qx.ui.tooltip.ToolTip(this.getToolTip());
          cellWidget.setToolTip(widgetToolTip);
          // Link disposer to cellwidget to prevent memory leak
          qx.util.DisposeUtil.disposeTriggeredBy(widgetToolTip, cellWidget);
        }
        else
        {
          // Update tooltip text
          widgetToolTip.setLabel(this.getToolTip());
        }
      }
    }
  }
});
