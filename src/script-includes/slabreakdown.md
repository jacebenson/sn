---
title: "SLABreakdown"
id: "slabreakdown"
---

API Name: sn_sla_brkdwn.SLABreakdown

```js
var SLABreakdown = Class.create();

SLABreakdown.SLA_BREAKDOWN_DEFINITION = "sla_breakdown_definition";
SLABreakdown.SLA_BREAKDOWN_DEFINITION_FIELD = "sla_breakdown_definition_field";
SLABreakdown.SLA_DEFINITION_SLA_BREAKDOWN = "sla_definition_sla_breakdown";
SLABreakdown.SLA_BREAKDOWN_CORE = "sla_breakdown_core";

SLABreakdown.BREAKDOWN_FIELD_TYPES = ["reference"];

SLABreakdown.prototype = Object.extendsObject(SLABreakdownSNC, {
    initialize: function() {
    },

    type: 'SLABreakdown'
});
```