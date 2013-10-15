/*
 * <h3> smart table API Documentation </h3>
 *
 * The Smart Table is comprised of an independent table model that may be
 * used on its own with qx.ui.table.Table, but which is also used for a Smart
 * Table/Tree with multiple views, some in tree structure, some not. See
 * smart.demo.tree for an example with multiple views of an email inbox.
 *
 *
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
 * a single variable. We apply all modifications to all views -- for example,
 * all copies are kept sorted, and rows are added and removed to/from all
 * (subject to filtering). This allows real-time switching between views.
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
