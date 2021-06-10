---
title: "OIDCTransformCheck"
id: "oidctransformcheck"
---

API Name: global.OIDCTransformCheck

```js
var OIDCTransformCheck = Class.create();

OIDCTransformCheck.prototype = {
    initialize: function(source, map, log, target) {
		this.source = source;
		this.map = map;
		this.log = log;
		this.target = target;
    },

	validateMappingOnBefore: function() {
		var gr = new GlideRecord("sys_transform_entry");
		gr.query("map", this.map.sys_id);
		gr.query("target_field", "user_name");
		gr.next();
		if(!gr.isValidRecord()) {
			gs.error("user_name mapping missing in transform map.");
			return false;
		} else {
			var StringUtil = GlideStringUtil;
			var source_field_name = gr.getValue("source_field");
			var source_field_value = this.source.getValue(source_field_name);

			if(StringUtil.nil(source_field_value)) {
				gs.error("source_field value is null or empty.");
				return false;
			}
		}
		return true;
	},
	
    type: 'OIDCTransformCheck'
};
```