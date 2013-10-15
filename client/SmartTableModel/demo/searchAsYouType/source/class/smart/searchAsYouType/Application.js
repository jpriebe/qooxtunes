/* ************************************************************************
   
   Copyright: Fritz Zaucker
   
   License: LGPL and EPL
   
   Authors: Fritz Zaucker <fritz.zaucker@oetiker.ch>
   
   ************************************************************************ */

/**
 * Search as you type filter implementation with SmartTableModel
 */
qx.Class.define("smart.searchAsYouType.Application",
{
  extend : qx.application.Standalone,
                    
    members :
  {
    table:                null,
    views:                null,

    // initial value for SearchAsYouType filter (don't filter)
    __searchFilter:       '',
    __searchTimer:        null,
      
    // timeout after which SearchAsYouType view is updated
    __searchTimeout: 250,
      
    // Define our columns. 
    // Each column name maps to its position in the table.
    columns:
    {
      "Col0":    0,
      "Name":    1,
      "Col2":    2
    },  

    // filter column for SearchAsYouType (numeric for performance)
    __searchColumn:  1,
      
    // Define our views. 
    // These are subsets of the table rows defined in terms 
    // of filter functions.
    //
    views:
    {
      "All":
      {
        // All rows visible
      },  
      "SearchAsYouType":
      {
        // All rows matching search string are visible
        filters: function (rowdata)
        {
          // case sensitive search
          // return
          //  (rowdata[this.__searchColumn].indexOf(this.__searchFilter) != -1);
                            
          // case insensitive search
          // Note: it would be better to move the toLowerCase() call on
          // this.__searchFilter to the input handler (called only once).
          var data = rowdata[this.__searchColumn].toLowerCase();
          return (data.indexOf(this.__searchFilter.toLowerCase()) != -1);
        }   
      }   
    },
                      
                      
    /**
     * This method contains the initial application code and gets called 
     * during startup of the application
     */
    main : function()
    {
      var appender;

      // Call super class
      this.base(arguments);
                      
      // Enable logging in debug environment
      if (qx.core.Environment.get("qx.debug")) 
      {
        appender = qx.log.appender.Native;
        appender = qx.log.appender.Console;
      }
                      
      // Create a smart table model
      var tm = new smart.model.Default();
                      
      // Set the columns
      var column_names = [];
      for (var key in this.columns)
      {
        column_names[this.columns[key]] = key;
      }
      tm.setColumns(column_names);
                      
      // Create a table using the model
      this.table = new qx.ui.table.Table(tm);
                      
      var id = 0;
      for (var view in this.views)
      {
        if (view == 'All')
        {
          this.views[view].id = 0;
          continue;
        }   
        this.views[view].id = ++id;
        tm.addView(this.views[view].filters,
                   this,
                   this.views[view].conjunction);
      }
                      
      var filter = new qx.ui.form.TextField();
      filter.addListener(
        'input',
        function(e)
        {
          this.__searchFilter = e.getData();
          this.__searchTimer.restart();
        },
        this);
                      
      this.__searchTimer = new qx.event.Timer(this.__searchTimeout);
      this.__searchTimer.addListener(
        'interval',
        function(e)
        { 
          // TBD: you might want to make sure that this function
          //      has finished before it is started again.
          this.__searchTimer.stop();
          if(this.__searchFilter == "")
          {
            this.debug("Empty search field, showing all rows ...");
            tm.updateView(this.views["All"].id); // needed?
            tm.setView(this.views["All"].id);
          } 
          else
          {
            this.debug("Showing rows matching search field ...");
            tm.updateView(this.views["SearchAsYouType"].id);
            tm.setView(this.views["SearchAsYouType"].id);
          }
        }, this);
                      
      // Document is the application root
      var doc = this.getRoot();
                      
      // Add filter and table to document at fixed coordinates
      doc.add(filter,     {left: 100, top: 50});
      doc.add(this.table, {left: 100, top: 75});
      var data = [];
      var i;
      for (i=0; i<3000; i++)
      {
        data.push([ '', 'a'+i, '']);
      }
      this.__searchFilter = '';
      tm.setData(data);
    }
  }
});
