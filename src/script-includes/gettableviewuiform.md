---
title: "getTableViewUIForm"
id: "gettableviewuiform"
---

API Name: global.getTableViewUIForm

```js
function getTableViewUIForm(tableName, view) {
	if (!view)
		return null;
	var gr = new GlideRecord('sys_ui_form');
	if (tableName)
		gr.addQuery('name', tableName);
	else
		gr.addNullQuery('name');
	gr.addQuery('view', view);
	gr.query();
	return gr.next() ? gr.getUniqueValue() : null;
}
```