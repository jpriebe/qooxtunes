/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("qooxtunes.theme.Decoration",
{
  extend : qx.theme.indigo.Decoration,

  decorations :
  {
      "rounded" : {
          include : "main",

          style : {
              radius : 5
          }
      },

      "rounded_slider" : {
          include : "main",

          style : {
              radius : 3
          }
      }
  }
});
