---
title: "CatalogFlowFilters"
id: "catalogflowfilters"
---

API Name: global.CatalogFlowFilters

```js
var CatalogFlowFilters = Class.create();
CatalogFlowFilters.prototype = {
    initialize: function() {
    },

	getServiceCatalogFlows: function() {
		var triggerInstance = new GlideRecord("sys_hub_trigger_instance");
		triggerInstance.addQuery("trigger_type", "service_catalog");
		triggerInstance.addQuery("flow.active", true);
		triggerInstance.addQuery("flow.sys_class_name", "sys_hub_flow");
		triggerInstance.query();
		var ids = "";
		while (triggerInstance.next()) {
			if (ids != "")
				ids += ",";
			ids += triggerInstance.flow;			
		}
		
		return "sys_idIN" + ids;	
	},

    type: 'CatalogFlowFilters'
};
```