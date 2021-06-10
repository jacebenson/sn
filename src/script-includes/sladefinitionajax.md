---
title: "SLADefinitionAJAX"
id: "sladefinitionajax"
---

API Name: global.SLADefinitionAJAX

```js
var SLADefinitionAJAX = Class.create();

SLADefinitionAJAX.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	/**
     * Creates an example breach time message.
     * 
     * @param sysparm_schedule String schedule id
     * @param sysparm_duration String duration
     * 
     * @return String
     */
	getExampleBreachTime: function() {
		var scheduleId = this.getParameter("sysparm_schedule");
		var duration = this.getParameter("sysparm_duration");

		if (!duration)
			return null;

		var startDate = new GlideDateTime();
		var slaDef = new SLADefinition();
		slaDef.setSchedule(scheduleId);
		slaDef.setDuration(duration);

		var endDate = slaDef.getExampleBreachTime(startDate);
		if (!endDate)
			return null;

		var dateDifference = endDate.getNumericValue() - startDate.getNumericValue();
		var actualElapsedTime = new GlideDuration(dateDifference);

		return gs.getMessage("An SLA starting now will breach on {0} (Actual elapsed time: {1})", [ endDate.getDisplayValue(), actualElapsedTime.getDisplayValue() ]);
	},

	validateDurationGetExampleBreach: function() {
		var scheduleId = this.getParameter("sysparm_schedule");
		var duration = this.getParameter("sysparm_duration");
		var slaDef = new SLADefinition();

		var answer = {};

		if (!duration)
			return null;

		slaDef.setSchedule(scheduleId);
		slaDef.setDuration(duration);

		answer.durationMessage = slaDef.validateDurationValue();
		if (!answer.durationMessage) {
			var startDate = new GlideDateTime();

			var endDate = slaDef.getExampleBreachTime(startDate);
			if (endDate) {
				var dateDifference = endDate.getNumericValue() - startDate.getNumericValue();
				var actualElapsedTime = new GlideDuration(dateDifference);

				answer.breachTime = gs.getMessage("An SLA starting now will breach on {0} (Actual elapsed time: {1})", [endDate.getDisplayValue(), actualElapsedTime.getDisplayValue()]);
			}
		}

		return new JSON().encode(answer);
	},

	type: 'SLADefinitionAJAX'
});
```