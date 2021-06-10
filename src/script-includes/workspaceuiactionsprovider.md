---
title: "WorkspaceUIActionsProvider"
id: "workspaceuiactionsprovider"
---

API Name: global.WorkspaceUIActionsProvider

```js
var WorkspaceUIActionsProvider = Class.create();
WorkspaceUIActionsProvider.prototype = {
	getActions: function(current) {
		var stringQueryPostfix = '^active=true^form_button_v2=true^ORform_menu_button_v2=true';
		var tableName = String(current.ui_action_layout.table || '');
		if (tableName === '')
			return 'table=global' + stringQueryPostfix;

		var tables = GlideDBObjectManager.getTables(tableName).toArray().concat();
		tables.push('global');
		return 'tableIN' + tables + stringQueryPostfix;
	},
	type: 'WorkspaceUIActionsProvider'
};
```