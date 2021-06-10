---
title: "ScheduleTimeSpan"
id: "scheduletimespan"
---

API Name: global.ScheduleTimeSpan

```js
var ScheduleTimeSpan = Class.create();

ScheduleTimeSpan.prototype = {
	initialize : function() {
	},
	
	getRepeatDescription : function(type, count, start, days, monthly, yearly, month, floatWeek, floatDay, tz) {
		tz = tz || "";
		return GlideScheduleTimeSpan.getRepeatDescription(type, count, start, days, monthly, yearly, month, floatWeek, floatDay, tz);
	}
}
```