/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      (c) 2009 by Arcode Corporation
      (c) 2010 by Derrell Lipman

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Dave Baggett
      * Derrell Lipman

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

    // Define our columns. Each column name maps to its position in the table.
    columns: 
    {
      "Subject"   : 0,
      "Sender"    : 1,
      "Date"      : 2,
      "MessageId" : 3,
      "InReplyTo" : 4,
      "Read?"     : 5,
      "Extra"     : 6
    },

    // Define our views. These are subsets of the table rows defined
    // in terms of filter functions. Each view can have a single
    // filter function or a list of functions conjoined by either
    // 'and' or 'or' operators.
    views: 
    {
      "All Messages": 
      {
	// All orders visible
      },
      "Unread": 
      {
	// All rows with false in the Read column are visible
        filter: function (rowdata)
        {
          return !rowdata[this.columns["Read?"]];
        }
      },
      "Read": 
      {
	// All rows with true in the Read column are visible
        filter: function (rowdata)
        {
          return rowdata[this.columns["Read?"]];
        }
      },
      "Grouped By Date":
      {
        // When rows are about to be inserted, add date header rows
        preInsertRows : function(view, existingRows, newRows, dm)
        {
          // Obtain a date formatting object
          var dateFormat = new qx.util.format.DateFormat("dd MMM yyyy");

          // Get the date today
          var todayObj = new timezonedate.TimezoneDate();

          // We want the beginning of the day. Set the time to midnight.
          todayObj.setHours(0, 0, 0, 0);
          
          // Get the time value for the beginning of today
          var today = todayObj.getTime();
          
          // The number of milliseconds in a day
          var msDay = 1000 * 60 * 60 * 24;

          // Calculate the time value for the beginning of yesterday too
          var yesterday = today - msDay;

          // Get (or create) a map of used dates (unique to the day).
          var uniqueDates = dm.getUserData("GroupByDate_Date");

          // If we hadn't previously created it...
          if (! uniqueDates)
          {
            // ... then create it now.
            uniqueDates = {};
            dm.setUserData("GroupByDate_Date", uniqueDates);
          }

          // We'll be adding header rows: one for each unique day in the new
          // Date field of the new rows. Add them all, once, at the end.
          var headerRows = [];

          // For each new row...
          for (var i = 0; i < newRows.length; i++)
          {
            // Get the Date field from this row, converted to ms since epoch
            var columnDate = 
              newRows[i][this.columns["Date"]].getTime();
            
            // Truncate to only contain the date (no time), converted to UTC
            var dayOfDateObj = new timezonedate.TimezoneDate(columnDate);
            dayOfDateObj.setHours(0, 0, 0, 0);
            var dayOfDate = dayOfDateObj.getTime();

            // Do we already have entries for this day?
            if (uniqueDates[dayOfDate] === undefined)
            {
              // Nope. Add a header row
              var headerRow = [ "", "", "", "", "", "", { header : true } ];
              
              if (dayOfDate == today)
              {
                headerRow[this.columns["Subject"]] = "Today";
              }
              else if (dayOfDate == yesterday)
              {
                headerRow[this.columns["Subject"]] = "Yesterday";
              }
              else
              {
                headerRow[this.columns["Subject"]] =
                  dateFormat.format(dayOfDateObj);
              }

              // Save the date object too, for sorting on
              headerRow[this.columns["Date"]] = dayOfDateObj;
              
              // Save this new header row to insert later
              headerRows.push(headerRow);
              
              // This date is now available
              uniqueDates[dayOfDate] = columnDate;
            }
          }
          
          // Assign an id to each of the new header rows
          dm.assignRowIDs(headerRows);
          
          // Now that we've created all of the header rows, append them to the
          // newRows array.
          for (i = 0; i < headerRows.length; i++)
          {
            newRows.push(headerRows[i]);
          }
        },

        // Sort by date, with header rows sorted before non-header rows
        sort : function(row1, row2)
        {
          // Retrieve the two date values and convert to ms since epoch
          var date1 = row1[this.columns["Date"]].getTime();
          var date2 = row2[this.columns["Date"]].getTime();

          // Earlier dates sort before later dates
          if (date1 != date2)
          {
            return (date1 < date2 ? -1 : 1);
          }
          
          // Ensure that header rows sort before non-header rows
          var extra1 = row1[this.columns["Extra"]];
          var extra2 = row2[this.columns["Extra"]];
          
          // There won't be two rows with the same date that are both header
          // rows, so we can exclude testing for that.
          if (extra1 && extra1.header)
          {
            // row1 is a header, so row1 sorts earlier than row2
            return -1;
          }
          if (extra2 && extra2.header)
          {
            // row2 is a header, so row1 sorts later than row2
            return 1;
          }
          
          // The two dates are the same (and neither is a header)
          return 0;
        },
        
        postInsertRows : function(view, srcRowArr, newRows, dm)
        {
          var node;
          var nodeId;
          var nodeArr;
          
          // (Re-)Create the node array for this view
          nodeArr = dm.getNodeArray(view) || dm.initTree(view);
          
          // The initial parent node id is the root, id 0
          var parentNodeId = 0;

          // For each row of data...
          for (var i = 0; i < newRows.length; i++)
          {
            // Get a reference to this row for fast access
            var row = newRows[i];

            // Get a reference to the "extra" data for this row
            var extra = row[this.columns["Extra"]];

            // Is this a header row?
            if (extra && extra.header)
            {
              // Yup. It becomes the new parent.
              parentNodeId = dm.addBranch(view,
                                          nodeArr, 
                                          dm.getRowId(row),
                                          0,
                                          row[this.columns["Subject"]],
                                          true,
                                          false,
                                          true);
              
              node = nodeArr[parentNodeId];
            }
            else
            {
              // It's not a header row. Create a leaf node for it.
              nodeId = dm.addLeaf(view,
                                  nodeArr,
                                  dm.getRowId(row),
                                  parentNodeId,
                                  row[this.columns["Subject"]]);
              node = nodeArr[nodeId];
            }
            
            // Save this node in association with its id
            
          }
          
          // Build the table from the tree data now!
          dm.buildTableFromTree(view);
        }
      },
      "Threaded":
      {
        // Sort by message id. This sort is required so that the
        // postInsertRows method has parent nodes inserted into the tree
        // before those nodes' children.
        sort : function(row1, row2)
        {
          // Retrieve the two message id values
          var messageId1 = row1[this.columns["MessageId"]];
          var messageId2 = row2[this.columns["MessageId"]];

          // Earlier messageIds sort before later messageIds
          if (messageId1 != messageId2)
          {
            return (messageId1 < messageId2 ? -1 : 1);
          }

          // The two messageIds are the same
          return 0;
        }
        ,
        
        postInsertRows : function(view, srcRowArr, newRows, dm)
        {
          var node;
          var nodeArr;
          
          // (Re-)Create the node array for this view
          nodeArr = dm.getNodeArray(view) || dm.initTree(view);
          
          // The initial parent node id is the root, id 0
          var parentNodeId = 0;
          var parentRowId;

          // For each row of data...
          for (var i = 0; i < newRows.length; i++)
          {
            // Get a reference to this row for fast access
            var row = newRows[i];

            // Find the message which is this message's parent
            // Is this message in reply to some previous one?
            var inReplyTo = row[this.columns["InReplyTo"]];
            
            // Assume this message's inReplyTo won't be found
            parentRowId = null; 

            if (inReplyTo !== null && inReplyTo !== undefined)
            {
              // Yup. Locate the parent message
              parentRowId = dm.locate(this.columns["MessageId"],
                                      inReplyTo,
                                      view);
            }

            // If the parent row id was found, the corresponding node id will
            // be one greater than the row id because the node array has an
            // extra, root element in position zero.
            //
            // If the parent row id was not found, then the parent becomes the
            // root.
            parentNodeId = 
              (parentRowId === null || parentRowId === undefined
               ? 0
               : dm.getRowId(srcRowArr[parentRowId]));

            // Add this node to the tree
            dm.addBranch(view,
                         nodeArr,
                         dm.getRowId(row),
                         parentNodeId,
                         row[this.columns["Subject"]],
                         true,
                         false,
                         false);
          }
          
          // Build the table from the tree data now!
          dm.buildTableFromTree(view);
        }
      }
    },

    // The main entry point for the demo
    main: function() 
    {
      var appender;
      
      // Call super class
      this.base(arguments);

      if (qx.core.Environment.get("qx.debug")) 
      {
        appender = qx.log.appender.Native;
        appender = qx.log.appender.Console;
      }

      //
      // Define table model properties
      //

      // Create the table model
      var tm = new smart.model.TreeTable();

      // Set the columns
      var key, column_names = [];
      for (key in this.columns)
      {
        if (key == "Extra")
        {
          break;
        }
	column_names[this.columns[key]] = key;
      }
      tm.setColumns(column_names);

      // Create a table using the model
      this.table = new smart.addons.TreeWithViewMenu(tm);

      // Every row will have a unique Message Id so we'll use that column as
      // an index. The index will allow us to instantly find any message in the
      // table using its message id.
      tm.addIndex(this.columns["MessageId"]);

      // Add additional views (the unfiltered view is always present, as view
      // zero).
      var id = 0;
      for (var view in this.views) 
      {
	if (view == 'All Messages') 
        {
	  this.views[view].id = 0;
	  continue;
	}
        var viewData = this.views[view];
	viewData.id = ++id;
        var advanced = null;
        if (viewData.sort || 
            viewData.preInsertRows || 
            viewData.postInsertRows) 
        {
          advanced = 
            {
              fSort           : viewData.sort,
              fPreInsertRows  : viewData.preInsertRows,
              fPostInsertRows : viewData.postInsertRows
            };
        }
        tm.newView(this.views[view].filter, this, advanced);
      }

      // Add some static data
      tm.setData(this.testData(1));
//      tm.setData(this.testData(2));

      // Enable indexed selection by MessageId. This will cause the model
      // to automatically preserve the selection across table modifications,
      // using the MessageId index.
      //
      // This means we don't have to do any work to maintain the selection
      // when we add or delete rows, or re-sort the table.
      var sm = this.table.getSelectionModel();
      sm.setSelectionMode(
        qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION);
      tm.indexedSelection(this.columns["MessageId"], sm);

      // Set up column renderers
      var tcm = this.table.getTableColumnModel();
      var treeWithHeaderRows = new smart.demo.cellrenderer.TreeWithHeaderRows();
//      treeWithHeaderRows.setHeaderStyle(
//        "background-color:red;color:white;font-weight:bold;");
      tcm.setDataCellRenderer(this.columns["Subject"],
                              treeWithHeaderRows);
      tcm.setDataCellRenderer(this.columns["Read?"],
                              new qx.ui.table.cellrenderer.Boolean());
      tcm.setDataCellRenderer(this.columns["Date"],
                              new qx.ui.table.cellrenderer.Date());
      tcm.setColumnWidth(this.columns["Subject"], 500);
      tcm.setColumnWidth(this.columns["Sender"], 100);
      tcm.setColumnWidth(this.columns["Date"], 120);
      tcm.setColumnWidth(this.columns["MessageId"], 80);
      tcm.setColumnWidth(this.columns["InReplyTo"], 80);
      tcm.setColumnWidth(this.columns["Read?"], 80);

      // Change the date format for the "Date" column
      var dr = tcm.getDataCellRenderer(this.columns["Date"]);
      dr.setDateFormat(new qx.util.format.DateFormat("yyyy-MM-dd HH:mm:ss"));

      // Disable the focus row. We only want selection highlighting.
      this.table.setShowCellFocusIndicator(false);
      this.table.highlightFocusedRow(false);

      // We need to tell the tree how to let the user select views
      var viewSelection = { };
      
      viewSelection[this.columns["Subject"]] =
        [
          {
            view    : this.views["Threaded"].id,
            caption : "Threaded",
            abbrev  : "Threaded",
            icon    : "smart/demo/threaded.png"
          }
        ];

      viewSelection[this.columns["Date"]] =
        [
          {
            view    : this.views["Grouped By Date"].id,
            caption : "Grouped by Date, ascending",
            abbrev  : "Date",
            icon    : "smart/demo/grouped-ascending.png"
          }
        ];

      viewSelection[this.columns["Read?"]] =
        [
          {
            view    : this.views["Unread"].id,
            caption : "Display only unread messages",
            abbrev  : "Unread",
            icon    : "smart/demo/unread.png"
          },
          {
            view    : this.views["Read"].id,
            caption : "Display only read messages",
            abbrev  : "Read",
            icon    : "smart/demo/read.png"
          }
        ];

      // Provide the list of view selections to the table
      this.table.setViewSelection(viewSelection);
      
      // Don't show the abbreviations in the header line
      this.table.setShowAbbreviations(false);
      
      // Select the initial view
      var viewAbbrev = viewSelection[this.columns["Subject"]][0].abbrev;
      this.table.setViewAbbreviation(viewAbbrev);

      // Add widgets to root canvas
      var root = this.getRoot();
      root.add(this.table, { edge : 10, top : 40 });
    },
	    
    testData : function(test)
    {
      switch(test)
      {
      case 1:
        var instructions = new qx.ui.basic.Label(
          "<h2>Click headers to select different views of the same data.</h2>");
        instructions.setRich(true);
        this.getRoot().add(instructions,
        {
          left : 100,
          top  : 0
        });

        // Generate a static data model for a series of email messages.
        // Each row consists, first, of the displayed column data, and finally
        // the message id and then a map of additional information which may be
        // used to build a tree from the data.
        return [
                 [
                   "[qooxdoo-devel] break on error in Firebug in func gecko()",
                   "Werner Thie",
                   new timezonedate.TimezoneDate("2010-06-09T11:53"),
                   0,
                   null,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] break on error in Firebug in func gecko()",
                   "thron7",
                   new timezonedate.TimezoneDate("2010-06-09T14:28"),
                   1,
                   0,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] break on error in Firebug in func gecko()",
                   "Derrell Lipman",
                   new timezonedate.TimezoneDate("2010-06-09T14:32"),
                   2,
                   1,
                   false,
                   {
                   }
                 ],
                 [
                   "[qooxdoo-devel] scrolling experience",
                   "Tobias Oetiker",
                   new timezonedate.TimezoneDate("2010-06-08T07:56"),
                   3,
                   null,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] scrolling experience",
                   "MartinWitteman",
                   new timezonedate.TimezoneDate("2010-06-09T12:53"),
                   4,
                   3,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] scrolling experience",
                   "Tobias Oetiker",
                   new timezonedate.TimezoneDate("2010-06-09T13:42"),
                   5,
                   4,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] scrolling experience",
                   "MartinWitteman",
                   new timezonedate.TimezoneDate("2010-06-09T14:28"),
                   6,
                   5,
                   false,
                   {
                   }
                 ],
                 [
                   "[qooxdoo-devel] How to patch static methods/members? (qooxdoo 1.2-pre)",
                   "Peter Schneider",
                   new timezonedate.TimezoneDate("2010-06-09T09:18"),
                   7,
                   null,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] How to patch static methods/members? (qooxdoo 1.2-pre)",
                   "Derrell Lipman",
                   new timezonedate.TimezoneDate("2010-06-09T13:59"),
                   8,
                   7,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] How to patch static methods/members? (qooxdoo 1.2-pre)",
                   "Peter Schneider",
                   new timezonedate.TimezoneDate("2010-06-09T13:59"),
                   9,
                   8,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] How to patch static methods/members? (qooxdoo 1.2-pre)",
                   "Derrell LIpman",
                   new timezonedate.TimezoneDate("2010-06-09T14:04"),
                   10,
                   9,
                   false,
                   {
                   }
                 ],
                 [
                   "[qooxdoo-devel] mo better qooxlisp",
                   "Kenneth Tilton",
                   new timezonedate.TimezoneDate("2010-06-05T23:40"),
                   11,
                   null,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel][Lisp] mo better qooxlisp",
                   "Ken Tilton",
                   new timezonedate.TimezoneDate("2010-06-09T13:11"),
                   12,
                   11,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel][Lisp] mo better qooxlisp",
                   "Joubert Nel",
                   new timezonedate.TimezoneDate("2010-06-09T13:24"),
                   13,
                   12,
                   true,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel][Lisp] mo better qooxlisp",
                   "Kenneth Tilton",
                   new timezonedate.TimezoneDate("2010-06-09T13:40"),
                   14,
                   13,
                   true,
                   {
                   }
                 ],
                 [
                   "[qooxdoo-devel] a jqPlot qooxdoo integration widget contrib",
                   "Tobias Oetiker",
                   new timezonedate.TimezoneDate("2010-06-08T10:59"),
                   15,
                   null,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] a jqPlot qooxdoo integration widget contrib",
                   "panyasan",
                   new timezonedate.TimezoneDate("2010-06-09T07:48"),
                   16,
                   15,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] a jqPlot qooxdoo integration widget contrib",
                   "Tobi Oetiker",
                   new timezonedate.TimezoneDate("2010-06-09T13:24"),
                   17,
                   15,
                   false,
                   {
                   }
                 ],
                 [
                   "[qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "panyasan",
                   new timezonedate.TimezoneDate("2010-06-09T07:48"),
                   18,
                   null,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "thron7",
                   new timezonedate.TimezoneDate("2010-06-09T11:42"),
                   19,
                   18,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "panyasan",
                   new timezonedate.TimezoneDate("2010-06-09T12:16"),
                   20,
                   19,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "hkalyoncu",
                   new timezonedate.TimezoneDate("2010-06-09T12:57"),
                   21,
                   20,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "Fritz Zaucker",
                   new timezonedate.TimezoneDate("2010-06-09T12:58"),
                   22,
                   20,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "panyasan",
                   new timezonedate.TimezoneDate("2010-06-09T13:05"),
                   23,
                   22,
                   false,
                   {
                   }
                 ],
                 [
                   "Re: [qooxdoo-devel] Extending application to native window (my favorite bug)",
                   "thron7",
                   new timezonedate.TimezoneDate("2010-06-09T13:18"),
                   24,
                   20,
                   false,
                   {
                   }
                 ]
               ];
        
      case 2:
        var i, j, k;
        var data = [ ];
        var now = new Date();
        var messageTime = now - (3 * 24 * 60 * 60 * 1000);
        var inUse = { };
        var senders =
          [
            "Derrell Lipman",
            "Kenneth Tilton",
            "Joubert Nel",
            "Tobias Oetiker",
            "Martin Witteman",
            "panyasan",
            "thron7",
            "Fritz Zaucker",
            "Peter Schneider",
            "Werner Thie"
          ];

        function addMessage(i, j, k)
        {
          var date;
          var inReplyTo = null;

          var messageId = i + "";
          
          if (j !== null)
          {
            inReplyTo = messageId;
            messageId += "-" + j;
            
            if (k !== null)
            {
              inReplyTo = messageId;
              messageId += "-" + k;
            }
          }

          date = new timezonedate.TimezoneDate(messageTime);
          messageTime += 5 * 60 * 1000;

          var sender = senders[Math.floor(Math.random() * senders.length)];
          var bRead = (Math.random() < 0.5 ? true : false);

          inUse[messageId] = date;

          data.push(
            [
              messageId,        //subject
              sender,
              date,
              messageId,
              inReplyTo,
              bRead,
              {
              }
            ]);
        }

        function addMessages(howManyTopLevel,
                             howManyMiddleLevel,
                             howManyBottomLevel)
        {
          for (i = 1; i <= howManyTopLevel; i++)
          {
            addMessage(i, null, null);
            for (j = 1; j <= howManyMiddleLevel; j++)
            {
              addMessage(i, j, null);
              for (k = 1; k <= howManyBottomLevel; k++)
              {
                addMessage(i, j, k);
              }
            }
          }
        }
        
        var INITIAL = 50;

        var nextBottom = 2;
        addMessages(INITIAL, 2, nextBottom);
        ++nextBottom;

        // Create a button to add a row
        var button = new qx.ui.form.Button("Add Rows");
        this.getRoot().add(button,
        {
          left : 100,
          top  : 10
        });

        // Add an event listener to actually add the row when button is pressed
        button.addListener("execute", 
                           function(e) 
                           {
                             var dm = this.table.getDataModel();
                             data = [];
                             for (var i = 1; i <= INITIAL; i++)
                             {
                               addMessage(i, 1, nextBottom);
                             }
                             ++nextBottom;
                             dm.addRows(data);
                           },
                           this);
        
        return data;

      default:
        throw new Error("Unknown test");
      }
    }
  }
});
