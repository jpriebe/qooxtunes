/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      (c)2009 by Arcode Corporation
      (c) 2010 by Derrell Lipman

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Dave Baggett
      * Derrell Lipman

************************************************************************ */

/* ************************************************************************

#asset(smart.demo/*)

************************************************************************ */

/**
 * Smart table model demo: customer service order tracker.
 */
qx.Class.define("smart.demo.Application", 
{
  extend : qx.application.Standalone,

  members:
  {
    table: null,
    orders: -1,

    //
    // Define our columns. Each column name maps to its position in the table.
    //
    columns:
    {
      "Order Number": 0,
      "Customer Name": 1,
      "Order Date":2,
      "Vendor Name": 3,
      "Product Name": 4,
      "Processed?" : 5,
      "Shipped?" : 6
    },

    //
    // Define our views. These are subsets of the table rows defined in terms
    // of filter functions. Each view can have a single filter function or a
    // list of functions conjoined by either 'and' or 'or' operators.
    //
    views:
    {
      "All Orders":
      {
        // All orders visible
      },
      "Unprocessed Orders":
      {
        // All rows with false in the Processed column are visible
        filter: function (rowdata)
        {
          return !rowdata[this.columns["Processed?"]];
        }
      },
      "Processed but not Shipped":
      {
        // Processed == true; Shipped == false:
        filter: function (rowdata)
        {
          return (rowdata[this.columns["Processed?"]] &&
                  !rowdata[this.columns["Shipped?"]]);
        },
        // advanced feature: custom sort (not really compatible with the sort
        // by header click)
        sort: function(row1, row2)
        {
          var Simple = qx.ui.table.model.Simple;
          var comparator = qx.lang.Function.bind(
            function(s1, s2)
            {
              return (s1 < s2) ? 1 : ((s1 == s2) ? 0 : -1);
            },
            this);
          return comparator(row1[this.columns["Customer Name"]],
                            row2[this.columns["Customer Name"]]);
        }
      },
      "Open Orders Placed in the Past Four Hours":
      {
        filter: function (rowdata)
        {
          var now = (new Date()).getTime();
          var time = 
            rowdata[this.columns["Order Date"]].getTime();
          return (!rowdata[this.columns["Processed?"]] &&
                  now - time <= 4*60*60*1000);
        }
      }
    },

    // The main entry point for the demo
    main: function()
    {
      // Call super class
      this.base(arguments);

      // Enable logging in debug environment
      if (qx.core.Environment.get("qx.debug"))
      {
        var appender;
        appender = qx.log.appender.Native;
        appender = qx.log.appender.Console;
      }

      //
      // Test code for bugs reported by Fritz Zaucker
      // 
      if (false) {
        //this.fz_test();
        //this.fz_test_2();
        this.fz_test_3();
        return;
      }

      //
      // Define table model properties
      //

      // Create the table model
      var tm = new smart.model.Default();

      // Set the columns
      var key, column_names = [];
      for (key in this.columns)
        column_names[this.columns[key]] = key;
      tm.setColumns(column_names);

      // Create a table using the model
      this.table = new qx.ui.table.Table(tm);

      // Establish default sort
      tm.sortByColumn(this.columns["Order Date"], /*ascending:*/ false);

      //
      // Every row will have a unique Order Number so we'll use that column as
      // an index.  The index will allow us to instantly find any order in the
      // table using its order number.
      //
      tm.addIndex(this.columns["Order Number"]);

      //
      // Add additional views (the unfiltered view is always present, as view
      // zero).
      //
      var id = 0;
      for (var view in this.views)
      {
        if (view == 'All Orders')
        {
          this.views[view].id = 0;
          continue;
        }
        var viewData = this.views[view];
        viewData.id = ++id;
        var advanced = null;
        if (viewData.sort)
        {
          advanced = 
            {
              fSort : viewData.sort
            };
        }
        tm.newView(this.views[view].filter, this, advanced);
      }
      tm.setView(this.views["All Orders"].id);

      //
      // Enable indexed selection by Order Number. This will cause the model
      // to automatically preserve the selection across table modifications,
      // using the Order Number index.
      //
      // This means we don't have to do any work to maintain the selection
      // when we add or delete rows, or re-sort the table.
      var sm = this.table.getSelectionModel();
      var TSM = qx.ui.table.selection.Model;
      sm.setSelectionMode(TSM.MULTIPLE_INTERVAL_SELECTION);
      tm.indexedSelection(this.columns["Order Number"], sm);

      // Set up column renderers
      var tcm = this.table.getTableColumnModel();
      tcm.setDataCellRenderer(this.columns["Processed?"],
                              new qx.ui.table.cellrenderer.Boolean());
      tcm.setDataCellRenderer(this.columns["Shipped?"],
                              new qx.ui.table.cellrenderer.Boolean());
      tcm.setDataCellRenderer(this.columns["Order Date"],
                              new qx.ui.table.cellrenderer.Date());
      tcm.setColumnWidth(this.columns["Customer Name"], 150);
      tcm.setColumnWidth(this.columns["Order Date"], 150);
      tcm.setColumnWidth(this.columns["Product Name"], 250);

      // Change the date format for the "Order Date" column
      var dr = tcm.getDataCellRenderer(this.columns["Order Date"]);
      dr.setDateFormat(new qx.util.format.DateFormat("yyyy-MM-dd HH:mm:ss"));

      // Disable the focus row. We only want selection highlighting.
      this.table.getPaneScroller(0).setShowCellFocusIndicator(false);
      this.table.getDataRowRenderer().setHighlightFocusRow(false);

      // Add a bunch of orders "from the past" to populate the table.
      this.addOrders(100, true);

      //
      // Create a view control so the user can select which view to, er...,
      // view.
      //
      var id = 0;
      var view_control = new qx.ui.form.SelectBox();
      view_control.set({ width: 300 });
      var items = [];
      for (var view in this.views)
      {
        var info = this.views[view];
        var li = new qx.ui.form.ListItem(view);
        items[info.id] = li;
        li.setUserData("id", info.id);
      }
      for (var i = 0; i < items.length; i++)
      {
        view_control.add(items[i]);
      }

      //
      // Listen to the changeSelection event and update the view accordingly.
      //
      view_control.addListener("changeSelection",
                               function (e)
                               {
                                 var listitem = e.getData()[0];
                                 var id = listitem.getUserData("id");
                                 this.setView(id);
                               },
                               this.table.getTableModel());

      //
      // Add widgets to root canvas
      //
      var root = this.getRoot();
      root.add(view_control, { left: 100, top: 50});
      root.add(this.table, {left: 100, top: 75});

      // Start a listener to add new orders "as they come in".
      var This = this;
      setInterval(function ()
                  {
                    This.addOrders(Math.random() * 4, false);
                  },
                  5*1000);

      //
      // Start a listener to remove orders "as they are canceled".
      //
      setInterval(function () { This.cancelOrders(); }, 5*1000);
    },

    firstNames:
    [
      "Jacob", "Michael", "Ethan", "Joshua", "Daniel", "Alexander",
      "Anthony", "William", "Christopher",  "Matthew", "Jayden",
      "Andrew", "Joseph", "David", "Noah", "Aiden", "James", "Ryan",
      "Logan", "John", "Emma", "Isabella", "Emily", "Madison", "Ava",
      "Olivia", "Sophia", "Abigail", "Elizabeth", "Chloe", "Samantha",
      "Addison", "Natalie", "Mia", "Alexis", "Alyssa", "Hannah",
      "Ashley", "Ella", "Sarah"
    ],
    lastNames:
    [
      "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis",
      "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas",
      "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia",
      "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
      "Walker", "Hall", "Allen", "Young", "Hernandez", "King",
      "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker",
      "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts",
      "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards",
      "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook",
      "Morgan", "Bell"
    ],
    companies:
    [
      "Acme", "Mainway Industries", "First Rate", "GloboChem",
      "BigCorp", "AAA", "Tools 'R' Us"
    ],
    products:
    [
      "Sprocket", "Bag o' Glass", "Thumb Drive",
      "Unicycle", "JavaScript Framework"
    ],
	    
    //
    // Add a randomly generated order to the table.
    //
    addOrders: function (N, past)
    {
      if (N == undefined) N = 1;	
      if (past == undefined) past = false;

      function rand(list)
      {
        return list[Math.floor(Math.random() * list.length)];
      }

      var tm = this.table.getTableModel();
      var toAdd = [];

      // Create data for N random rows.
      for (var i = 0; i < N; i++)
      {
        var order_time = (new Date()).getTime();
        var processed = Math.random() > 0.5;
        var shipped = processed && (Math.random() > 0.5);

        if (past)
        {
          order_time -= (Math.random() * 24 * 60 *60 * 100);
        }

        toAdd.push(
          [
            ++this.orders,                                     // Order Number

            
            rand(this.firstNames) + " " + rand(this.lastNames),// Customer Name
            new Date(order_time),                              // Order Date
            rand(this.companies),                              // Vendor
            rand(this.products),                               // Product
            processed,
            shipped
          ]);
      }

      //
      // Actually add the rows to the table model. It is more efficient to add
      // many rows at once than to add rows one at a time.
      //
      tm.addRows(toAdd);
    },

    // Cancel a random order with low probability
    cancelOrders: function ()
    {
      if (Math.random() < 0.5)
      {
        return;
      }

      // Pick an order to cancel
      var order_number = Math.floor(Math.random() * this.orders) ^ 0;

      //
      // See what row the order to be canceled is in. The indexing makes this
      // is very fast. The row number returned is relative to the current
      // view.
      //
      var tm = this.table.getTableModel();
      var row = tm.locate(this.columns["Order Number"], order_number);

      if (row == undefined)
      {
        return;
      }

      //
      // Remove the row corresponding to the order to be cancelled.  Note that
      // removing a row from a view removes it from *all* views.
      //
      tm.removeRows(row, 1);
    },

    fz_test: function ()
    {
      var tableModelSmart = new smart.model.Default();
      tableModelSmart.newView(qx.lang.Function.returnTrue);
      tableModelSmart.setColumns([ "Location", "Team" ]);

      var tableModelSimple = new qx.ui.table.model.Simple();
      tableModelSimple.setColumns([ "Location", "Team" ]);

      var tableSmart  = new qx.ui.table.Table(tableModelSmart);
      var tableSimple = new qx.ui.table.Table(tableModelSimple);

      // Create a button
      var button1 = new qx.ui.form.Button("Update");

      // Document is the application root
      var doc = this.getRoot();

      // Add button and table to document at fixed coordinates
      doc.add(button1, {left: 20, top: 20});
      doc.add(new qx.ui.basic.Label('Simple'), {left: 20, top: 50});
      doc.add(tableSimple, {left:  20, top: 70});
      doc.add(new qx.ui.basic.Label('Smart'), {left: 250, top: 50});
      doc.add(tableSmart,  {left: 250, top: 70});

      var data = [ ['loc1', 'team1'],
                   ['loc2', 'team2'],
                   ['loc3', 'team3']
        ];
      tableModelSimple.setData(data);
      tableModelSmart.setData(data);

      /* Update the data  */
      button1.addListener("execute", function(e) {
          var lenSmart;
          lenSmart = tableModelSmart.getRowCount();
          this.debug('lenSmart='+lenSmart);
          tableModelSimple.setValue(0,1,'loc2a');
          tableModelSmart.setValue(0,1,'loc2a');
          lenSmart = tableModelSmart.getRowCount();
          this.debug('lenSmart='+lenSmart);
        });
    },

    fz_test_2: function ()
    {
      var tableModelSmart = new smart.model.Default();
      tableModelSmart.newView(qx.lang.Function.returnTrue);
      tableModelSmart.setColumns([ "Location", "Team" ]);

      var tableModelSimple = new qx.ui.table.model.Simple();
      tableModelSimple.setColumns([ "Location", "Team" ]);

      var tableSmart  = new qx.ui.table.Table(tableModelSmart);
      var tableSimple = new qx.ui.table.Table(tableModelSimple);

      // Create buttons
      var button1 = new qx.ui.form.Button("Update");
      var button2 = new qx.ui.form.Button("Delete");

      // Document is the application root
      var doc = this.getRoot();

      // Add button and table to document at fixed coordinates
      doc.add(button1, {left: 20, top: 20});
      doc.add(button2, {left: 100, top: 20});
      doc.add(new qx.ui.basic.Label('Simple'), {left: 20, top: 50});
      doc.add(tableSimple, {left:  20, top: 70});
      doc.add(new qx.ui.basic.Label('Smart'), {left: 250, top: 50});
      doc.add(tableSmart,  {left: 250, top: 70});

      var data = [ ['loc1', 'team1'],
                   ['loc2', 'team2'],
                   ['loc3', 'team3']
        ];
      tableModelSimple.setData(data);
      tableModelSmart.setData(data);

      /* Update the data  */
      button1.addListener("execute", function(e) {
          var lenSmart;
          lenSmart = tableModelSmart.getRowCount();
          this.debug('lenSmart='+lenSmart);
          tableModelSimple.setValue(0,1,'loc2a');
          tableModelSmart.setValue(0,1,'loc2a');
          lenSmart = tableModelSmart.getRowCount();
          this.debug('lenSmart='+lenSmart);
        });

      /* Delete a row  */
      button2.addListener("execute", function(e) {
          var lenSmart;
          lenSmart = tableModelSmart.getRowCount();
          this.debug('lenSmart='+lenSmart);
          tableModelSimple.removeRows(1,1);
          tableModelSmart.removeRows(1,1,0);
          lenSmart = tableModelSmart.getRowCount();
          this.debug('lenSmart='+lenSmart);
        });
    },

    fz_test_3: function ()
    {
      var tableModelSmart = new smart.model.Default();
      tableModelSmart.setColumns([ "Location", "Team" ]);

      var tableModelSimple = new qx.ui.table.model.Simple();
      tableModelSimple.setColumns([ "Location", "Team" ]);

      var tableSmart  = new qx.ui.table.Table(tableModelSmart);
      var tableSimple = new qx.ui.table.Table(tableModelSimple);

      tableModelSmart.newView(
        function (rowdata)
        {
          var loc = rowdata[0];
          this.debug('loc='+loc);
          var ret = (loc == 'loc1' || loc == 'loc2');
          this.debug('ret='+ret);
          return ret;
        },
        this);


      // Create buttons
      var button1 = new qx.ui.form.Button("Update");
      var button2 = new qx.ui.form.Button("Delete");

      // Document is the application root
      var doc = this.getRoot();

      // Add button and table to document at fixed coordinates
      doc.add(button1, {left: 20, top: 20});
      doc.add(button2, {left: 100, top: 20});
      doc.add(new qx.ui.basic.Label('Simple'), {left: 20, top: 50});
      doc.add(tableSimple, {left:  20, top: 70});
      doc.add(new qx.ui.basic.Label('Smart'), {left: 250, top: 50});
      doc.add(tableSmart,  {left: 250, top: 70});

      var data = [ ['loc1', 'team1'],
                   ['loc2', 'team2'],
                   ['loc3', 'team3']
        ];
      tableSmart.getSelectionModel().setSelectionMode(
        qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION);
      tableModelSimple.setData(data);
      tableModelSmart.setData(data);
      tableModelSmart.setView(1);
      tableModelSmart.updateView(1);
      tableModelSmart.addIndex(0);
      tableModelSmart.indexedSelection(0, tableSmart.getSelectionModel());

      /* Update the data  */
      button1.addListener("execute", function(e)
                          {
                            var lenSmart;
                            lenSmart = tableModelSmart.getRowCount();
                            this.debug('lenSmart='+lenSmart);
                            tableModelSimple.setValue(0,1,'loc2a');
                            tableModelSmart.setValue(0,1,'loc2a');
                            lenSmart = tableModelSmart.getRowCount();
                            this.debug('lenSmart='+lenSmart);
                          });

      /* Delete a row  */
      button2.addListener("execute", function(e)
                          {
                            var lenSmart;
                            lenSmart = tableModelSmart.getRowCount();
                            //tableSmart.getSelectionModel().resetSelection();
                            this.debug('lenSmart='+lenSmart);
                            tableModelSimple.removeRows(1,1);
                            tableModelSmart.removeRows(1,1,1);
                            lenSmart = tableModelSmart.getRowCount();
                            this.debug('lenSmart='+lenSmart);
                          });
    }
  }
});
