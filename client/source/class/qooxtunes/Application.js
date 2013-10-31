/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */


/**
 * This is the main application class of your custom application "qooxtunes"
 *
 * @asset(qooxtunes/*)
 * @asset(qooxtunes/icon/16/*)
 * @asset(qooxtunes/icon/32/*)
 * @asset(qooxtunes/icon/64/*)
 * @asset(qx/icon/${qx.icontheme}/16/mimetypes/*)
 * @asset(qx/icon/${qx.icontheme}/22/mimetypes/*)
 * @asset(qx/icon/${qx.icontheme}/22/actions/*)
 * @asset(qx/icon/${qx.icontheme}/22/status/*)
 * @asset(qx/icon/${qx.icontheme}/32/mimetypes/*)
 * @asset(qx/icon/${qx.icontheme}/32/actions/*)
 * @asset(qx/icon/${qx.icontheme}/64/mimetypes/*)
 */
qx.Class.define("qooxtunes.Application",
{
  extend : qx.application.Standalone,



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * This method contains the initial application code and gets called 
     * during startup of the application
     * 
     * @lint ignoreDeprecated(alert)
     */
    main : function()
    {
      // Call super class
      this.base(arguments);

      // Enable logging in debug variant
      if (qx.core.Environment.get("qx.debug"))
      {
        // support native logging capabilities, e.g. Firebug for Firefox
        qx.log.appender.Native;
        // support additional cross-browser console. Press F7 to toggle visibility
        qx.log.appender.Console;
      }

      /*
      -------------------------------------------------------------------------
        Below is your actual application code...
      -------------------------------------------------------------------------
      */

      // here's how you force the locale...
      //qx.locale.Manager.getInstance().setLocale("es");

      this.pc_main = new qooxtunes.ui.ctl.playback_control ();
      this.getRoot().add (this.pc_main, { top: 8, left: 8, right: 8 });

      this.tv_main = new qooxtunes.ui.tabview.main ();
      this.getRoot().add (this.tv_main, { top: 92, left : 8, right: 8, bottom: 8 });
    },

    downloading : false,

    close : function ()
    {
        this.base (arguments);

        // downloading media files makes a call to window.location, which would normally
        // pop a warning, which would be confusing
        if (window.navigate_away)
        {
            window.navigate_away = false;
            return;
        }

        return "";
    }

  }
});
