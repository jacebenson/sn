---
title: "SLABreakdownDefinitionAJAX"
id: "slabreakdowndefinitionajax"
---

API Name: sn_sla_brkdwn.SLABreakdownDefinitionAJAX

```js
var SLABreakdownDefinitionAJAX = Class.create();

SLABreakdownDefinitionAJAX.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	activeBreakdownDataExists: function() {
        var breakdownDefinitionId = this.getParameter("sysparm_breakdown_id");
		if (!breakdownDefinitionId)
			return false;

		var breakdownDefinitionGr = new GlideRecord("sla_breakdown_definition");
		if (!breakdownDefinitionGr.get(breakdownDefinitionId))
			return false;
		
		return new SLABreakdownDefinition(breakdownDefinitionGr).activeBreakdownDataExists();
	},

    type: 'SLABreakdownDefinitionAJAX'
});
```