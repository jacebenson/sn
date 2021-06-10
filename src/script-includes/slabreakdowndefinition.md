---
title: "SLABreakdownDefinition"
id: "slabreakdowndefinition"
---

API Name: sn_sla_brkdwn.SLABreakdownDefinition

```js
var SLABreakdownDefinition = Class.create();
SLABreakdownDefinition.prototype = Object.extendsObject(SLABreakdownDefinitionSNC, {
    initialize: function(breakdownGr) {
		SLABreakdownDefinitionSNC.prototype.initialize.call(this, breakdownGr);
    },

    type: 'SLABreakdownDefinition'
});
```