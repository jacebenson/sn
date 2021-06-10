---
title: "InheritedTablesUtils"
id: "inheritedtablesutils"
---

API Name: global.InheritedTablesUtils

```js
var InheritedTablesUtils = Class.create();
InheritedTablesUtils.prototype = {
	getInheritedTables : function(table) {
		var dbom = GlideDBObjectManager.get();
		var extTablelist = dbom.getAllExtensions(table);
		var result = [];
		if (extTablelist != null && extTablelist.size() > 0) {
			for (var i = 0; i < extTablelist.size(); i++) {
				var table_name = extTablelist.get(i);
				var gtd = new GlideTableDescriptor(table_name).get(table_name);
				var item = {};
				item.table_name = table_name;
				item.label = gtd.getLabel();
				result.push(item);
			}
			
			return result;
		}
	},
	type : 'InheritedTablesUtils'
};
```