---
title: "GetOutputFieldTypes"
id: "getoutputfieldtypes"
---

API Name: global.GetOutputFieldTypes

```js
var GetOutputFieldTypes = Class.create();
GetOutputFieldTypes.prototype = {
    initialize: function() {
    },
	process:function(tableName,capability){
		var result = [];
		try{
			var epoints = new global.GlideScriptedExtensionPoint();
			var eps = epoints.getExtensions("mlOutputFieldTypeExtPt");
			if (eps.length > 0){
				var point = eps[0];
				result = point.getMLOutputFieldChoices(tableName,capability);
			} 
		} catch(ex) {
			gs.error("Error running extension points!");
		}
		return result;
	},
    type: 'GetOutputFieldTypes'
};
```