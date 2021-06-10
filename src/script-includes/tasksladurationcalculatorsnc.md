---
title: "TaskSLADurationCalculatorSNC"
id: "tasksladurationcalculatorsnc"
---

API Name: global.TaskSLADurationCalculatorSNC

```js
var TaskSLADurationCalculatorSNC = Class.create();
TaskSLADurationCalculatorSNC.prototype = {
	SLA_ALWAYS_RUN_RELDUR_SCRIPT_PROPERTY: 'com.snc.sla.calculation.always_run_relative_duration_script',

    initialize: function(taskSLAGr, slaDefGr) {
		this.alwaysRunRelDurScript = (gs.getProperty(this.SLA_ALWAYS_RUN_RELDUR_SCRIPT_PROPERTY, 'false') === 'true');
		this.slaUtil = new SLAUtil();

		this.taskSLAGr = null;
		this.slaDefGr = null;
		this.slaDurationMs = null;
		this.durationCalculator = null;

		if (slaDefGr && slaDefGr.isValid()) {
			this.slaDefGr = slaDefGr;
		}

		if (taskSLAGr && taskSLAGr.isValid()) {
			this.taskSLAGr = taskSLAGr;
			if (this.slaDefGr === null)
				this.slaDefGr = this.slaUtil.getSLADefFromTaskSLA(this.taskSLAGr);
		}
    },

	setSLADurationMs: function(slaDurationMs) {
		if (slaDurationMs !== null && !isNaN(parseInt(slaDurationMs)) && slaDurationMs > 0)
			this.slaDurationMs = parseInt(slaDurationMs);

		return this;
	},

	calcEndTimeByPercentage: function(percentage) {
		var endTime = null;

		if (!percentage || isNaN(percentage))
			return endTime;

		if (this.taskSLAGr === null || this.slaDefGr === null)
			return endTime;

		/* if we haven't been provided the duration of our Task SLA or the SLA is a relative duration
		   and the "...always_run_relative_duration_script" property is true then we have to go
		   and calculate the sla duration */	
		if ((!this.slaDefGr.duration_type.nil() && this.alwaysRunRelDurScript)
			|| isNaN(parseInt(this.slaDurationMs))
			|| this.slaDurationMs === 0) {
			this.slaDurationMs = this.slaUtil.getSLADurationInMs(this.taskSLAGr, this.slaDefGr);
		}

		// If we're being asked for exactly 100% of the duration then this is just the Breach time so we can return that
		if (percentage === 100)
			return this.taskSLAGr.planned_end_time.getGlideObject();

		// Work out the number of seconds we have based on the percentage required of the duration + any pause time
		var duration = Math.floor(((this.slaDurationMs * (percentage / 100)) + this.taskSLAGr.business_pause_duration.dateNumericValue()) / 1000);
		var	durationCalculator = this.slaUtil.getDurationCalculatorForTaskSLA(this.taskSLAGr);
		durationCalculator.calcDuration(duration);
		
		return durationCalculator.getEndDateTime();
	},

    type: 'TaskSLADurationCalculatorSNC'
};
```