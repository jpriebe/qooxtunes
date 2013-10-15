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
 * A header cell widget that uses a menu to select the view instead of the
 * typical, but more difficult to use with multiple views, toggling effect.
 *
 * @appearance table-header-cell {qx.ui.basic.Atom}
 * @state hovered {table-header-cell}
 */
qx.Class.define("smart.headerrenderer.HeaderCellWithMenu",
{
  extend : qx.ui.table.headerrenderer.HeaderCell,
  
  construct : function()
  {
    this.base(arguments);
    
    // Show the view control
    this._showChildControl("menu-view-button");
    this.getLayout().setColumnFlex(2, 0);
  },

  members :
  {
    // overridden
    _createChildControlImpl : function(id)
    {
      var control;

      switch(id)
      {
        case "menu-view-button":
        control = new qx.ui.form.MenuButton("View", null);
        control.set(
          {
            anonymous    : true,
            iconPosition : "left",
            appearance   : ""
          });
          this._add(control, {row: 0, column: 2});
          break;
      }

      return control || this.base(arguments, id);
    }
  }
});
