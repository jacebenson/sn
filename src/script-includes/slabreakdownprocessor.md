---
title: "SLABreakdownProcessor"
id: "slabreakdownprocessor"
---

API Name: sn_sla_brkdwn.SLABreakdownProcessor

```js
var SLABreakdownProcessor = Class.create();

SLABreakdownProcessor.prototype = Object.extendsObject(SLABreakdownProcessorSNC, {
    initialize: function(currentTaskSLAGr, previousTaskSLAGr) {
		SLABreakdownProcessorSNC.prototype.initialize.call(this, currentTaskSLAGr, previousTaskSLAGr);
    },

    type: 'SLABreakdownProcessor'
});

SLABreakdownProcessor.hasBreakdownDefinitions = SLABreakdownProcessorSNC.hasBreakdownDefinitions;
```