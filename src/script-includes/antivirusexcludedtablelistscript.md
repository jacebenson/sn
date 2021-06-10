---
title: "AntivirusExcludedTableListScript"
id: "antivirusexcludedtablelistscript"
---

API Name: global.AntivirusExcludedTableListScript

```js
var AntivirusExcludedTableListScript = Class.create();
AntivirusExcludedTableListScript.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	getExcludedTables: function() {
		var tables = sn_snap.AntivirusExcludedTablesGetter.getExcludedTables();	
		return tables;
	},

    type: 'AntivirusExcludedTableListScript'
});
```