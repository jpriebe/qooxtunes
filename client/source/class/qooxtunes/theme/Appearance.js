/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("qooxtunes.theme.Appearance",
{
  extend : qx.theme.indigo.Appearance,

  appearances :
  {
      "tree-folder" :
      {
          style : function(states)
          {
              var backgroundColor;
              if (states.selected) {
                  backgroundColor = "background-selected";
                  if (states.disabled) {
                      backgroundColor += "-disabled";
                  }
              }
              return {
                  padding : [2, 8, 2, 5],
                  icon : states.opened ? "qooxtunes/icon/16/folder-open-alt.png" : "qooxtunes/icon/16/folder-close-alt.png",
                  backgroundColor : backgroundColor,
                  iconOpened : "qooxtunes/icon/16/folder-open-alt.png"
              };
          }
      },

      "tree-folder/icon" :
      {
          include : "image",
          style : function(states)
          {
              return {
                  padding : [0, 4, 0, 0]
              };
          }
      },

      "tree-folder/label" :
      {
          style : function(states)
          {
              return {
                  padding : [ 1, 2 ],
                  textColor : states.selected && !states.disabled ? "text-selected" : undefined
              };
          }
      },

      "tree-file" :
      {
          include : "tree-folder",
          alias : "tree-folder",

          style : function(states)
          {
              return {
                  icon : "qooxtunes/icon/16/list-ul.png"
              };
          }
      }

  }
});
