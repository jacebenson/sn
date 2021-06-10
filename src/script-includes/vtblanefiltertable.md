---
title: "VTBLaneFilterTable"
id: "vtblanefiltertable"
---

API Name: global.VTBLaneFilterTable

```js
var VTBLaneFilterTable = Class.create();
VTBLaneFilterTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getReferenceTable: function() {
		var sysId = this.getParameter('sysparm_sys_id');
		if (sysId) {
			var grBoard = new GlideRecord('vtb_board');
			grBoard.get(sysId);
			var table = grBoard.getValue('table');
			var grTable = new GlideRecord(table);
			return JSON.stringify({
				lane: this._getReferenceTable(grTable, grBoard.getValue('field')),
				swim_lane: this._getReferenceTable(grTable, grBoard.getValue('swim_lane_field'))
			});
		} else {
			sysId = String(sysId);
			var tableName = String(this.getParameter('sysparm_table_name'));
			var fieldName = String(this.getParameter('sysparm_field_name'));
			var gr = new GlideRecord(tableName);
			return this._getReferenceTable(gr, fieldName);
		}
	},

	_getReferenceTable: function(gr, fieldName) {
		var fieldELement = gr.getElement(fieldName);
		return fieldELement.getReferenceTable();
	},

    type: 'VTBLaneFilterTable'
});
```