---
title: "OnCallEscalationUtil"
id: "oncallescalationutil"
---

API Name: global.OnCallEscalationUtil

```js
var OnCallEscalationUtil = Class.create();
OnCallEscalationUtil.prototype = Object.extendsObject(OnCallEscalationUtilSNC, {
	initialize: function () {
		OnCallEscalationUtilSNC.prototype.initialize.call(this);
	},
	type: 'OnCallEscalationUtil'
});
```