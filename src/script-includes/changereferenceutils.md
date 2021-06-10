---
title: "ChangeReferenceUtils"
id: "changereferenceutils"
---

API Name: global.ChangeReferenceUtils

```js
var ChangeReferenceUtils = Class.create();
ChangeReferenceUtils.prototype = {
    initialize: function() {
		this._log = new GSLog("com.snc.change_management.log", this.type);
    },

	getTablesReferencing: function(tableName) {
		var tableInfo = [];
		if (!tableName)
			return tableInfo;
		
		var table = new GlideRecord(tableName);
		if (!table.isValid())
			return tableInfo;
		
		var tables = GlideSysForm.getRelatedTables(tableName);
		for (var i = 0; i < tables.size(); i++) {
			var nameField = (tables.get(i).getValue()+"").split(".");
			if (!this._canReadTable(nameField[0])) continue;
			var gr = new GlideRecord(nameField[0]);
			gr.initialize();
			if (!gr.canRead() || !gr.getElement(nameField[1]).canRead()) continue;
			tableInfo.push({
				"table_name": nameField[0]+"",
				"field_name": nameField[1]+""
			});
		}
		
		return tableInfo;
	},

	_canReadTable: function(tableName) {
		if (!tableName)
			return false;
		return GlideTableDescriptor.get(tableName).canRead();
	},

    type: 'ChangeReferenceUtils'
};
```