---
title: "BusinessCalendarUtil"
id: "businesscalendarutil"
---

API Name: global.BusinessCalendarUtil

```js
var BusinessCalendarUtil = Class.create();
BusinessCalendarUtil.prototype = {
    initialize: function() {
    },

	getAvailableCalendars: function() {
		var gr = new GlideRecord("business_calendar");
		gr.addQuery("is_legacy_schedule", false);
		gr.query();

		while (gr.next()) {
			answer.add(gr.calendar_name, gr.label);
		}
	},
	
    type: 'BusinessCalendarUtil'
};
```