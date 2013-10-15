/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      2009 by Arcode Corporation

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Dave Baggett

************************************************************************ */

/**
 * Unit tests for smart table model. Implemented as a mixin so it won't clutter up the main source.
 */
qx.Mixin.define("smart.MSmartUnitTests", {
	members: {
	    //
	    // UNIT TESTING
	    //
	    testsFailed: false,
	    __runTest: function (name, f) {
		var failed = false;
		try {
		    if (!f.call(this))
			failed = true;
		}
		catch (e) {
		    this.__debug(e);
		    failed = true;
		}
		if (failed)
		    this.__debug("unit test failed: " + name);
		else {
		    //this.__debug("unit test passed: " + name);
		}
		if (failed)
		    this.testsFailed = true;
		return !failed;
	    },

	    //
	    // This runs a bunch of unit tests and returns true if they all pass; false otherwise.
	    //
	    unitTest: function () {
		try {
 		    this.__unitTest();
		}
		catch (e) {
		    this.__debug(e);
		}
	    },

	    __unitTest: function () {
		var i, failed = false;
		var model = new smart.model.Default();

		// Establish columns
		var columns = { "number": 0, "string": 1, "object": 2, "function": 3, "random": 4 };
		model.setColumns(function () { 
			var C = []; 
			for (name in columns) {
			    var index = columns[name];
			    C[index] = name;
			}
			return C; 
		    }());

		this.__runTest("0.getColumnIndexById",
			       function () {
				   for (name in columns) {
				       var index = columns[name];
				       if (model.getColumnIndexById(name) != index)
					   return false;
				   }
				   return true;
			       });

		// Add an index for the number column
		model.addIndex(columns["number"]);

		// Establish sorting by column 0
		model.sortByColumn(columns["number"], /*ascending:*/ true);

		// Create a view: filter rows with odd-length string values (column 1)
		model.addView(function (R) { return R[columns["string"]].length & 1; });

		// Create some rows
		var N = 100, count = 100;
		var rows = [];
		for (i = 0; i < N; i++)
		    rows.push([i, "" + i, new qx.ui.basic.Label("" + i), function (x) { return x == i; }, Math.random()]);

		// Add the rows to the model
		model.addRows(rows);

		this.__runTest("1.addRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("1.addRows.view0.number.getValue", 
			       function () {
				   for (i = 0; i < N; i++)
				       if (model.getValue(columns["number"], i) != i)
					   return false;
				   return true;
			       });
		this.__runTest("1.addRows.view0.number.getValueById",
			       function () {
				   for (i = 0; i < N; i++)
				       if (model.getValueById("number", i) != i)
					   return false;
				   return true;
			       });

		// Explicitly set the data -- should have the same effect as above
		model.setData(rows);

		this.__runTest("2.setData.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == N);
			       });
		this.__runTest("2.setData.view0.number.getValue", 
			       function () {
				   for (i = 0; i < N; i++)
				       if (model.getValue(columns["number"], i) != i)
					   return false;
				   return true;
			       });
		this.__runTest("2.setData.view0.number.getValueById",
			       function () {
				   for (i = 0; i < model.getRowCount(); i++)
				       if (model.getValueById("number", i) != i)
					   return false;
				   return true;
			       });
		this.__runTest("2.setData.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("2.setData.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Add more rows, all to the beginning	
		rows = [];
		for (i = -10; i < 0; i++)
		    rows.push([i, "" + i, new qx.ui.basic.Label("" + i), function (x) { return x == i; }, Math.random()]);
		model.addRows(rows);
		count += 10;

		this.__runTest("3.addRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("3.addRows.view0.number.getValue",
			       function () {
				   for (i = 0; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i) != i - 10)
					   return false;
				   return true;
			       });
		this.__runTest("3.addRows.view0.number.getValueById",
			       function () {
				   for (i = 0; i < model.getRowCount(); i++)
				       if (model.getValueById("number", i) != i - 10)
					   return false;
				   return true;
			       });
		this.__runTest("3.addRows.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("3.addRows.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Add more rows, all to the end
		rows = [];
		for (i = N; i < N + 10; i++)
		    rows.push([i, "" + i, new qx.ui.basic.Label("" + i), function (x) { return x == i; }, Math.random()]);
		model.addRows(rows);
		count += 10;

		this.__runTest("4.addRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("4.addRows.view0.number.getValue", 
			       function () {
				   for (i = 0; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i) != i - 10)
					   return false;
				   return true;
			       });
		this.__runTest("4.addRows.view0.number.getValueById",
			       function () {
				   for (i = 0; i < model.getRowCount(); i++)
				       if (model.getValueById("number", i) != i - 10)
					   return false;
				   return true;
			       });
		this.__runTest("4.addRows.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("4.addRows.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Add more rows, interleaved
		rows = [];
		for (i = 0; i < N; i++) {
		    var I = i + 0.5;
		    rows.push([I, "" + I, new qx.ui.basic.Label("" + I), function (x) { return x == I; }, Math.random()]);
		}
		model.addRows(rows);
		count += N;

		this.__runTest("5.removeRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("5.setData.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("5.setData.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Remove rows from middle
		model.removeRows(N >> 2, N >> 1);
		count -= (N >> 1);

		this.__runTest("6.removeRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("6.setData.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("6.setData.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Remove rows from beginning
		model.removeRows(0, 5);
		count -= 5;

		this.__runTest("7.removeRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("7.setData.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("7.setData.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Remove rows from end, omitting howMany parameter
		model.removeRows(model.getRowCount() - 5);
		count -= 5;

		this.__runTest("8.removeRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("8.setData.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("8.setData.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["number"], i - 1, /*view:*/ 1) > 
					   model.getValue(columns["number"], i, /*view: */ 1))
					   return false;
				   return true;
			       });

		// Remove a single row from beginning, end, and middle
		model.removeRows(0, 1);
		model.removeRows(model.getRowCount() - 1);
		model.removeRows(model.getRowCount() >> 1, 1);
		count -= 3;

		this.__runTest("9.removeRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("9.setData.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });

		// Add a single row to beginning, end, and middle
		var V1 = 33.33, V2 = -10000, V3 = 10000;
		model.addRows([[V1, "" + V1, new qx.ui.basic.Label("" + V1), function (x) { return x == V1; }, Math.random()]]);
		model.addRows([[V2, "" + V2, new qx.ui.basic.Label("" + V2), function (x) { return x == V2; }, Math.random()]]);
		model.addRows([[V3, "" + V3, new qx.ui.basic.Label("" + V3), function (x) { return x == V3; }, Math.random()]]);
		count += 3;

		this.__runTest("10.addRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("10.addRows.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("10.addRows.view0.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });


		// Find rows by index
		this.__runTest("11.view0.locate.V2",
			       function () {
				   return (model.locate(columns["number"], V2) == 0);
			       });
		this.__runTest("11.view0.locate.V3",
			       function () {
				   return (model.locate(columns["number"], V3) == model.getRowCount() - 1);
			       });

		// Change a value that has no effect on sorting, indexing, or filtering
		model.setValue(columns["object"], 5, null);

		this.__runTest("12.setValue.view0.getValue",
			       function () {
				   return (model.getValue(columns["object"], 5) == null);
			       });
		this.__runTest("12.setValue.view0.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("12.setValue.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });

		// Change a value that affects filtering

		//
		// Find a row with an even-length value in the string column and make it odd length.
		// This should cause the row to be filtered out of view 1.
		//
		var v0count = model.getRowCount();
		var v1count = model.getRowCount(/*view:*/ 1);
		var S1 = "test!";	// odd length; therefore, this should be filtered out of view 1
		for (i = 0; i < model.getRowCount(); i++)
		    if ((model.getValue(columns["string"], i).length & 1) == 0)
			break;
		var I = model.getValue(columns["number"], i);
		model.setValue(columns["string"], i, S1);

		this.__runTest("13.setValue.view0.getValue",
			       function () {
				   return (model.getValue(columns["string"], i) == S1);
			       });
		this.__runTest("13.setValue.view1.assert-is-filtered",
			       function () {
				   for (var i = 0; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["string"], i, /*view:*/ 1) == S1)
					   return false;
				   return true;
			       });
		this.__runTest("13.setValue.view1.assert-not-locatable",
			       function () {
				   return model.locate(columns["number"], I, /*view:*/ 1) == undefined;
			       });
		this.__runTest("13.setValue.view0.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("13.setValue.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("13.setValue.view0.getRowCount",	// should be the same
			       function () {
				   return (model.getRowCount() == v0count);
			       });
		this.__runTest("13.setValue.view1.getRowCount",	// should be one less
			       function () {
				   return (model.getRowCount(/*view:*/ 1) == (v1count - 1));
			       });

		//
		// Find a row with an odd-length value in the string column and make it even length.
		// This should cause the row appear in view 1.
		//
		var v0count = model.getRowCount();
		var v1count = model.getRowCount(/*view:*/ 1);
		var S2 = "test";	// even length; therefore, this should not be filtered out of view 1
		for (i = 0; i < model.getRowCount(); i++)
		    if ((model.getValue(columns["string"], i).length & 1) == 1)
			break;
		var I = model.getValue(columns["number"], i);
		//this.__debugobj(model.getRowData(i), "row before setting value");
		//this.__debugobj(model.getRowArray(1), "view 1 before setting value");
		model.setValue(columns["string"], i, S2);
		//this.__debugobj(model.getRowData(i), "row after setting value");
		//this.__debugobj(model.getRowArray(1), "view 1 after setting value");

		this.__runTest("14.setValue.view0.getValue",
			       function () {
				   return (model.getValue(columns["string"], i) == S2);
			       });
		this.__runTest("14.setValue.view1.assert-is-not-filtered",
			       function () {
				   for (var i = 0; i < model.getRowCount(/*view:*/ 1); i++)
				       if (model.getValue(columns["string"], i, /*view:*/ 1) == S2)
					   return true;
				   return false;
			       });
		this.__runTest("14.setValue.view1.assert-locatable",
			       function () {
				   return model.locate(columns["number"], I, /*view:*/ 1) != undefined;
			       });
		this.__runTest("14.setValue.view0.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("14.setValue.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("14.setValue.view0.getRowCount",	// should be the same
			       function () {
				   return (model.getRowCount() == v0count);
			       });
		this.__runTest("14.setValue.view1.getRowCount",	// should be one more
			       function () {
				   return (model.getRowCount(/*view:*/ 1) == (v1count + 1));
			       });
		//
		// Change a value in view 1 that affects indexing and sorting but not filtering.
		//
		// Note that we have to set it to a unique value since this column is used as an
		// index!
		//
		v0count = model.getRowCount();
		v1count = model.getRowCount(/*view:*/ 1);
		V1 = 0.1;
		model.setValue(columns["number"], v1count >> 1, V1, /*view:*/ 1);

		this.__runTest("15.setValue.view0.getValue",
			       function () {
				   return (model.getValue(columns["number"], 
							  model.locate(columns["number"], V1)) == V1);
			       });
		this.__runTest("15.setValue.view1.getValue",
			       function () {
				   return (model.getValue(columns["number"], 
							  model.locate(columns["number"], V1, /*view:*/ 1),
							  /*view:*/ 1) == V1);
			       });
		this.__runTest("15.setValue.view0.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("15.setValue.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["number"], i - 1) > model.getValue(columns["number"], i))
					   return false;
				   return true;
			       });
		this.__runTest("15.setValue.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == v0count);
			       });
		this.__runTest("15.setValue.view1.getRowCount",
			       function () {
				   return (model.getRowCount(/*view:*/ 1) == v1count);
			       });

		// Change the sort
		v0count = model.getRowCount();
		v1count = model.getRowCount(/*view:*/ 1);
		model.sortByColumn(columns["string"], /*ascending:*/ true);
		this.__runTest("16.changeSort.view0.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["string"], i - 1) > model.getValue(columns["string"], i))
					   return false;
				   return true;
			       });
		this.__runTest("16.changeSort.view1.number.assert-is-sorted",
			       function () {
				   for (i = 1; i < model.getRowCount(); i++)
				       if (model.getValue(columns["string"], i - 1) > model.getValue(columns["string"], i))
					   return false;
				   return true;
			       });
		this.__runTest("16.setValue.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == v0count);
			       });
		this.__runTest("16.setValue.view1.getRowCount",
			       function () {
				   return (model.getRowCount(/*view:*/ 1) == v1count);
			       });

		//
		// Add two more views filtering out disjoint subsets
		//

		// Filter out rows matching F(x): 20 <= x <= 80
		model.addView([function (R) { return R[columns["number"]] >= 20; },
			       function (R) { return R[columns["number"]] <= 80; }],
			      null,
			      "and");

		// Filter out rows matching F'(x): x < 20 or x > 80
		model.addView([function (R) { return R[columns["number"]] < 20; },
			       function (R) { return R[columns["number"]] > 80; }],
			      null,
			      "or");

		this.__runTest("17.addViews.view2.assert-filter",
			       function () {
				   for (i = 0; i < model.getRowCount(/*view:*/ 2); i++) {
				       var x = model.getValue(columns["number"], i, /*view:*/ 2);
				       if (x >= 20 && x <= 80)
					   return false;
				   }
				   return true;
			       });
		this.__runTest("17.addViews.view3.assert-filter",
			       function () {
				   for (i = 0; i < model.getRowCount(/*view:*/ 3); i++) {
				       var x = model.getValue(columns["number"], i, /*view:*/ 3);
				       if (x < 20 || x > 80)
					   return false;
				   }
				   return true;
			       });
		this.__runTest("17.addViews.view2.disjoint",
			       function () {
				   var inv2 = {};
				   for (i = 0; i < model.getRowCount(/*view:*/ 2); i++)
				       inv2[model.getValue(columns["number"], i, /*view:*/ 2)] = 1;
				   for (i = 0; i < model.getRowCount(/*view:*/ 3); i++)
				       if (inv2[model.getValue(columns["number"], i, /*view:*/ 3)] == 1)
					   return false;
				   return true;
			       });
		this.__runTest("17.addViews.view2.rowsum",
			       function () {
				   return model.getRowCount(2) + model.getRowCount(3) == model.getRowCount(0);
			       });

		//
		// Remove all rows visible in view 2. This should remove these rows from all other
		// views as well.
		//
		var toRemove = [];
		for (i = 0; i < model.getRowCount(2); i++)
		    toRemove.push(model.getRowReference(i, 2));
		model.removeReferencedRows(toRemove);

		this.__runTest("18.removeRows.view2.assert-empty",
			       function () {
				   return model.getRowCount(2) == 0;
			       });
		this.__runTest("18.removeRows.view0.assert-removed",
			       function () {
				   for (i = 0; i < model.getRowCount(); i++) {
				       var x = model.getValue(columns["number"], i);
				       if (x < 20 || x > 80)
					   return false;
				   }
				   return true;
			       });

		// Remove everything
		model.clearAllRows();
		this.__runTest("19.clearAllRows.assert-all-views-empty",
			       function () {
				   for (var v = 0; v < model.getViewCount(); v++)
				       if (model.getRowCount(v) != 0)
					   return false;
				   return true;
			       });

		//
		// Perform a random sequence of adds and check that everything is still sorted.
		//
		model.sortByColumn(columns["number"], /*ascending:*/ true);
		N = 1000;
		var all = [];
		var added = 0;
		for (i = 0; i < N; i++) {
		    var A = [];
		    var size = (Math.random() & 7) + 1;
		    for (var j = 0; j < size; j++) {
			var x = (Math.random() * ~0) ^ 0;
			var R = [x, "" + x, null, null, x];
			A.push(R);
			all.push(R);
			added++;
		    }
		    model.addRows(A);
		}

		if (false) {
		    this.__debugobj(all);
		    for (i = 0; i < model.getRowCount(); i++)
			this.__debug("..." + i + ": " + model.getValue(columns["number"], i));
		}

		this.__runTest("20.random-adds.assert-sort",
			       function () {
				   all.sort(function(R1, R2) {
					   return R1[columns["number"]] - R2[columns["number"]];
				       });
				   for (var i = 0; i < all.length; i++)
				       if (model.getValue(columns["number"], i) != all[i][columns["number"]])
					   return false;
				   return true;
			       });
		this.__runTest("20.random-adds.view0.count",
			       function () {
				   return model.getRowCount() == added;
			       });

		//
		// Peform a random sequence of removes and check that everything is still sorted.
		//
		N = (1 << 10);
		model.clearAllRows();
		added = {};
		rows = [];
		for (i = 0; i < N; i++) {
		    added[i] = 1;
		    rows.push([i, "" + i, new qx.ui.basic.Label("" + i), function (x) { return x == i; }, Math.random()]);
		}

		// Add the rows to the model
		model.addRows(rows);

		// Remove 1/4 of the rows
		for (i = 0; i < (N >> 2); i++) {
		    var I = (Math.random() * (model.getRowCount() - 1)) ^ 0;
		    added[model.getValue(columns["number"], I)] = undefined;
		    model.removeRows(I, 1);
		}

		this.__runTest("21.random-deletions.view0.assert-set-equivalence",
			       function () {
				   for (i in added)
				       if (added[i] != undefined)
					   if (model.locate(columns["number"], i) == undefined)
					       return false;
				   for (i = 0; i < model.getRowCount(); i++)
				       if (added[model.getValue(columns["number"], i)] != 1)
					   return false;
				   return true;
			       });
		this.__runTest("21.random-deletions.view2.assert-subset",
			       function () {
				   for (i = 0; i < model.getRowCount(2); i++)
				       if (added[model.getValue(columns["number"], i, 2)] != 1)
					   return false;
				   return true;
			       });

		model.clearAllRows();
		var N = 100, count = 100;
		var rows = [];
		for (i = 0; i < N; i++)
		    if (i != 49 && i != 50 && i != 51)
			rows.push([i, "" + i, new qx.ui.basic.Label("" + i), function (x) { return x == i; }, Math.random()]);
		model.addRows(rows);

		//
		// Add some rows that we know will be contiguous, to test that they are inserted
		// properly with a single splice operation.
		//
		model.addRows([[49, "" + 49, new qx.ui.basic.Label("" + 49), function (x) { return x == 49; }, Math.random()],
			       [50, "" + 50, new qx.ui.basic.Label("" + 50), function (x) { return x == 50; }, Math.random()],
			       [51, "" + 51, new qx.ui.basic.Label("" + 51), function (x) { return x == 51; }, Math.random()]]);

		this.__runTest("22.addRows.view0.getRowCount",
			       function () {
				   return (model.getRowCount() == count);
			       });
		this.__runTest("22.addRows.view0.number.getValue",
			       function () {
				   for (i = 0; i < N; i++)
				       if (model.getValue(columns["number"], i) != i)
					   return false;
				   return true;
			       });
		this.__runTest("22.addRows.view0.number.getValueById",
			       function () {
				   for (i = 0; i < N; i++)
				       if (model.getValueById("number", i) != i)
					   return false;
				   return true;
			       });

		// TBD: Change filters for a view and make sure view is updated properly
		// TBD: Change sort critiera and make sure sort is maintained across all views

		// Done
		if (this.testsFailed)
		    this.__debug("SOME UNIT TESTS FAILED");
		else
		    this.__debug("all unit tests passed");

		return !this.testsFailed;
	    }
	}
    });
