---
title: "SLATimer"
id: "slatimer"
---

API Name: sn_slm_timer.SLATimer

```js
var SLATimer = Class.create();

SLATimer.prototype = Object.extendsObject(SLATimerSNC, {
	initialize: function(_gr, _gs) {
		SLATimerSNC.prototype.initialize.call(this, _gr, _gs);
	},

	type: 'SLATimer'
});
```