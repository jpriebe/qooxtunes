/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
      (c) 2010 by Derrell Lipman
      (c) 2010 by Arcode Corporation

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Derrell Lipman

#require(qx.log.Logger)

************************************************************************ */

/*
 * A data cell renderer for the tree column of a smart tree, which can have
 * header rows that preclude display of any column following the one in which
 * this cell renderer is used.
 *
 * The tree-structure data is obtained not from the column in the row array,
 * but instead from a member object of the row array, called nodeArr. Each
 * element of that array is a Node object as described in the documentation
 * for {#qx.ui.treevirtual.SimpleTreeDataModel}, with the addition of a
 * <i>bHeader</i> member that tells the cell renderer to disallow display of
 * any following rows.
 */
qx.Class.define("smart.demo.cellrenderer.TreeWithHeaderRows",
{
  extend : qx.ui.treevirtual.SimpleTreeDataCellRenderer,
  
  construct : function()
  {
    // Call our superclass
    this.base(arguments);

    // In addition to the simple tree cell renderer, we also need a default
    // cell renderer.
    this.__defaultCellRenderer = new qx.ui.table.cellrenderer.Default();
  },

  properties :
  {
    headerStyle :
    {
      check : "String",
      init  : "background-color:darkgray;color:white;font-weight:bold;"
    }
  },

  members :
  {
    createDataCellHtml : function(cellInfo, htmlArr)
    {
      // Get the node array object that's been attached to the row data
      var nodeArr = cellInfo.table.getTableModel().getRowArray().nodeArr;
      
      // If there's no node array for this view, use the default cell renderer.
      if (! nodeArr)
      {
        this.__defaultCellRenderer.createDataCellHtml(cellInfo, htmlArr);
        return false;           // allow further cells in row to be rendered
      }

      // Obtain the node data for this cell
      var node = nodeArr[cellInfo.row];
      
      // Save the value parameter in cellInfo and temporarily replace it with
      // the node object.
      var savedValue = cellInfo.value;
      cellInfo.value = node;
      
      // Add the div for this cell. If it's a header row, extend it to the
      // right border.
      htmlArr.push(
        '<div class="',
        this._getCellClass(cellInfo),
        '" style="',
        'left:', cellInfo.styleLeft, 'px;',
        this._getCellSizeStyle(cellInfo.styleWidth,
                               cellInfo.styleHeight,
                               this._insetX,
                               this._insetY),
        this._getCellStyle(cellInfo),
        (node.__bHeader
         ? 'border-right:0px;width:100%;' + this.getHeaderStyle() 
         : ''),
        '" ',
        this._getCellAttributes(cellInfo),
        '>' +
        this._getContentHtml(cellInfo),
        '</div>'
      );

      // Restore the saved value
      cellInfo.value = savedValue;

      // If this is a header cell, prevent rendering additional cells in this
      // row.
      return node.__bHeader;
    }
  }
});
