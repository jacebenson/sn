---
title: "SoCRefTablesList"
id: "socreftableslist"
---

API Name: sn_chg_soc.SoCRefTablesList

```js
var SoCRefTablesList = Class.create();
SoCRefTablesList.prototype = Object.extendsObject(SoC, {

	initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
		this._cru = new global.ChangeReferenceUtils();
    },

	process: function() {
		var tableName = this._gr.chg_soc_definition.table_name + "";
		var refInfo = this._cru.getTablesReferencing(tableName);
		var tables = [];
		for (var i = 0; i < refInfo.length; i++) {
			var gth = new GlideTableHierarchy(refInfo[i].table_name);
			if ("task" === gth.getRoot())
				tables.push(refInfo[i].table_name);
		}
		return tables;
	},

    type: 'SoCRefTablesList'
});
```