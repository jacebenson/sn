---
title: "CalculateNextStartAndEnd"
id: "calculatenextstartandend"
---

API Name: global.CalculateNextStartAndEnd

```js
var CalculateNextStartAndEnd = Class.create();
CalculateNextStartAndEnd.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getNextAction: function() {
		var calendarID = this.getParameter('sysparm_calendar_id');
		var spanType = this.getParameter('sysparm_run_type') == "business_calendar_start" ? 12 : 13;
		var when = this.getParameter('sysparm_run_type') == "business_calendar_start" ? "start" : "end";
		var calName = this.getParameter('sysparm_calendar_name');
				
		var newTrigger = new GlideRecord('sys_trigger');
		newTrigger.setValue('business_calendar', calendarID);
		newTrigger.setValue('trigger_type', spanType);
		newTrigger.setValue('offset_type', this.getParameter('sysparm_offset_type'));
		newTrigger.setValue('offset', this.getParameter('sysparm_offset'));
		var recurrenceStart = GlideARecurrence.get(newTrigger);		
		var nextTime = recurrenceStart.next();
		
		var stringList = [when, calName, new GlideDateTime(nextTime).getDisplayValue()];
		
		return gs.getMessage('Job is set to run at the {0} of {1} entries, next action is: {2}', stringList);
	},
	
    type: 'CalculateNextStartAndEnd'
});
```