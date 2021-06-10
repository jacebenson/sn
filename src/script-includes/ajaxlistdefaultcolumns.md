---
title: "AJAXListDefaultColumns"
id: "ajaxlistdefaultcolumns"
---

API Name: global.AJAXListDefaultColumns

```js
var AJAXListDefaultColumns = Class.create();
AJAXListDefaultColumns.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	getColumns: function() {
		var tableName = this.getParameter('tableName');
		var sl = new GlideSysList(tableName);
		return sl.getListRecords();
	},

	getListColumnsForView: function() {
		var tableName = this.getParameter('tableName');
		var view = this.getParameter('view');
		var sl = new GlideSysList(tableName);

		return sl.getListColumnsForView(tableName, view, "", "");
	},


    type: 'AJAXListDefaultColumns'
});
```