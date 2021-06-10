---
title: "SoCChangeRequestSNC"
id: "socchangerequestsnc"
---

API Name: sn_chg_soc.SoCChangeRequestSNC

```js
var SoCChangeRequestSNC = Class.create();
SoCChangeRequestSNC.prototype = Object.extendsObject(SoC, {

	initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
	},

	getScheduleSpans: function(socDefGr, conflictConfig, usedSchedules) {
		var configItemRelatedScheduleSpans = {
			maintenance: {},
			blackout: {}
		};

		var padding = parseInt(gs.getProperty("sn_chg_soc.schedule_window_days", 30), 10);
		var startDate = new GlideDateTime();
		startDate.setValue(this._gr.getValue(socDefGr.start_date_field + ""));
		startDate.addDaysUTC(-1 * padding);
		var endDate = new GlideDateTime();
		endDate.setValue(this._gr.getValue(socDefGr.end_date_field + ""));
		endDate.addDaysUTC(padding);

		var changeConflictConf = {
			mode: "basic",
			date_range: [startDate, endDate],
			dry_run: true,
			collect_window_data: true,
			allow_partially_overlapping_windows: true,
			blackout: conflictConfig.blackout,
			maintenance: conflictConfig.maintenance,
			include_blackout_window: conflictConfig.include_blackout_window,
			identify_most_critical: false,
			populate_impacted_cis: false,
			cmdb_ancestor: conflictConfig.cmdb_ancestor,
			change_request_ancestor: conflictConfig.change_request_ancestor
		};

		var start = this._log.atLevel(global.GSLog.DEBUG) ? new Date().getTime() : null;
		var configItemRelatedSchedules = this._findConfigItemSchedules(changeConflictConf);
		
		if (!!socDefGr.show_blackout)
			configItemRelatedScheduleSpans.blackout = this._calculateRelatedSpans(configItemRelatedSchedules.blackout, startDate, endDate, usedSchedules);
		if (!!socDefGr.show_maintenance)
			configItemRelatedScheduleSpans.maintenance = this._calculateRelatedSpans(configItemRelatedSchedules.maintenance, startDate, endDate, usedSchedules);
		
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("FIND-SPANS: " + (new Date().getTime() - start));
		
		return configItemRelatedScheduleSpans;
	},

	_findConfigItemSchedules: function (conf) {
		var conflictChecker = new global.ChangeCheckConflicts(this._gr, conf);
		if (!conflictChecker.getWindowData)
			return {maintenance:{}, blackout:{}};
		conflictChecker.check();
		return conflictChecker.getWindowData();
	},

	_calculateRelatedSpans: function (configItemSchedules, startDate, endDate, usedSchedules) {
		var scheduleSpans = {};
		for (var configItem in configItemSchedules)
			if (configItemSchedules.hasOwnProperty(configItem))
				this._factorSchedules(configItemSchedules[configItem], scheduleSpans, usedSchedules, startDate, endDate);
		return scheduleSpans;
	},

	_factorSchedules: function(schedules, scheduleSpans, usedSchedules, startDate, endDate) {
		for (var i = 0; i < schedules.length; i++) {
			// Already calculated spans for this schedule
			if (scheduleSpans[schedules[i].scheduleId])
				continue;
			scheduleSpans[schedules[i].scheduleId] = {
				sys_id: schedules[i].scheduleId,
				spans: []
			};
			var schedule = usedSchedules[schedules[i].scheduleId] ? usedSchedules[schedules[i].scheduleId] : new GlideSchedule(schedules[i].scheduleId);
			usedSchedules[schedules[i].scheduleId] = schedule;
			var timeMap = schedule.getTimeMap(startDate, endDate);
			while (timeMap.hasNext()) {
				var timeSpan = timeMap.next();
				scheduleSpans[schedules[i].scheduleId].spans.push({
					start: timeSpan.getStart().getGlideDateTime().getDisplayValueInternal(),
					end: timeSpan.getEnd().getGlideDateTime().getDisplayValueInternal()
				});
			}
		}
	},

    type: 'SoCChangeRequestSNC'
});
```