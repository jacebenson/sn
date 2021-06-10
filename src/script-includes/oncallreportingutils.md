---
title: "OnCallReportingUtils"
id: "oncallreportingutils"
---

API Name: global.OnCallReportingUtils

```js
var OnCallReportingUtils = Class.create();
OnCallReportingUtils.prototype = Object.extendsObject(OnCallReportingUtilsSNC, {
	initialize: function () {
		OnCallReportingUtilsSNC.prototype.initialize.call(this);
	},

	type: 'OnCallReportingUtils'
});
```