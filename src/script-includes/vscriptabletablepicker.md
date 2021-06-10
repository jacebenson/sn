---
title: "VScriptableTablePicker"
id: "vscriptabletablepicker"
---

API Name: global.VScriptableTablePicker

```js
var VScriptableTablePicker = Class.create();
VScriptableTablePicker.prototype = {
    initialize: function() {
    },

	process: function() {
			var tables = [];
			var gr = new GlideRecord("sys_db_object");
			gr.addQuery("scriptable_table", true);
			gr.query();
			while (gr.next()) {
				tables.push(gr.getValue("name"));
			}
			return tables;
	},
	
    type: 'VScriptableTablePicker'
};
```