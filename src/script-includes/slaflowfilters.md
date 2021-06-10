---
title: "SLAFlowFilters"
id: "slaflowfilters"
---

API Name: global.SLAFlowFilters

```js
var SLAFlowFilters = Class.create();

SLAFlowFilters.prototype = Object.extendsObject(SLAFlowFiltersSNC, {
    initialize: function() {
		SLAFlowFiltersSNC.prototype.initialize.call(this);
    },

    type: 'SLAFlowFilters'
});
```