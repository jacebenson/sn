---
title: "SearchableTablesForDefaultGroup"
id: "searchabletablesfordefaultgroup"
---

API Name: sn_codesearch.SearchableTablesForDefaultGroup

```js
var SearchableTablesForDefaultGroup = Class.create();
SearchableTablesForDefaultGroup.prototype = {
    initialize: function() {
    },
	
	process : function() {
		return CodeSearch().getAllSearchableTables();
	},
	
    type: 'SearchableTablesForDefaultGroup'
};
```