---
title: "getAvailableUIPolicyViews"
id: "getavailableuipolicyviews"
---

API Name: global.getAvailableUIPolicyViews

```js
// policyTableName is the name of the table the UI Policy
// applies to
function getAvailableUIPolicyViews(policyTableName) {
	var views = {};
	['sys_ui_form', 'sys_ui_section'].forEach(function(tableName) {
		var ga = new GlideAggregate(tableName);
		ga.addQuery('view', '!=', 'Default view');
		ga.addQuery('name', policyTableName);
		ga.addAggregate('COUNT');
		ga.groupBy('view');
		ga.query();
		while (ga.next())
			views[ga.getValue('view')] = 1;
	});
	return Object.keys(views);
}
```