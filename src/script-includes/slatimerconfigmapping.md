---
title: "SLATimerConfigMapping"
id: "slatimerconfigmapping"
---

API Name: sn_slm_timer.SLATimerConfigMapping

```js
var SLATimerConfigMapping = Class.create();
SLATimerConfigMapping.prototype = Object.extendsObject(SLATimerConfigMappingSNC, {
	initialize: function(_gr, _gs) {
		SLATimerConfigMappingSNC.prototype.initialize.call(this, _gr, _gs);
	},

	type: 'SLATimerConfigMapping'
});
```