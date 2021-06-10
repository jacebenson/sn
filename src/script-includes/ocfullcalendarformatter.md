---
title: "OCFullCalendarFormatter"
id: "ocfullcalendarformatter"
---

API Name: global.OCFullCalendarFormatter

```js
var OCFullCalendarFormatter = Class.create();
OCFullCalendarFormatter.prototype = Object.extendsObject(OCFormatter, {
	initialize: function() {
	},
	
	formatEvent: function(item) {
		return {
			id: this.getId(item),
			title: item.title,
			color: item.color,
			textColor: item.textColor,
			start: item.start,
			end: item.end,
			sys_id: item.sys_id,
			table: item.table,
			rota_id: item.rota_id,
			roster_id: item.roster_id,
			user_id: item.user_id,
			group_id: item.group_id
		};
	},
	
	type: 'OCFullCalendarFormatter'
});
```