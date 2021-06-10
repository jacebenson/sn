---
title: "GetRelatedListsScreenParentTable"
id: "getrelatedlistsscreenparenttable"
---

API Name: global.GetRelatedListsScreenParentTable

```js
var GetRelatedListsScreenParentTable = Class.create();
GetRelatedListsScreenParentTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getTableName: function() {
		var parentId = this.getParameter('sysparm_related_lists_screen_parent_id');
		var parentTable = this.getParameter('sysparm_related_lists_screen_parent_table');
		if (parentTable != "sys_sg_master_item" && parentTable != "sys_sg_map_screen") {
			gs.error("Invalid screen parent table: " + parentTable);
			var errorMessage = gs.getMessage("Invalid Screen parent table: {0}", parentTable);
			gs.addErrorMessage(errorMessage);
			return "";
		}

		var parentGlideRecord = this._getParentGlideRecord(parentTable,parentId);
		if (parentGlideRecord == null)
			return "";
		
		var tableField = null;
		if (parentTable == "sys_sg_master_item")
			tableField = "table";
		else if (parentTable == "sys_sg_map_screen")
			tableField = "data_item.table";

		if (tableField == null)
			return "";

		var tableFieldGE = parentGlideRecord.getElement(tableField);
		if (!tableFieldGE.canRead()) {
			gs.warn("Cannot read field: " + tableField);
			var msg = gs.getMessage("Security constraints prevent access to field");
			gs.addErrorMessage(msg);
			return "";
		}

		return parentGlideRecord.getValue(tableField);
	},
	_getParentGlideRecord: function(parentTable, parentId) {
		var gr = new GlideRecord(parentTable);
		if (!gr.canRead()) {
			gs.warn("Cannot read table: " + parentTable);
			var warningMessage = gs.getMessage("Security constraints prevent access to table");
			gs.addErrorMessage(warningMessage);
			return null;
		}

		gr.get(parentId);
		if (!gr.isValidRecord()) {
			gs.error("Invalid record: " + parentId);
			var errorMessage = gs.getMessage("Record not found");
			gs.addErrorMessage(errorMessage);
			return null;
		}
		
		if (!gr.canRead()) {
			gs.warn("Cannot read record: " + parentId);
			var warningMsg = gs.getMessage("Security constraints prevent access to record");
			gs.addErrorMessage(warningMsg);
			return null;
		}
		
		return gr;
	},
    type: 'GetRelatedListsScreenParentTable'
});
```