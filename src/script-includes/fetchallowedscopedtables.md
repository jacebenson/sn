---
title: "FetchAllowedScopedTables"
id: "fetchallowedscopedtables"
---

API Name: global.FetchAllowedScopedTables

```js
var FetchAllowedScopedTables = Class.create();
FetchAllowedScopedTables.prototype = {
	initialize: function() {
	},
	
	
	fetchAllowedScopedTables: function () {
		var scopedTables = GlideSystemUtilDB.getInScopeTables();
		var allowedTables = [];
		var numScopedTables = scopedTables.size();
		var i = 0;
		for(i = 0; i<numScopedTables; i++)
			allowedTables.push(scopedTables.get(i));
		
		var scopedDBViews = GlideSystemUtilDB.getInScopeDBViews();
		var numScopedDBViews = scopedDBViews.size();
		for(i = 0; i<numScopedDBViews; i++)
			allowedTables.push(scopedDBViews.get(i));
		
		g_scratchpad.inScopeTableList = allowedTables;
		g_scratchpad.isGlobalScope = !GlideSystemUtilDB.isScopedApp();
		g_scratchpad.isScopedAdmin = GlideSystemUtilDB.isScopedAdminApp();
	},
	
	
	type: 'FetchAllowedScopedTables'
};
```