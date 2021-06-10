---
title: "ImportSetRowHelper"
id: "importsetrowhelper"
---

API Name: global.ImportSetRowHelper

```js
var ImportSetRowHelper = Class.create();
ImportSetRowHelper.prototype = {
    initialize: function() {
    },
	
	canReadImportSets : function() {
		var importSetGR  = new GlideRecordSecure("sys_import_set");
		return importSetGR.canRead();
	},
	
	canReadTransformMaps : function() {
		var transformMapGR  = new GlideRecordSecure("sys_transform_map");
		return transformMapGR.canRead();
	},
	
	canReadImportSetRuns : function() {
		var importSetRunGR  = new GlideRecordSecure("sys_import_set_run");
		return importSetRunGR.canRead();
	},
	
    type: 'ImportSetRowHelper'
};
```