/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      (c) 2009-2010 by Arcode Corporation
      (c) 2010 by Derrell Lipman

     License:
       LGPL: http://www.gnu.org/licenses/lgpl.html
       EPL: http://www.eclipse.org/org/documents/epl-v10.php
       See the LICENSE file in the project's top-level directory for details.

    Authors:
      * Dave Baggett
      * Derrell Lipman

************************************************************************ */

/**
 * The Smart table model provides filtering capabilities, multiple "views",
 * indexing by arbitrary model columns, and excellent performance for large
 * tables. Sorting, filtering, and indexing are all preserved after
 * modifications to the table, so there is rarely any need to explicitly sort
 * or filter the entire table at once.
 *
 * The approach we take to sorting here is different from what
 * qx.ui.table.model.Simple does. The Smart model maintains the sort
 * incrementally as modifications are made. For example, we add rows using a
 * merge sort, rather than re-sorting the entire table after rows are
 * added. Likewise, filtering operations never clear the sort; neither does
 * setting a value in the table. (If changing a value causes the affected row
 * to become improperly ordered, it will automatically be re-inserted in the
 * right place.)
 *
 * Filtering is also maintained incrementally: we keep multiple views of the
 * data in "backing store", and can then select between them just by changing
 * this.__rowArr. We apply all modifications to all views -- for example, all
 * copies are kept sorted, and rows are added and removed to/from all (subject
 * to filtering). This allows real-time switching between views.
 *
 * User-defined indices are another powerful Smart model feature: they allow
 * users to quickly locate a row in a view by a unique identifier stored in a
 * particular column.
 *
 * Most methods have the same signatures they do in the Simple superclass,
 * only with an additional parameter indicating which view the operation
 * applies to. If the view paramter is omitted, we assume the currently
 * selected view, determine by the view property. This makes the API mostly
 * backwards-compatible with the Simple model.
 */
qx.Class.define("smart.model.Default",
{
  extend : qx.ui.table.model.Simple,

  include : smart.MSmartUnitTests,	// unit testing code

  /**
   * 
   * Constructs a new Smart table model.
   */
  construct: function()
  {
    this.base(arguments);

    // debugging
    this.___debug = false;

    /*
     * We maintain multiple backing store copies, or "views" of the
     * array. Each can be filtered by an arbitrary set of filters. We
     * keep them consistent with each other with respect to row
     * addition, row removal, and sorting; this allows us to switch
     * between different views without re-sorting. The superclass
     * (qx.ui.table.model.Simple) will always see the
     * currently-selected view as this.__rowArr.
     *
     * By default, there is a single backing store array stored in
     * slot zero. View zero is by definition always unfiltered, so if
     * you want a filtered view, you have to explicitly add one.
     */
    this.__views = [];
    this.__backingstore = [];

    /*
     * Filtering precedes sorting. Some views may want different rows rendered
     * at different times, i.e. post-sort filtering. The fPostInsertRows
     * function can retrieve the alternate backing store with the
     * getRowArray(view, true) method and set it with
     * setAlternateRowArray(view, rows). If a view's alternate backing store
     * is non-null, it will be returned by getRowData(); otherwise the primary
     * backing store will be returned.
     */
    this.__alternate_backingstore = [];

    /*
     * Indices give users the ability to quickly find items from column
     * values. The keys are values stored in the rows themselves, in a
     * particular column. Any column can be used as an index, but it is the
     * user's responsibility to ensure that every row has a unique value for
     * this column.
     *
     * If defined, this.__indices[N] will be an array of maps -- one map for
     * each view -- mapping values from column N to row numbers in that view.
     */
    this.__indices = {};

    /*
     * Indexed selection.
     *
     * The selected rows array holds the IDs for all the selected
     * rows. These IDs are the table values for the selected rows in
     * the index column.
     */
    this.__selectedRows = null;
    this.__selectionIndex = -1;
    this.__selectionModel = null;

    /*
     * We need our own changeView event handler to restore the
     * selection after the view has changed.
     */
    this.addListener("changeView", this._changeView, this);

    /*
     * Set up view zero: unfiltered.
     */
    this.addView();
    this._applyView(0, 0, /*fireEvent:*/ false, /*force:*/ true);
  },

  properties:
  {
    /**
     * Which table view should be active.
     */
    view:
    {
      init: 0,
      check: "Integer",
      apply: "_applyView",
      event: "changeView"
    }
  },

  members:
  {
    __indices: null,
    __backingstore : null,
    __alternate_backingstore : null,
    __table : null,

    // overridden
    init : function(table)
    {
      // Save the table object
      this.__table = table;

      // Prevent resetting the selection upon header clicks
      table.setResetSelectionOnHeaderClick(false);
    },

    // This gets called when the view is changed or re-applied. It
    // ensures that the __rowArr slot used by the Simple superclass
    // never goes stale: that it always points to the right view. It
    // also saves the selection for the current view and restores it
    // for the new view, which causes the selection to be properly
    // maintained across the view change. (This only applies when
    // we're running in indexed selection mode; otherwise, the
    // selection is not modified.)
    _applyView: function(view, old, fireEvent, force, preserve_selection)
    {
      //this.__debug("_applyView called: view = " + view);

      if (fireEvent === undefined) fireEvent = true;
      if (force === undefined) force = false;
      if (preserve_selection === undefined) preserve_selection = true;

      if (view == old && !force)
        return;

      if (view >= this.__views.length)
      {
        throw new Error("_applyView: view out of bounds: " +
                        view + " (0.." + (this.__views.length - 1) + ")");
      }

      // Save the indexed selection using column values from the old view. It
      // will be restored when the changeView event is fired (some time after
      // this method completes).
      if (preserve_selection)
        this.__saveSelection(old);

      // Select the backing store array based on the new property value.
      this.__rowArr = this.getRowArray(view);

//      this.__debug("_applyView: new view has " +
//                   this.__rowArr.length + " rows");

      // Inform the listeners that the entire table data has changed.
      if (fireEvent)
        this.__notifyDataChanged(view);

      // NOTE: the selection will be restored by the changeView event handler
      // (see _changeView, below).
      //
      // We want to restore the selection after the new view has been fully
      // applied, and the underlying view property set, because the selection
      // restoration code depends on the new view already being effective.
    },

      // This event handler is called on every changeView event. It just
      // completes the work of _applyView above by restoring the selection.
    _changeView: function(e)
    {
      this.__restoreSelection();
    },

    //
    // VIEWS
    //

    /**
     * 
     * Adds a new view to the model. A view is a subset of the model filtered
     * against a set of criteria. These criteria are expressed as filters --
     * functions that accept a row data array and return true (allow the row)
     * or false (filter the row out). Multiple filter functions can be
     * combined under <code>and</code> or <code>or</code> operators.
     *
     * @param filters {Array}
     *   Array of filter functions. If you have only one function, you can pass
     *   it without wrapping it in an array.
     *
     * @param context {Object ? null}
     *   The object to use as <code>this</code> when calling each filter
     *   function.
     *
     * @param conjunction {String ? 'and'}
     *   How to conjoin the filter functions when there is more than one:
     *   'and' or 'or'.
     *
     * @return {Integer}
     *   The view number (always one greater than the last view number)
     *
     * @note Each filter function must accept a row data array and return true
     * if the row should be visible in the view or false if it should not.
     *
     * @deprecated Use {#newView} instead.
     */
    addView: function(filters, context, conjunction)
    {
      var filter;

      // Provide some context
      context = context || this;

      // If an array of filter functions was provided...
      if (filters && filters instanceof Array)
      {
        // ... then create a single function that provides the specified
        // conjunction of the provided filters.
        filter = function(rowdata)
        {
          // Get the number of filter functions
          var flen = filters.length;

          // Which conjunction type is requested?
          if (conjunction === 'or')
          {
            // If any filter returns true, allow the row. If
            // all filters return false, filter the row.
            for (var i = 0; i < flen; i++)
            {
              if (filters[i].call(context, rowdata))
              {
                return true;
              }
            }
            return false;
          }
          else
          {
            // If all filter return true, allow the row. If
            // any filters return false, filter the row.
            for (var i = 0; i < flen; i++)
            {
              if (!filters[i].call(context, rowdata))
              {
                return false;
              }
            }
            return true;
          }
        };
      }
      else if (typeof(filters) == "function") // it's a simple function
      {
        filter = filters;
      }
      else
      {
        // No filter was provided
        filter = null;
      }

      var view = this.newView(filter, context);
      return view;
    },

    /**
     * Create a new view. A view is a (not necessarily proper) subset of the
     * model, optionally filtered against a set of criteria, and optionally
     * processed via a set of advanced features.
     *
     * @param fFilter {Function|function(row) { return true; } }
     *   A filter function. The filter is passed a row of data and must return
     *   <i>true</i> if the row should be included in this view; <i>false</i>
     *   otherwise.This function is never called is fCustom is non-null.
     *
     * @param context {qx.core.Object ? this}
     *   The object to be bound as "this" to each of the filter, sort, pre,
     *   and post functions.
     *
     * @param advanced {Map|null}
     *   If provided, this is a map containing fields for advanced use of
     *   this widget, including:
     *
     *     bDeferBuild {Boolean ? false}
     *       [NOT YET IMPLEMENTED]
     *       If true, then defer building the view until the first time the
     *       view is selected. The default is to pre-build the view so that
     *       it is immediately available upon selection. In many cases,
     *       deferred building will be entirely reasonable, and allows the
     *       application to start up more quickly. The programmer should
     *       usually select commonly-used views to be built upon view
     *       creation, and all others to be deferred until they are needed.
     *
     *     fSort {Function ? getComparator() }
     *       A sort function. The sort function is passed two rows,
     *       <b>row1</b> and <b>row2</b> (each of which is an array of column
     *       data from the data model), and must return 1 if row1 is > rows,
     *       -1 if row1 is < row2, and 0 if row1 == row2. This function is
     *       never called if fCustom is non-null.
     *
     *     fPreInsertRows
     *       A function which is called when rows are about to be inserted. It
     *       is passed four parameters: the view, the existing row array for
     *       the view, the array of rows to be inserted, and a reference to
     *       the data model. It is legitimate for the function to alter the
     *       array of rows to be inserted, e.g. by adding additional rows.
     *       
     *     fPostInsertRows
     *       A function which is called after a set of rows has been
     *       inserted. It is passed four parameters: the view, the existing
     *       row array for the view, the array of rows being inserted, and a
     *       reference to the data model.
     *
     *     fPreRemoveRows
     *       A function which is called when rows are about to be removed. It
     *       is passed four parameters: the view, the existing row array for
     *       the view, the array of rows to be removed, and a reference to
     *       the data model. This function is called before invalidating the
     *       alternate row array, in case the function has need for the old
     *       data stored there.
     *       
     *     fPostRemoveRows
     *       A function which is called after a set of rows has been
     *       removed. It is passed four parameters: the view, the existing
     *       row array for the view, the array of rows being removed, and a
     *       reference to the data model.
     *
     * @return {Object}
     *   An opaque nandle which identifies the view.
     */
    newView: function(fFilter,
                      context,
                      advanced)
    {
      // If an advanced object was specified and it includes a sort function...
      if (advanced && advanced.fSort)
      {
        // ... then wrap the sort function in the specified context
        advanced.fSort = qx.lang.Function.bind(advanced.fSort, context);
      }

      // Create a new view object
      var viewData =
      {
        // The context in which to run the filter, sort, and custom functions
        context      : context,

        // Function to filter (or not) an individual row
        fFilter      : (fFilter 
                        ? qx.lang.Function.bind(fFilter, context) 
                        : null),

        // Requested advanced features
        advanced     : advanced || {},

        // The "association maps" help us find rows in the different
        // views. For each row in each view, we store an entry in the
        // corresponding row association map. The keys in the row
        // association maps are unique row IDs which we generate when rows
        // are added to the model. If a row does not appear in a
        // particular backing store array, then its key will map to
        // undefined.
        // 
        // The main reason we need the association maps is so that when we
        // remove a row we can find instances of that row in all views
        // without searching.
        associations : {}
      };

      this.__backingstore.push([]);
      this.__alternate_backingstore.push(null);
      for (var column in this.__indices)
      {
        this.__indices[column].push({});
      }

      // Get the identifier for this view
      var view = this.__views.length;
      
      // Add this view
      this.__views.push(viewData);

      //
      // Establish the filters
      //

      // Save indexed selection
      if (this.getView() == view)
      {
        this.__saveSelection();
      }


      this.__evalFilters(view);

      // Restore indexed selection -- select the corresponding rows in the
      // new view
      if (this.getView() == view)
      {
        this.__restoreSelection();
      }

      return view;
    },

    /**
     *
     * Recompute a particular view using the current filters. This is useful
     * when the view filters depend on an external value that can
     * change. For example, a view filter that depends on the current time
     * could be refreshed periodically with this method.
     *
     * @param view {Integer} The view to update.
     */
    updateView: function(view)
    {
      // Save indexed selection
      if (this.getView() == view)
      {
        this.__saveSelection();
      }

      this.__evalFilters(view);

      // Restore indexed selection -- select the corresponding rows in the new
      // view
      if (this.getView() == view)
      {
        this.__restoreSelection();
      }
    },

    /**
     * 
     * Resets the filters for a particular view. This reverts the view to an
     * unfiltered state.
     *
     * @param view {Integer} The view to modify.
     * @return {void}
     */
    resetFilters: function(view)
    {
      this.setFilters(view); 
    },

    /**
     * 
     * Returns the number of views in the model.
     *
     * @return {Integer} The number of views.
     */
    getViewCount: function ()
    {
      return this.__views.length;
    },

    //
    // INDICES
    //

    /**
     * 
     * Adds an index to the table model, keyed to the specified
     * column. Indices are maps where the keys are those values stored in a
     * particular model column, and where the values are row indices in a
     * given view.
     *
     * This gives you the ability to immediately find a row in a particular
     * view from that row's index column value. Any column can be used as an
     * index, but you must ensure that <em>every row has a unique value for
     * the column when converted to string form</em>. (In other words, make
     * sure that the column you use as an index contains values that uniquely
     * identify rows, and that the values are acceptable keys for JavaScript
     * maps.)
     *
     * @param columnIndex {Integer}
     *   The column whose values will be the index keys
     *
     * @note The index will be maintained for all views.
     */
    addIndex: function(columnIndex)
    {
      // Construct a new array of hash tables, one for each view.
      var A = [];
      for (var v = 0; v < this.__views.length; v++)
      {
        A.push({ });
      }
      this.__indices[columnIndex] = A;

      // Now generate the new index from scratch
      this._updateAssociationMaps(/*view:*/ undefined, /*index:*/ columnIndex);
    },

    /**
     * 
     * Locates a particular row within a view using the index for column
     * <code>columnIndex</code>.  Returns the row number the row appears in,
     * or undefined if the row does not appear in the specified view.
     *
     * @param columnIndex {Integer}
     *   The column whose values will be the index keys
     *
     * @param value {var}
     *   The value in the indexed column (i.e., the row's unique identifier)
     */
    locate: function(columnIndex, value, view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
		
      // Note that we have to explicitly convert the value to a string to be
      // sure that, e.g., floating point numbers will not round.
      return this.__indices[columnIndex][view]["" + value];
    },

    //
    // INDEXED SELECTION
    //

    /**
     * Tells the table model to automatically track the selection according to
     * the specified index using the table's selection model, and to modify
     * the selection as needed to preserve the selection across table
     * modifictions.
     *
     * Assume, for example, that column zero contains a unique id (UID) for
     * each table row, and that <code>addIndex</code> has already been called
     * on column zero. Using indexedSelection, when the user selects a set of
     * rows, the table model will track the UIDs corresponding to these
     * rows. Then if rows are added, deleted, sorted, etc., the selection will
     * be adjusted so that the new rows with the same UIDs will be selected.
     *
     * @param columnIndex {Integer}
     *   The index column
     *
     * @param selectionModel {qx.ui.table.selection.Model}
     *   The table's selection model
     *
     * @note The specified column must already have been added as an index.
     *
     * @note The selection model must be the one the parent table is currently
     * using.
     */
    indexedSelection: function(columnIndex, selectionModel)
    {
      this.__selectionIndex = columnIndex;
      this.__selectionModel = selectionModel;
      this.__selectedRows = [];
      this.__suppress_indexed_selection = false;
    },

    /**
     * For models with indexed selection enabled, this method tells the model
     * to pause or resume preserving the selection using the index. (One
     * reason you might want to do this is to avoid preserving the selection
     * when items are being deleted from the model.)
     * 
     * @param suspend {Boolean}
     *   Whether to suspend (<code>true</code>) or resume (<code>true</code>)
     *   selection preservation using the index.
     */
    suspendIndexedSelection: function(suspend)
    {
      this.__suppress_indexed_selection = suspend;
    },

    // Save the list of indices corresponding to the set of selected rows
    // (push).
    __saveSelection: function(view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }

      if (!this.__selectionModel ||
          this.__selectionIndex < 0 ||
          this.__selectionIndex >= this.getColumnCount())
      {
        return;
      }

      // Initialize the array containing the selected rows.
      this.__selectedRows = [];

      // Iterate through the selected rows. For each selected row...
      this.__selectionModel.iterateSelection(
        function(row)
        {
          // Get the value from the indexed column, and push it to the
          // selected rows array.
          this.__selectedRows.push(this.getValue(this.__selectionIndex,
                                                 row,
                                                 view));
        },
        this);
    },

    //
    // Restore the selection saved by an earlier __saveSelection call (pop).
    //
    // NOTE: this is called by the changeView event handler after every view
    // change so that the indexed selection will be properly preserved across
    // view changes.
    //
    __restoreSelection: function(view)
    {
      // If there's no indexed selection, there's nothing to restore.
      if (this.__selectedRows == null ||
          ! this.__selectionModel ||
          this.__selectionIndex < 0 ||
          this.__selectionIndex >= this.getColumnCount())
      {
        return;
      }

      // Get a local reference ot the selection model
      var sm = this.__selectionModel;
      
      // Queue events for selection changes
      sm.setBatchMode(true);
      
      // If we're not supressing the selection...
      if (!this.__suppress_indexed_selection)
      {
        // ... then clear the current selection
        this.__clearSelection();
      
        // Get a local reference to the list of selected rows
        var selected = this.__selectedRows;

        // For each selected row...
        for (var i = 0; i < selected.length; i++)
        {
          // Find that row in the specified view
          var row = this.locate(this.__selectionIndex, selected[i], view);
          
          // If it was found...
          if (row !== undefined)
          {
            // ... then add it to the selection in the selection model
            sm.addSelectionInterval(row, row);
          }
        }
      }
      
      // Send selection events now.
      sm.setBatchMode(false);
    },

    //
    // Clear the selection.
    //
    __clearSelection: function()
    {
      var sm = this.__selectionModel;
      if (sm)
      {
        sm.resetSelection();
      }
    },

    //
    // ROW MANIPULATION METHODS
    //

    /**
     *
     * Returns all the data for the table as an array of rows, where each row
     * is itself an array.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @param alternate {Boolean ? auto}
     *   If a boolean value is provided, the alternate backing store for the
     *   view (if true) or the primary backing store for the view (if false)
     *   will be returned. If a boolean value is not provided, then the
     *   alternate backing store is returned if it is non-null; otherwise the
     *   primary backing store.
     *
     * @return {Array}
     *   The row data
     *
     * @note Do not modify the data via the returned array! You should
     * consider it read-only.
     */
    getRowArray: function (view, alternate)
    {
      if (view === undefined || view === null)
      {
        view = this.getView();
      }
      
      if (typeof alternate == "boolean")
      {
        return (alternate
                ?  this.__alternate_backingstore[view]
                : this.__backingstore[view]);
      }
      else
      {
        var ret =
          this.__alternate_backingstore[view] || this.__backingstore[view];
        return ret;
      }
    },

    /**
     * Set the alternate backing store for a view.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @param store {Array|null ? null}
     *   The alternate backing store to be used for this view. Non-use of an
     *   alternate backing store is specified by setting this to null.
     *
     * @return {Array|null}
     *   This method returns its store argument, or null if no store argument
     *   was provided.
     */
    setAlternateRowArray : function(view, store)
    {
      if (view === undefined || view === null)
      {
        view = this.getView();
      }
      
      this.__alternate_backingstore[view] = (store || null);
      if (this.__alternate_backingstore[view])
      {
        this.__alternate_backingstore[view].__name = "Alternate backing store";
      }
      return this.__alternate_backingstore[view];
    },

    // Internal use only:
    __setRowArray: function (view, A, preserve_selection)
    {
      if (preserve_selection === undefined)
      {
        preserve_selection = false;
      }

      var reapply = false;

      // If we're changing the base pointer to the current view, we need to
      // explicltly re-apply the view after we've changed it -- otherwise
      // this.__rowArr will be stale.
      if (view == this.getView())
      {
        reapply = true;
      }

      this.__backingstore[view] = A;

      if (reapply)
      {
        //
        // Re-select the current view. This will notify listeners with a
        // DATA_CHANGED event as well.
        //
        this._applyView(view, view,
                        /*fireEvent:*/ true,
                        /*force:*/ true,
                        preserve_selection);
      }
    },

    // Internal use only:
    __getAssoc: function (view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
      
      if (view < this.__views.length)
      {
        return this.__views[view].associations;
      }
      else
      {
        return undefined;
      }
    },

    // Internal use only:
    __getFilter: function(view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
      
      if (view < this.__views.length)
      {
        return this.__views[view].fFilter;
      }
      else
      {
        return undefined;
      }
    },

    /**
     *
     * Returns the data of one row from the specified view.
     *
     * @param rowIndex {Integer}
     *   The index of the row in the specified view.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @param copy {Boolean ? true}
     *   Whether or not to make a new copy of the row. If this is false, then
     *   a reference to the actual row will be returned; otherwise a reference
     *   to a new copy of the data will be returned.
     *
     * @return {Array}
     *   The row data as an array
     *
     * @note Do not modify the data via the returned array unless
     * <code>copy</code> is true!  You should consider it read-only. Use
     * {@link #setValue} to modify values.
     */
    getRowData: function(rowIndex, view, copy)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
      
      if (copy === undefined)
      {
        copy = true;
      }
      
      var rows = this.getRowCount(view);

      if (rowIndex < 0 || rowIndex >= rows)
      {
        throw new Error("rowIndex out of bounds: " + rowIndex +
                        " (0.." + (rows-1) + ")");
      }
      
      // If there's an alternate backing store, return (optionally, a copy) of
      // it; otherwise return (optionally, a copy) of the primary backing
      // store.
      var rowArray = this.getRowArray(view);

      if (rowArray[rowIndex] === undefined)
      {
        this.debug("No entry in " + rowArray.__name + " for row " + rowIndex);
        return null;
      }
      
      return (copy
              ? rowArray[rowIndex].slice(0)
              : rowArray[rowIndex]);
    },

    /**
     *
     * This is just a shorthand for <code>getRowData(rowIndex, view,
     * false)</code>.
     *
     * @param rowIndex {Integer}
     *   The index of the row in the specified view.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {Array}
     *   The row data as an array
     *
     * @note Do not modify the data via the returned array! You should
     * consider it read-only. Use {@link #setValue} to modify values.
     */
    getRowReference: function(rowIndex, view)
    {
      return this.getRowData(rowIndex, view, /*copy:*/ false);
    },

    /**
     * 
     * Returns the number of rows in the specified view.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {Integer}
     *   The number of rows.
     */
    getRowCount: function(view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }

      var rowArray = this.getRowArray(view);
      return rowArray.length;
    },

    /**
     * 
     * Returns the value of a particular cell (indicated by column and row
     * indices) in the specified view.
     *
     * @param columnIndex {Integer}
     *   The column index.
     *
     * @param rowIndex {Integer}
     *   The row index.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {var}
     *   The value of the cell.
     *
     * @see #getValueById
     */
    getValue: function(columnIndex, rowIndex, view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
      
      var rows = this.getRowCount(view);
      if (rowIndex < 0 || rowIndex >= rows)
      {
        throw new Error("this.__rowArr out of bounds: " + rowIndex +
                        " (0.." + rows + ")");
      }
      
      return this.getRowArray(view)[rowIndex][columnIndex];
    },

    /**
     *
     * Returns the value of a particular cell (indicated by column ID and row
     * index) in the specified view.
     *
     * Whenever you have the choice, use {@link #getValue()} instead,
     * because it should be faster.
     *
     * @param columnId {String}
     *   The ID of the column.
     *
     * @param rowIndex {Integer}
     *   The index of the row.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {var}
     *   The value of the cell.
     *
     * @see #getValue
     */
    getValueById: function(columnId, rowIndex, view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
      
      return this.getValue(this.getColumnIndexById(columnId), rowIndex, view);
    },

    //
    // This is an internal-use method to remove rows from a view. Note that
    // you can't remove rows from view zero with this method; use the public
    // removeRows method to do that.
    //
    // NOTE: this does not preserve the indexed selection. You should save it
    // before calling this method, and restore it afterwards.
    //
    __removeRows: function(view, rows, updateAssociationMaps)
    {
      if (updateAssociationMaps === undefined)
      {
        updateAssociationMaps = true;
      }

      var i;

      // If we're removing at least 1/4 of the rows, then for better
      // performance we just copy all the rows into a new array, omitting the
      // removed rows. Otherwise we splice each row to be removed out of the
      // existing array.
      //
      // TBD: use run-time benchmarking to determine where the cutoff should
      // be between these two methods, since it will vary by browser.
      var A = this.getRowArray(view);
      if (rows.length >= (A.length >> 2))
      {
        var rowsToRemove = {};
        for (i = 0; i < rows.length; i++)
        {
          var idx = this.__getRowIndex(view, rows[i]);
          if (idx !== undefined)
          {
            rowsToRemove[idx] = 1;
          }
        }

        var _A = [];	// _A will become the new A
        for (i = 0; i < A.length; i++)
        {
          if (!rowsToRemove[i])
          {
            _A.push(A[i]);
          }
        }

        // Set the new array.
        this.__setRowArray(view, _A);
      } 
      else
      {
        // Remove rows one at a time. Because rowsToRemove is sorted in
        // reverse order, we don't have to worry about the splice operations
        // changing the indices of the other rows to be removed.
        //
        // For each row reference, determine where it is in the specified
        // view.
        var rowsToRemove = [];
        for (i = 0; i < rows.length; i++)
        {
          var idx = this.__getRowIndex(view, rows[i]);
          if (idx !== undefined)
          {
            rowsToRemove.push(idx);
          }
        }

        // Sort list of row indices, highest to lowest
        rowsToRemove.sort(function(a, b) { return b - a; });

        // We speed this up a lot in some cases by recognizing contiguous
        // spans of rows to be deleted, and deleting each such span with a
        // single splice call. Since splice is (probably) implemented in
        // native code, it's faster to push as much work down into it as we
        // can.
        var len = rowsToRemove.length;
        var span;
        A = this.getRowArray(view);
        for (i = 0; i < len; i += span)
        {
          var base = rowsToRemove[i];
          var row = base;
          span = 1;
          for (var j = 1; i + j < len; j++)
          {
            // row indices *decrease* as we step j
            if (rowsToRemove[i + j] == row - j)
            {
              span++;
            }
            else
            {
              break;
            }
          }
          A.splice(base - span + 1, span);
        }
      }

      // Update the row association maps if any have changed
      //
      // TBD: this doesn't have to be done from scratch if the deletions all
      // occured at the end of the array; in such a case we just have to
      // remove the entries for the deleted rows from the row association map.
      if (updateAssociationMaps)
      {
        this._updateAssociationMaps(view);
      }
    },

    // Internal-use method to push rows onto the end of the view and update
    // the row association map.
    __push: function(view, rows, updateAssociationMaps)
    {
      if (updateAssociationMaps === undefined)
      {
        updateAssociationMaps = true;
      }

      var A = this.getRowArray(view);
      var prior_len = A.length;

      // Actually push the new rows onto the array
      A.push.apply(A, rows);

      if (updateAssociationMaps)
      {
        this._updateAssociationMapsAfterPush(view, rows, prior_len);
      }
    },

    // Internal-use method to push rows onto the front of the specified
    // view's backing store array. Updates the row association map as well.
    __unshift: function(view, rows, updateAssociationMaps)
    {
      if (updateAssociationMaps === undefined)
      {
        updateAssociationMaps = true;
      }

      var A = this.getRowArray(view);

      A.unshift.apply(A, rows);

      // Since every pre-existing row gets shifted, we have to recalculate all
      // the row indices from scratch.
      if (updateAssociationMaps)
      {
        this._updateAssociationMaps(view);
      }
    },

    // This an internal-use method to insert rows into a view. Note that you
    // can't insert rows into view zero directly with this method; use the
    // public addRows method to do that.
    //
    // NOTE: this does not preserve the indexed selection. You should save it
    // before calling this method, and restore it afterwards.
    __insertRows: function(view,
                           rows,
                           runFilters,
                           alreadySorted,
                           updateAssociationMaps)
    {
      if (runFilters === undefined)
      {
        runFilters = true;
      }
      
      if (alreadySorted === undefined)
      {
        alreadySorted = false;
      }
      
      if (updateAssociationMaps === undefined)
      {
        updateAssociationMaps = true;
      }

      // Run filters on the rows to be added.
      if (runFilters && view)
      {
        rows = this.__testAllFilters(view, rows, /*single:*/ false);
      }

      // Inserting no rows does nothing, very quickly.
      if (rows.length == 0)
      {
        return;
      }

      // Get the view data
      var viewData = this.__views[view];

      // If there's a pre-insert rows function, call it now
      if (viewData.advanced.fPreInsertRows)
      {
        viewData.advanced.fPreInsertRows.call(viewData.context,
                                              view,
                                              this.getRowArray(view),
                                              rows,
                                              this);
      }

      // If the model isn't currently sorted and the view doesn't maintain its
      // own sort, we can just append the new rows to the end.
      if (!this.isSorted() && !viewData.advanced.fSort)
      {
        this.__push(view, rows, updateAssociationMaps);
        return;
      }

      // The model is sorted. We have to insert each row in its proper place
      // to maintain the sort.
      //
      // Sort the list of rows to be added.
      var comparator = viewData.advanced.fSort || this.getComparator();
      if (!alreadySorted || viewData.advanced.fSort)
      {
        rows.sort(comparator);
      }
	
      //
      // First check for two common cases we can handle very quickly:
      //
      // - all new rows go at the beginning
      // - all new rows go at the end
      //
      // If neither of these holds, then we have to do a bit more work to
      // interleave the two sets of rows.
      //
      var A = this.getRowArray(view);
      if (! A.length ||
          comparator(rows[0], A[A.length - 1]) >= 0)
      {
        // All rows go at the end.

        //this.__debug("__insertRows: view " + view + ": using push strategy");

        // Add the rows at the end
        this.__push(view, rows, updateAssociationMaps);
      }
      else if (comparator(rows[rows.length - 1], A[0]) <= 0)
      {
        // Add the rows at the beginning
        this.__unshift(view, rows, updateAssociationMaps);
      }
      else
      {
        // If we're inserting a small number of rows, we can just splice them
        // in for better performance, rather than copying the whole array.
        //
        // TBD: use run-time benchmarking to determine where the cutoff should
        // be between these two methods, since it will vary by browser.
        if (rows.length < (A.length >> 1))
        {
          var len = rows.length;
          var lo = 0, hi = A.length - 1;
          var IPs = [];
          var i;

          // Determine the proper insertion for each new row.
          for (i = 0; i < len; i++)
          {
            //
            // Binary search for the right insertion point. We may get either
            // a negative or a positive number back, since a duplicate of this
            // row might already be in the view.
            //
            var ip = this.__binsearch(A, rows[i], comparator, lo, hi);
            if (ip >= 0)
            {
              // There's already an identical row in the view. We'll splice
              // the new row in immediately before the one we found. So we can
              // use the binsearch return value as-is.
            }
            else
            {
              // The search didn't find an identical row. We have to convert
              // the negative return value into the offset where the row
              // should be inserted.
              ip = -ip - 1;
            }

            // Push the discovered insertion point onto the list of insertion
            // points
            IPs.push(ip);

            // Pull up the lower bound for the next search; since we're
            // examining the rows to be added in sorted order, we know that no
            // subsequent row can be added at an earlier insertion point. For
            // big tables this can save a bunch of superfluous comparisons.
            lo = ip;
          }

          //
          // Now we know where each new row goes. Now splice them all in. We
          // splice them in in reverse order (highest insertion point to
          // lowest) so that no splice will invalidate a later insertion point
          // offset.
          //
          // We speed this up a lot in some cases by recognizing contiguous
          // spans of rows to be inserted, and inserting each such span with a
          // single splice call. Since splice is (probably) implemented in
          // native code, it's faster to push as much work down into it as we
          // can.
          //
          var span;
          for (i = len - 1; i >= 0; i -= span)
          {
            // Rows to be inserted are contiguous if they all need to be
            // inserted at the same offset. (This is because the insertion
            // points don't take into account other rows to be inserted.)
            var row = IPs[i];
            var splice_args = [ /*insertionpoint:*/ IPs[i], /*todelete:*/ 0 ];
            var splice_rows = [ rows[i] ];
            span = 1;
            for (var j = 1; i - j >= 0; j++)
            {
              if (IPs[i - j] == row)
              {
                span++;
                splice_rows.push(rows[i - j]);
              }
              else
              {
                break;
              }
            }

            //this.__debug("insertRows: splicing in " + span + " rows");

            // Fill out the arg list for the splice command	
            splice_rows.reverse();
            splice_args.push.apply(splice_args, splice_rows);

            // Actually call the native splice method
            A.splice.apply(A, splice_args);
          }
        }
        else
        {
          // Create a new copy of this view's array by merging the existing
          // rows and the rows to be added. This requires O(n+m) time, where n
          // is the number of rows in the current view and m is the number of
          // rows to be added. This is basically the merge step in a standard
          // merge sort.
          var _A = [];	// _A will become the new A
          var Ai = 0, AiEnd = A.length;
          var rlen = rows.length;
          for (i = 0; i < rlen; i++)
          {
            var R = rows[i];

            // Advance Ai until it points to a row in the exisiting table
            // that's bigger than the next row to be added. Copy elements from
            // A along the way.
            //
            // TBD: we could skip ahead to the next insertion point with
            // binsearch. I wonder if that would be fast in practice, though.
            while (Ai < AiEnd)
            {
              var cmp = comparator(R, A[Ai]);
              if (cmp < 0)
              {
                _A.push(R);
                break;
              }
              _A.push(A[Ai++]);
            }
			
            // The remaining rows all go at the end
            if (Ai == AiEnd)
            {
              _A.push(R);
            }
          }

          // Push the remaining rows from the original array onto the new array
          if (Ai < AiEnd)
          {
            _A.push.apply(_A, A.slice(Ai));
          }

          // Set the new array. It's the caller's responsibility to preserve
          // the selection, so we don't do it here.
          this.__setRowArray(view, _A);
        }

        if (updateAssociationMaps)
        {
          this._updateAssociationMaps(view);
        }
      }

      // If there's a post-insert rows function, call it now
      if (viewData.advanced.fPostInsertRows)
      {
        viewData.advanced.fPostInsertRows.call(viewData.context,
                                               view,
                                               this.getRowArray(view),
                                               rows,
                                               this);
      }
    },

    // Internal-use method to set a subset of values in a row. This is a bit
    // of a pain, because changes to values in a row might cause that row to
    // sort differently, or to be filtered (or unfiltered) form certain
    // views.
    //
    // To set multiple columns, pass columnIndex = -1 and set V to the array
    // of new values, beginning with column 0.
    //
    __set: function(columnIndex, rowIndex, V, view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }

      var columns = this.getColumnCount();
      var R = this.getRowReference(rowIndex, view);	
		
      if (R === undefined)
      {
        throw new Error("__set: " +
                        "could not find the row corresponding to index " +
                        rowIndex + " in view " + view);
        return;
      }

      // Save the indexed selection in case this change causes a selected row
      // to move or disappear.
      this.__saveSelection();

      // If the value changed is in the sort column, then we may need to move
      // this row to maintain the sort. The easiest way to do this is to
      // remove the row from all views, then reinsert it where it belongs.
      var reinsert = false;

      // See if we're setting a single value vs. an entire row
      if (columnIndex >= 0 && columnIndex < columns)
      {
        // We're setting a single value
        if (R[columnIndex] === V)
        {
          // The value is already set. We don't need to do anything.
          return;
        }
        else
        {
          // If we're setting a value in a column that's used as the key for a
          // user index, we have to update the index for all views since the
          // key for this row is changing.
          if (this.__indices[columnIndex] !== undefined)
          {
            this.__updateUserIndices(columnIndex,
                                     /*oldkey:*/ R[columnIndex],
                                     /*newkey:*/ V);
          }
          R[columnIndex] = V;
        }

        // If this value is in the sort column, we have to remove this row
        // and reinsert it to maintain the sort.
        reinsert = (this.isSorted() &&
                    (columnIndex === this.getSortColumnIndex()));
      }
      else
      {
        // We're setting multiple values
        //
        // We copy values rather than overwriting the row reference.  This
        // ensures that all copies of this row in all views will be updated.
        //
        for (var col = 0; col < V.length && col < columns; col++)
        {
          // If we're setting a value in a column that's used as the key for a
          // user index, we have to update the index for all views since the
          // key for this row is changing.
          if (this.__indices[col] !== undefined)
          {
            this.__updateUserIndices(col,
                                     /*oldkey:*/ R[col],
                                     /*newkey:*/ V[col]);
          }
          
          R[col] = V[col];
        }

        // If any set value is in the sort column, we have to reinsert this
        // row to maintain the sort.
        if (this.isSorted() && V.length >= this.getSortColumnIndex())
        {
          reinsert = true;
        }
      }

      // Now apply any changes necessary to keep all the views sorted and
      // filtered across this value change.
      this.__propagateRowChangeToAllViews(R, reinsert);

      // Restore the indexed selction.
      this.__restoreSelection();
    },

    // This internal-use routine re-evaluates the filtering and sorting of a
    // row in each view. If resort is true, then it will forcibly remove and
    // re-insert the row so that the view remains sorted regardless of how
    // the row has changed.
    //
    // This scales very badly, so if you're manipulating more than a handful
    // of rows, don't use it.
    __propagateRowChangeToAllViews: function(R, resort, skipviewzero, fireEvent)
    {
      if (skipviewzero === undefined)
      {
        skipviewzero = false;
      }

      if (fireEvent === undefined)
      {
        fireEvent = true;
      }

      // Changes to a row will be visible in all the views that contain this
      // row, because the rows are shared by reference. So we don't have to do
      // anything to propagate value changes to other views. However, we do
      // need to apply filters here to see whether the new value causes the
      // row to become included or excluded. If so, we'll need to update the
      // affected view by adding or removing the row. Likewise, to maintain
      // the sort we may have to remove the row, it's already there, and
      // re-insert it where it now belongs according to the sort.
      for (var v = (skipviewzero ? 1 : 0); v < this.__views.length; v++)
      {
        // Was it filtered out of this view?
        var prev_row = this.__getRowIndex(v, R);
        var was_filtered, now_filtered;

        if (v == 0)
        {
          // View zero is never filtered, by definintion
          was_filtered = false;
          now_filtered = false;
        }
        else
        {
          was_filtered = (this.__getRowIndex(v, R) === undefined);
          now_filtered = this.__row_is_filtered(v, R);
        }
        
        // There are two different modes here. If resort is true, we have to
        // remove and re-insert the row to make sure it ends up in the right
        // place to maintain the sort. If not, we may have to insert the row
        // or delete it, but not both.
        if (resort)
        {
          // remove the row from the view if it was there before
          if (!was_filtered)
          {
            this.__removeRows(v, [ R ]);
          }

          // re-insert the row if it belongs there now
          if (!now_filtered)
          {
            this.__insertRows(v, [ R ], /*runFilters:*/ false);
          }
        }
        else
        {
          if (was_filtered != now_filtered)
          {
            if (now_filtered)
            {
              // row was there before; now should not be: remove
              this.__removeRows(v, [ R ]);
            }
            else
            {
              // row wasn't there before; now should be: insert.
              // Insert the row into this view
              this.__insertRows(v, [ R ], /*runFilters:*/ false);
            }
          }
        }

        // Notify listeners.
        //
        // TBD: since we're only inserting a single row, we don't really need
        // to tell listeners the entire table was updated. But it's a bit
        // complicated to figure out the exact bounds, so I don't bother doing
        // that yet...
        //
        // TBD: also, we might have made a change that didn't affect what is
        // currently visible. But this is subtle because changes to one view
        // (e.g., view zero) can affect other views.
        if (fireEvent)
        {
          this.__notifyDataChanged();
        }
      }
    },

    /**
     * Sets the value of a paricular cell (indicated by column and row
     * indices) in the specified view. Note that <em>all views containing this
     * row</em> will reflect this change. The established sort and filters
     * will be maintained.
     *
     * @param columnIndex {Integer}
     *   The index of the column.
     *
     * @param rowIndex {Integer}
     *   The index of the row.
     *
     * @param value {var}
     *   The new value.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {void}
     *
     * @note If you're setting more than one column value in the same row, use
     * {@link setRow} instead.
     *
     * @see #setValueById, #setRow
     */
    setValue: function(columnIndex, rowIndex, value, view)
    {
      this.__set(columnIndex, rowIndex, value, view);
    },

    /**
     * Sets a cell value by column ID.
     *
     * Whenever you have the choice, use {@link #setValue()} instead, because
     * it should be faster.
     *
     * @param columnId {String}
     *   The ID of the column.
     *
     * @param rowIndex {Integer}
     *   The index of the row.
     *
     * @param value {var}
     *   The new value.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {void}
     *
     * @see #setValue
     */
    setValueById: function(columnId, rowIndex, value, view)
    {
      return this.setValue(this.getColumnIndexById(columnId),
                           rowIndex, value, view);
    },

    /**
     * Sets all columns in a paricular row in the specified view to new
     * values. Note that <em>all views containing this row</em> will reflect
     * this change. The established sort and filters will be maintained.
     *
     * @param rowIndex {Integer}
     *   The index of the row.
     *
     * @param rowData {Array}
     *   An array of values, one for each column.
     *
     * @param view {Integer ?}
     *   Which model view this operation should apply to. If this parameter is
     *   omitted, it defaults to the value of the {@link #view} property.
     *
     * @return {void}
     *
     * @see #setValue
     */
    setRow: function(rowIndex, rowData, view)
    {
      this.__set(/*columnIndex*/ -1, rowIndex, rowData, view);
    },

    /**
     * Overwrites row data in the specified view. The rows overwrite the old
     * rows starting at <code>startIndex</code> to
     * <code>startIndex+rowArr.length</code>.  If the table is currently
     * sorted, the rows will be added such that the sort will be
     * maintained. Other views will be automatically updated to include or
     * exclude the added rows based on their associated filters.
     *
     * @param rowArr {var[][]}
     *
     *   An array containing an array for each row. Each row-array contains
     *   the values in that row in the order of the columns in this model.
     *
     * @param startIndex {Integer ? null}
     *    The index where to insert the new rows. If null, the rows are
     *    appended to the end.
     *
     * @note This is a computationally expensive operation.
     */
    setRows: function(rowArr, startIndex, view)
    {
      if (view === undefined)
      {
        view = this.getView();
      }

      // TBD: this could be done a lot faster:
      for (var i = 0; i < rowArr.length; i++)
      {
        this.setRow(startIndex + i, rowArr[i], view);
      }
    },

    /**
     * Sets the whole data in bulk for view zero (the unfiltered view). If the
     * table is currently sorted, it will be re-sorted from scratch. All views
     * will be re-computed dynamically.
     *
     * @param rowArr {var[][]}
     *    An array containing an array for each row. Each row-array contains
     *    the values in that row in the order of the columns in this model.
     *
     * @param copy {Boolean ? true}
     *    Whether or not to make a new copy of each row. If this is false,
     *    then the model will use the references in <code>rowArr</code>
     *    directly, meaning that modifications to the model will modify the
     *    data you pass in here.
     *
     * @return {void}
     *
     * @note This is a computationally expensive operation.
     *
     * @note Row data is not deep copied even when <code>copy</code> is true,
     * in the sense that if column values are references, they will be shallow
     * copied.
     */
    setData: function(rowArr, copy)
    {
      if (copy === undefined)
      {
        copy = true;
      }
		    
      if (rowArr == null || rowArr.length==0)
      {
        this.clearAllRows();
        this.__clearSelection();
        return;
      }    

      // Set the view zero array. If the copy parameter is true, make a copy
      // of each row.
      var A = [];
      if (copy)
      {
        A = [];
        for (var i = 0; i < rowArr.length; i++)
        {
          A.push(rowArr[i].slice(0));
        }
      }
      else
      {
        A = rowArr.slice(0);
      }

      this.addRows(A, false, false);
    },

    /**
     * Adds rows to view zero. If the table is currently sorted, the rows will
     * be added such that the sort will be maintained. Other views will be
     * automatically updated to include or exclude the added rows based on
     * their associated filters.
     *
     * @param rowArr {var[][]}
     *    An array containing an array for each row. Each row-array contains
     *    the values in that row in the order of the columns in this model.
     *
     * @param copy {Boolean ? true}
     *    Whether or not to make a new copy of each row. If this is false,
     *    then the model will use the references in <code>rowArr</code>
     *    directly, meaning that modifications to the model will modify the
     *    data you pass in here.
     *
     * @param fireEvent {Boolean ? true}
     *    If true, a dataChanged event will be fired after the rows are added
     *
     * @return {void}
     *
     * @note Row data is not deep-copied even when <code>copy</code> is true,
     * in the sense that even if column values are references, they will be
     * shallow-copied.
     *
     * @note It is usually much faster to call <code>addRows</code> few times
     * with large arrays than many times with small arrays. For example, to
     * add 1000 rows, you should call <code>addRows</code> once, passing all
     * 1000 rows, rather than 10 times, passing 100 rows each time.
     */
    addRows: function(rowArr, copy, fireEvent)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertArray(rowArr[0],
                         "SmartTableModel.setData(): " +
                         "parameter must be an array of arrays.");
      }
      
      if (copy === undefined)
      {
        copy = true;
      }
      
      if (fireEvent === undefined)
      {
        fireEvent = true;
      }

      if (!rowArr || rowArr.length == 0)
      {
        return;
      }

      // Save the indexed selection
      this.__saveSelection();

      var start = (new Date()).getTime();

      var A = copy ? [] : rowArr;
      if (copy)
      {
        for (var i = 0; i < rowArr.length; i++)
        {
          A.push(rowArr[i].slice(0));
        }
      }

      // Assign a unique ID to each row
      this.assignRowIDs(A);

      // Sort the list of rows to be added
      var comparator = this.getComparator();
      A.sort(comparator);

      // Insert the rows into each view, maintaining the sort and the per-view
      // filters
      for (var v = 0; v < this.__views.length; v++)
      {
        // Reset the alternate row array. If the view requires it, the view's
        // pre- or post-insert function will deal with recreating it.
        this.setAlternateRowArray(v, null);
        
        // Now insert the new rows for this view
        this.__insertRows(v, A, /*runFilters:*/ true, /*alreadySorted:*/ true);
      }

      // Restore the indexed selection
      this.__restoreSelection();

      if (fireEvent)
      {
        this.__notifyDataChanged();
      }

      var end = (new Date()).getTime();
      //this.__debug("total time spent in addRows: " + (end - start) + " msec");
    },

    /**
     * Removes the specified rows whose range is specified relative to
     * indicated view. The corresponding rows in all other views will be
     * removed as well.
     *
     * @param startIndex {Integer ? 0}
     *    The index of the first row to remove.
     *
     * @param howMany {Integer ? <em>remainder of array</em>}
     *    The number of rows to remove.
     *
     * @param view {Integer ?}
     *    Which model view this operation should apply to. If this parameter
     *    is omitted, it defaults to the value of the {@link #view} property.
     *
     * @param fireEvent {Boolean ? true}
     *    If true (the default), a dataChanged event will be fired after the
     *    rows are removed.
     *
     * @return {void}
     */
    removeRows: function(startIndex, howMany, view, fireEvent)
    {
      if (view === undefined)
      {
        view = this.getView();
      }
      
      if (fireEvent === undefined)
      {
        fireEvent = true;
      }

      var A = this.getRowArray(view);

      if (startIndex === undefined)
      {
        startIndex = 0;
      }
      
      if (howMany === undefined)
      {
        howMany = A.length - startIndex;
      }

      if (A.length == 0)
      {
        throw new Error("removeRows: attempt to remove rows from empty view");
      }

      if (startIndex < 0 || startIndex > A.length)
      {
        throw new Error("removeRows: startIndex out of bounds: " +
                        startIndex + " (0.." + (A.length - 1) + ")");
      }
      
      if (howMany < 0 || startIndex + howMany - 1 >= A.length)
      {
        throw new Error("removeRows: howMany out of bounds: " +
                        howMany + " (0.." + (A.length - startIndex) + ")");
      }

      // Collect references to rows to be deleted.
      var rows = [];
      for (var i = 0; i < howMany; i++)
      {
        rows.push(A[startIndex + i]);
      }

      // Remove the rows (will save and restore the indexed selection as well)
      this.removeReferencedRows(rows, fireEvent);
    },

    /**
     * Removes rows from all views.  The rows to be removed are provided in
     * the <code>rows</code> parameter as an array of row references. You do
     * not need to provide a view number, because references apply to all
     * views.
     *
     * @param rows {Array}
     *    The list of references to rows to be deleted.
     *
     * @param fireEvent {Boolean ? true}
     *    If true (the default), a dataChanged event will be fired after the
     *    rows are removed.
     *
     * @return {void}
     */
    removeReferencedRows: function(rows, fireEvent)
    {
      if (fireEvent === undefined)
      {
        fireEvent = true;
      }

      // Delete rows from all views. Removing rows can't change sorting or
      // filtering, so this is easy.
      //
      // TBD: __removeRows will recalculate the association maps for each
      // view. Is it correct to just do this once, rather than each time? This
      // seems inefficient...
      this.__saveSelection();

      for (var v = 0; v < this.__views.length; v++)
      {
        // Get the view data
        var viewData = this.__views[v];

        // If there's a pre-remove rows function, call it now. Note that this
        // is done before resetting the alternate row array, in case the
        // pre-remove rows function needs access to that for some reason.
        if (viewData.advanced.fPreRemoveRows)
        {
          viewData.advanced.fPreRemoveRows.call(viewData.context,
                                                v,
                                                this.getRowArray(v, false),
                                                rows,
                                                this);
        }

        // Reset the alternate row array. If the view requires it, the view's
        // post-remove function will deal with recreating it.
        this.setAlternateRowArray(v, null);
        
        // Now remove the rows for this view
        this.__removeRows(v, rows);

        // If there's a post-remove rows function, call it now
        if (viewData.advanced.fPostRemoveRows)
        {
          viewData.advanced.fPostRemoveRows.call(viewData.context,
                                                 v,
                                                 this.getRowArray(v),
                                                 this);
        }
      }
      
      this.__restoreSelection();

      if (fireEvent)
      {
        this.__notifyDataChanged();
      }
    },

    /**
     * Removes all rows from all views. Does not change view filters or the
     * sort criteria.
     *
     * @return {void}
     */
    clearAllRows: function()
    {
      if (this.getRowCount() > 0)
      {
        this.__clearSelection();
        for (var v = 0; v < this.__views.length; v++)
        {
          this.__backingstore[v] = [];
          this.__backingstore[v].__name = "Primary backing store";
          this.__alternate_backingstore[v] = null;
        }
        this._updateAssociationMaps();
        this.__notifyDataChanged();
      }
    },

    /**
     * Force the table to redraw itself.
     *
     * @return {void}
     */
    forceRedraw: function()
    {
      this.__notifyDataChanged();
    },

    
    /**
     * Get the unique identifier of a row.
     *
     * @param row {Array}
     *   A row which has already been added to the data model
     *
     * @return {Integer}
     *   The unique identifer of the specified row
     */
    getRowId : function(row)
    {
      return row.__id;
    },


    /**
     * Get a row given its unique identifier
     *
     * @param view {Integer} 
     *   The view in which to find the row
     *
     * @param id {Integer}
     *   The requested row's unique identifier
     *
     * @return {Array}
     *   The row associated with the specified unique identifier
     */
    getRowById : function(view, id)
    {
      return this.getRowArray(view, false)[this.__views[view].associations[id]];
    },


    //
    // TBD: Map versions of row update methods
    //
    // NOTE: use Simple::_mapArray2RowArr : function(mapArr, rememberMaps)
    //

    //
    // FILTERING METHODS
    //

    // Test whether a row or set or rows would be allowed in a particular
    // view.
    //
    // If single is true, then R must be a single row, and this returns true
    // (allowed) or false (filtered out).
    //
    // If single is false, then R must be an array of rows, and this returns a
    // new array containing references to the rows that the filters allow. We
    // share the reference to the row data. This means there's really a single
    // copy of the rowdata, but it may be shared by multiple views.
    __testAllFilters: function(view, R, single)
    {
      if (single === undefined)
      {
        single = true;
      }

      var filter = this.__getFilter(view);

      // No filter at all means everything's allowed.
      if (!filter)
      {
        return single ? true : qx.lang.Array.clone(R);
      }

      // Handle the single filter, single row case quickly.
      if (single)
      {
        return filter(R);
      }

      //
      // Actually evaluate the filters
      //
      // If we're checking a single row, just eval the filters on it and
      // return the boolean result.
      if (single)
      {
        return filter(R);
      }
		
      // We're checking an array of rows. Evaluate each and return the
      // filtered array.
      var rlen = R.length;
      var _R = [];
      for (var r = 0; r < rlen; r++)
      {
        var Rr = R[r];
        if (filter(Rr))
        {
          _R.push(Rr);
        }
      }
      return _R;
    },

    // More intuitively named alias for the above (single-row case):
    __row_is_filtered: function (view, R)
    {
      return !this.__testAllFilters(view, R, /*single:*/ true);
    },

    // Evalute the the filter(s) for a view from scratch, recreating the
    // view backing store array.
    __evalFilters: function(view, fireEvent, updateAssociationMaps)
    {
      // No filters allowed for view zero!
      if (view == 0)
      {
        return;
      }

      if (fireEvent === undefined)
      {
        fireEvent = true;
      }
      
      if (updateAssociationMaps === undefined)
      {
        updateAssociationMaps = true;
      }

      // View zero is always unfiltered, so copy row references from it:
      var U = this.getRowArray(0);

      // Recreate the view one row at a time
      this.__setRowArray(view,
                         this.__testAllFilters(view, U, /*single:*/ false));

      // Recompute the association map for this view from scratch
      if (updateAssociationMaps)
      {
        this._updateAssociationMaps(view);
      }

      // If the displayed view was altered, notify listeners.
      if (fireEvent && this.getView() == view)
      {
        this.__notifyDataChanged(view);
      }
    },

    // Apply filters to all the views.
    //
    // This clears all the backing store arrays and creates them all from
    // scratch by copying row references out of view zero. Note that because
    // we push rows onto the view backing store arrays in the order they
    // appear in view zero, the alternate views will also be sorted if view
    // zero is sorted.
    __evalAllFilters: function(fireEvent, updateAssociationMaps)
    {
      for (var v = 1; v < this.__views.length; v++)
      {
        this.__evalFilters(v, fireEvent, updateAssociationMaps);
      }
    },

    //
    // ROW ASSOCIATION MAPS
    //
    __ID: 1,	// the next row ID

    /**
     * Assign a unique ID to each row in the provided array. This ID will
     * uniquely identify this row regardless of changes to the row. Unlike a
     * reference, however, the ID can be uniquely converted to a string, and
     * as such, may be used as the name of a property on a JavaScript object.
     *
     * Note that this exploits an unusual aspect of JavaScript arrays: since
     * an array is decended from a JavaScript Object, you can add
     * (non-numerical) properties to them.
     */
    assignRowIDs: function(A)
    {
      for (var i = 0; i < A.length; i++)
      {
        A[i].__id = this.__ID++;
      }
    },

    /**
     * Update the row association maps. The keys are row IDs; the values are
     * row numbers. So an association map for a view tells where a given row
     * appears in the backing store for that view.
     *
     * This also updates all user indices. In user indices, the keys are the
     * values in a particular column.
     */
    _updateAssociationMaps: function(view, index)
    {
      for (var v = 0; v < this.__views.length; v++)
      {
        if (view !== undefined && view != v)
        {
          continue;
        }
        
        var A = this.getRowArray(v);

        // Clear the current association map
        if (index === undefined)
        {
          this.__views[v].associations = {};
        }

        // Clear the indices
        for (var column in this.__indices)
        {
          if (index === undefined || index == column)
          {
            this.__indices[column][v] = {};
          }
        }

        // Recreate the association map
        for (var j = 0; j < A.length; j++)
        {
          var R = A[j];
          if (index === undefined)
          {
            this.__views[v].associations[R.__id] = j;
          }

          // Update user-defined indices as well
          for (column in this.__indices)
          {
            if (index === undefined || index == column)
            {
              // Note that we have to explicitly convert the value to a string
              // to be sure that, e.g., floating point numbers will not round.
              this.__indices[column][v]["" + R[column]] = j;
            }
          }
        }
      }
    },

    /**
     * This is a more efficient version of _updateAssociationMaps that we can
     * use when we've pushed new rows onto the end of a view. In this case, we
     * don't have to recompute the whole association map from scratch; we just
     * have to add keys for the new rows; we know than none of the
     * pre-existing keys will have changed.
     */
    _updateAssociationMapsAfterPush: function(view, pushed_rows, prior_len)
    {
      var assoc = this.__getAssoc(view);
      var value = prior_len;

      // Add each new row to the row association map
      for (var i = 0; i < pushed_rows.length; i++, value++)
      {
        var R = pushed_rows[i];
        assoc[R.__id] = value;

        // Update user-defined indices as well
        for (var column in this.__indices)
        {
          // Note that we have to explicitly convert the value to a string to
          // be sure that, e.g., floating point numbers will not round.
          this.__indices[column][view]["" + R[column]] = value;
        }
      }
    },

    /**
     * Update user indices to reflect that a row's key has changed.
     *
     * This is a surgical method that scales poorly; it's only used by __set.
     */
    __updateUserIndices: function(columnIndex, oldkey, newkey)
    {
      // Note that we have to explicitly convert the keys to strings be sure
      // that, e.g., floating point numbers will not round.
      oldkey = "" + oldkey;
      newkey = "" + newkey;

      for (var view = 0; view < this.__views.length; view++)
      {
        for (var column in this.__indices)
        {
          var row = this.__indices[column][view][oldkey];
          this.__indices[column][view][oldkey] = undefined;
          this.__indices[column][view][newkey] = row;
        }
      }
    },

    /**
     * Find which row of the specified view the row reference appears
     * in. Returns undefined if the row reference is not in the view.
     */
    __getRowIndex: function(view, R)
    {
      try
      {
        if (R.__id === undefined)
        {
          // This row was never added to the model!
          //this.__debug("__getRowIndex: attempt to find a row with no ID");	
          //this.__debugobj(R, "rowdata");
          return undefined;
        }
      }
      catch (e)
      {
        this.__debug(e);
        return undefined;
      }

      return this.__getAssoc(view)[R.__id];
    },

    //
    // SORTING METHODS
    //
    // TBD: we should trap changes to the caseSensitiveSorting property and
    // re-sort when it changes.
    //

    /**
     * Indicates whether the table is currently in sorted order. Note that
     * when a table is sorted, all the views are kept sorted by the same
     * column.
     *
     * @return {Boolean} whether the table is currently in sorted order.
     */
    isSorted: function ()
    {
      return this.getSortColumnIndex() != -1;
    },

    /**
     * Returns the comparator function for a particular column.
     *
     * @param columnIndex {Integer}
     *    The column index.
     *
     * @param ascending {Boolean}
     *    Which comparator to retrieve: the ascending one, or the descending
     *    one.
     *
     * @return {Function} the comparator function
     */
    getComparator: function(columnIndex, ascending)
    {
      if (columnIndex === undefined)
      {
        columnIndex = this.getSortColumnIndex();
      }
      
      if (ascending === undefined)
      {
        ascending = this.isSortAscending();
      }

      var comparator;
      var sortMethods = this.getSortMethods(columnIndex);

      var Simple = qx.ui.table.model.Simple;
      if (sortMethods)
      {
        comparator =
          (ascending
           ? sortMethods.ascending
           : sortMethods.descending);
      }
      else if (this.getCaseSensitiveSorting())
      {
        comparator =
          (ascending
           ? Simple._defaultSortComparatorAscending
           : Simple._defaultSortComparatorDescending);
      }
      else
      {
        comparator =
          (ascending
           ? Simple._defaultSortComparatorInsensitiveAscending
           : Simple._defaultSortComparatorInsensitiveDescending);
      }

      comparator.columnIndex = columnIndex;
      return comparator;
    },

    // overridden
    sortByColumn : function(columnIndex, ascending, force)
    {
      if (force === undefined)
      {
        force = false;
      }

      // Save indexed selection
      this.__saveSelection();

      // If only the ascending boolean is changing, then we can do O(n) work
      // instead of O(n lg n) work just by reversing the array.
      if (!force && this.getSortColumnIndex() == columnIndex)
      {
        if (this.isSortAscending() == ascending)
        {
          return; // no change to sort at all: O(1)
        }

        // Reverse all view backing arrays: O(n)
        for (var v = 0; v < this.__views.length; v++)
        {
          this.getRowArray(v).reverse();
        }

        this._setSortAscending(ascending);
      }
      else
      {
        //
        // We need to do a full re-sort of all views: O(n lg n)
        //

        // Record how we're now sorted and get the new comparator
        this._setSortColumnIndex(columnIndex);
        this._setSortAscending(ascending);

        var comparator = this.getComparator();
        comparator.columnIndex = columnIndex;

        // Sort all views using the comparator
        for (var v = 0; v < this.__views.length; v++)
        {
          this.getRowArray(v).sort(comparator);
        }
      }

      // Rebuild all association maps from scratch
      this._updateAssociationMaps();

      // Restore indexed selection -- select the corresponding rows in the new
      // view
      this.__restoreSelection();

      // Notify listeners
      this.fireEvent('metaDataChanged');
    },

    // Completely re-sort everything.
    _resort: function ()
    {
      if (this.isSorted())
      {
        this.sortByColumn(this.getSortColumnIndex(),
                          this.isSortAscending(),
                          /*force:*/ true);
      }
    },

    //override
    setSortMethods: function(columnIndex, methods)
    {
      arguments.callee.base.apply(this, arguments);

      // If we're currently sorted and the comparator has changed for the
      // column we're sorted on, force a full re-sort.
      if (columnIndex == this.getSortColumnIndex())
      {
        this._resort();
      }
    },
	    
    //
    // UTILITY METHODS
    //

    //
    // Fire a DATA_CHANGED event notifying listeners that the entire table has
    // changed.
    //
    __notifyDataChanged: function(view)
    {
      if (this.hasListener('dataChanged'))
      {
        if (view === undefined)
        {
          view = this.getView();
        }
        
        var data =
          { 
            firstRow     : 0,
            lastRow      : this.getRowCount(view) - 1,
            firstColumn  : 0,
            lastColumn   : this.getColumnCount() - 1
            //removeStart:
            //removeCount:
          };
        
        this.fireDataEvent('dataChanged', data);
      }
    },

    /**
     * Binary search using three-way comparator. Returns the index of element
     * e if it's in the array A. If e is not in A, return the negated index of
     * the element that e would immediately precede, minus one. (I.e., set
     * insertion_point = -returnvalue - 1) The return value is so defined to
     * avoid ambiguity of the 0 return value.
     *
     * This is actually pretty subtle:
     *
     *   http://googleresearch.blogspot.com/2006/06/extra-extra-read-all-about-it-nearly.html
     */
    __binsearch: function(A, e, comparator, lo, hi)
    {
      if (lo === undefined)
      {
        lo = 0;
      }
      
      if (hi === undefined)
      {
        hi = A.length - 1;
      }

      while (lo <= hi)
      {
        var mid = (lo + hi) >>> 1;
        var cmp = comparator(A[mid], e);

        if (cmp < 0)
        {
          lo = mid + 1;
        }
        else if (cmp > 0)
        {
          hi = mid - 1;
        }
        else
        {
          return mid;	// e is in A; return index of e in A
        }
      }

      return -(lo + 1);	// e is not in A; return insertion point
    },

    // Debug message
    __debug: function(msg)
    {
      if (qx.core["Environment"].get("qx.debug"))
      {
        if (this.___debug)
        {
          this.debug(msg);
        }
      }
    },

    // Dump an object to the debug log
    __debugobj: function(obj, msg, own)
    {
      if (msg === undefined)
      {
        msg = "";
      }
      
      if (own === undefined)
      {
        own = true;
      }

      this.__debug(msg + " ("  + (obj ? (obj  + "):") : "): (null)"));

      if (obj == null || obj === undefined)
      {
        this.__debug("...(no properties)");
        return;
      }

      for (var prop in obj)
      {
        if (own && !obj.hasOwnProperty(prop))
        {
          continue;
        }
        
        this.__debug("..." + prop + ": " + obj[prop]);
      }
    }
  },

  destruct : function()
  {
    this.__views = null;
    this.__backingstore = null;
    this.__indices = null;
    this.__selectedRows = null;
  }
});
