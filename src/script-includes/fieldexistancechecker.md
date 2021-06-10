---
title: "FieldExistanceChecker"
id: "fieldexistancechecker"
---

API Name: global.FieldExistanceChecker

```js
var FieldExistanceChecker = Class.create();
FieldExistanceChecker.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	doesFieldExist: function() {
		var parent = this.getParameter('sysparm_parent');
		var parentTable = this.getParameter('sysparm_parent_table');
		var fieldName = this.getParameter('sysparm_field_name');
		var tableName = this._getSourceTableName(parent, parentTable);
		if (!tableName)
			return false;

		return GlideTableDescriptor.fieldExists(tableName, fieldName);
	},

	_getSourceTableName: function(parent, parentTable) {
		var gr = new GlideRecord(parentTable);
		gr.get('sys_id', parent);
		if (!gr.isValid())
			return '';

		if (parentTable == 'sys_sg_master_item')
			return gr.screen.data_item.table;

		return gr.data_item.table;
	},

	type: 'FieldExistanceChecker'
});

```