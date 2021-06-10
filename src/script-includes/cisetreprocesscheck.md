---
title: "CISETReprocessCheck"
id: "cisetreprocesscheck"
---

API Name: global.CISETReprocessCheck

```js
var CISETReprocessCheck = Class.create();

CISETReprocessCheck.isIncomplete=function(concurrentImportSetID) {
	  var igr = new GlideRecord("sys_import_set");
	  igr.addQuery("concurrent_import_set", concurrentImportSetID);
	  igr.addQuery('state', "loaded");
	  igr.query();
	  return igr.getRowCount() > 0;
	};
```