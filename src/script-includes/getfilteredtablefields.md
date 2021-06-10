---
title: "GetFilteredTableFields"
id: "getfilteredtablefields"
---

API Name: global.GetFilteredTableFields

```js
var GetFilteredTableFields = Class.create();
GetFilteredTableFields.prototype = {
	initialize: function() {
	},
	process: function(tableName) {
		var fieldsToExclude = ['ci', 'asset', 'parent', 'sys_class_name', 'sys_created_by',
			'sys_created_on', 'sys_id', 'sys_mod_count', 'sys_updated_by', 'sys_updated_on', 'sys_class_path',
			'install_status'];
		var result = [];
		var au = new ArrayUtil();
		var ele = '';
		if (tableName === 'alm_asset') { fieldsToExclude.push('substatus'); }

		var gr = new GlideRecord('sys_dictionary');
		gr.addQuery('name', tableName);
		gr.query();
		while (gr.next()) {
			ele = gr.element + '';
			if (!au.contains(fieldsToExclude, ele)) { result.push(ele); }
		}
		return result;
	},
	type: 'GetFilteredTableFields',
};
```