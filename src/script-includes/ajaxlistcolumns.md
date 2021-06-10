---
title: "AJAXListColumns"
id: "ajaxlistcolumns"
---

API Name: global.AJAXListColumns

```js
var AJAXListColumns = Class.create();
AJAXListColumns.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	getAllColumns: function() {
		var tableName = this.getParameter('tableName');
		var sl = new GlideSysList(tableName);
		return sl.getAllListColumns();
	},
	
	getListColumns: function() {
		var tableName = this.getParameter('tableName');
		var columns = this.getParameter('selectedColumns');
		var sl = new GlideSysList(tableName);

		return sl.getListColumns(columns);
	},

	getListColumnsForView: function() {
		var tableName = this.getParameter('tableName');
		var view = this.getParameter('view');
		var sl = new GlideSysList(tableName);

		return sl.getListColumnsForView(tableName, view, "", "");
	},

    type: 'AJAXListColumns'
});
```