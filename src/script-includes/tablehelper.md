---
title: "TableHelper"
id: "tablehelper"
---

API Name: global.TableHelper

```js
var TableHelper = {
	getSysIdByName: function(name) {
		var gr = new GlideRecord('sys_db_object');
		gr.get('name', name);
		return gr.sys_id.toString();
	}
};
```