---
title: "SoCRefFieldsList"
id: "socreffieldslist"
---

API Name: sn_chg_soc.SoCRefFieldsList

```js
var SoCRefFieldsList = Class.create();
SoCRefFieldsList.prototype = Object.extendsObject(SoC, {
    initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
		this._cru = new global.ChangeReferenceUtils();
    },

	process: function(tableName, baseTable, chgDefId) {
		var parent = new GlideRecord(SoC.DEFINITION);
		if (!parent.get(chgDefId))
			return [];

		var tableRef = this._cru.getTablesReferencing(parent.table_name+"");
		return tableRef.filter(
			function(element) {
				if (element.table_name + "" === tableName)
					return true;
				return false;
			})
			.map(
			function(element) {
				return element.field_name;
			});
	},
	
    type: 'SoCRefFieldsList'
});
```