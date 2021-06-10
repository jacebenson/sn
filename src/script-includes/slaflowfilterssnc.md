---
title: "SLAFlowFiltersSNC"
id: "slaflowfilterssnc"
---

API Name: global.SLAFlowFiltersSNC

```js
var SLAFlowFiltersSNC = Class.create();

SLAFlowFiltersSNC.SYS_HUB_TRIGGER_INSTANCE = "sys_hub_trigger_instance";
SLAFlowFiltersSNC.SYS_HUB_FLOW = "sys_hub_flow";
SLAFlowFiltersSNC.TRIGGER_TYPE = "sla_task";

SLAFlowFiltersSNC.prototype = {
    initialize: function() {
    },
	
	getSLATaskFlows: function() {
		var triggerInstanceGr = new GlideRecord(SLAFlowFiltersSNC.SYS_HUB_TRIGGER_INSTANCE);
		triggerInstanceGr.addQuery("trigger_type", SLAFlowFiltersSNC.TRIGGER_TYPE);
		triggerInstanceGr.addQuery("flow.active", true);
		triggerInstanceGr.addQuery("flow.sys_class_name", SLAFlowFiltersSNC.SYS_HUB_FLOW);
		triggerInstanceGr.query();

		var flowIds = "";

		while (triggerInstanceGr.next()) {
			if (flowIds !== "")
				flowIds += ",";
			flowIds += triggerInstanceGr.getValue("flow");
		}
		
		return "sys_idIN" + flowIds;	
	},

    type: 'SLAFlowFiltersSNC'
};
```