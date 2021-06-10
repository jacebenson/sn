---
title: "OnCallReportingUtilsSNC"
id: "oncallreportingutilssnc"
---

API Name: global.OnCallReportingUtilsSNC

```js
var OnCallReportingUtilsSNC = Class.create();
OnCallReportingUtilsSNC.prototype = {
	initialize: function () {
		this.defaultDurationInDays = 6;
		this.maxDurationInDays = this._getMaxDurationInDays();
	},

	TABLES: {
		SYS_USER: 'sys_user'
	},

	_getMaxDurationInDays: function () {
		return gs.getProperty('com.snc.on_call_rotation.reports.max_duration_in_days', 40);
	},

	getOnCallHours: function (groupId, fromGdt, toGdt) {
		var onCallHours = [];

		if (!groupId)
			return onCallHours;

		if (!fromGdt && !toGdt) {
			toGdt = new GlideDateTime();
			fromGdt = new GlideDateTime();
			fromGdt.addDaysUTC(0 - this.defaultDurationInDays);
		}
		else if (fromGdt && !toGdt) {
			toGdt = new GlideDateTime(fromGdt);
			toGdt.addDaysUTC(this.defaultDurationInDays);
		}
		else if (!fromGdt && toGdt) {
			fromGdt = new GlideDateTime(toGdt);
			fromGdt.addDaysUTC(0 - this.defaultDurationInDays);
		}

		if (this._isExceedingMaxDuration(fromGdt, toGdt))
			return [];

		var fromLocalDate = this._getUserLocalDate(gs.getUserID(), fromGdt);
		var toLocalDate = this._getUserLocalDate(gs.getUserID(), toGdt);

		var adjustedFromGdt = new GlideDateTime();
		adjustedFromGdt.setDisplayValueInternal(fromLocalDate + ' 00:00:00');

		var adjustedToGdt = new GlideDateTime();
		adjustedToGdt.setDisplayValueInternal(toLocalDate + ' 23:59:59');
		adjustedToGdt.addSeconds(1);

		var spans = new OCRotationV2(null, new OCDHTMLXCalendarFormatter())
			.setGroupIds(groupId)
			.setStartDate(adjustedFromGdt.getDisplayValueInternal())
			.setEndDate(adjustedToGdt.getDisplayValueInternal())
			.getSpans();

		for (var i = 0; i < spans.length; i++) {
			var span = spans[i];

			if (this._isTimeOffSpan(span))
				continue;

			//check if start time is before range
			var spanStartTimeGdt = new GlideDateTime();
			spanStartTimeGdt.setDisplayValueInternal(span.start);
			if (spanStartTimeGdt.before(adjustedFromGdt)) {
				spanStartTimeGdt = new GlideDateTime(adjustedFromGdt.getValue());
				span.start = adjustedFromGdt.getDisplayValueInternal();
			}

			//check if end time is after range
			var spanEndTimeGdt = new GlideDateTime();
			spanEndTimeGdt.setDisplayValueInternal(span.end);
			if (spanEndTimeGdt.after(adjustedToGdt)) {
				spanEndTimeGdt = new GlideDateTime(adjustedToGdt.getValue());
				span.end = adjustedToGdt.getDisplayValueInternal();
			}

			if (spanStartTimeGdt.getLocalDate().getDisplayValueInternal() == spanEndTimeGdt.getLocalDate().getDisplayValueInternal()) {
				//single day span
				onCallHours.push(this._getSpanRow(span, groupId, spanStartTimeGdt.getLocalDate(), spanStartTimeGdt, spanEndTimeGdt));
			}
			else {
				//multiday span
				var spanRangeDates = [];
				while (spanStartTimeGdt.before(spanEndTimeGdt)) {
					spanRangeDates.push(spanStartTimeGdt.getLocalDate());
					var endOfDay = gs.endOfDay(spanStartTimeGdt);
					var beginningOfTomorrowGdt = new GlideDateTime(endOfDay);
					beginningOfTomorrowGdt.addSeconds(1);
					spanStartTimeGdt = beginningOfTomorrowGdt;
				}

				for (var j = 0; j < spanRangeDates.length; j++) {
					var spanRangeDate = spanRangeDates[j];
					var clonedSpan = this._cloneObject(span);

					var clonedSpanStartTimeGdt = new GlideDateTime();
					clonedSpanStartTimeGdt.setDisplayValueInternal(clonedSpan.start);

					var clonedSpanEndTimeGdt = new GlideDateTime();
					clonedSpanEndTimeGdt.setDisplayValueInternal(clonedSpan.end);

					if (j == 0) {
						//this is first span
						clonedSpanEndTimeGdt.setDisplayValueInternal(spanRangeDate.getValue() + ' 23:59:59');
						clonedSpanEndTimeGdt.addSeconds(1);
					} else if (j == spanRangeDates.length - 1) {
						//this is last span
						clonedSpanStartTimeGdt.setDisplayValueInternal(spanRangeDate.getValue() + ' 00:00:00');
					} else {
						clonedSpanStartTimeGdt.setDisplayValueInternal(spanRangeDate.getValue() + ' 00:00:00');
						clonedSpanEndTimeGdt.setDisplayValueInternal(spanRangeDate.getValue() + ' 23:59:59');
						clonedSpanEndTimeGdt.addSeconds(1);
					}

					onCallHours.push(this._getSpanRow(clonedSpan, groupId, spanRangeDate, clonedSpanStartTimeGdt, clonedSpanEndTimeGdt));
				}
			}
		}

		return onCallHours;
	},

	_isExceedingMaxDuration: function (fromGdt, toGdt) {
		if (!fromGdt || !toGdt)
			return false;

		var difference = gs.dateDiff(fromGdt.getDisplayValueInternal(), toGdt.getDisplayValueInternal());
		var duration = new GlideDuration(difference);
		var durationInDays = duration.getNumericValue() / (24 * 60 * 60 * 1000);

		if (durationInDays > this.maxDurationInDays)
			return true;

		return false;
	},

	_isTimeOffSpan: function (span) {
		return span.type == 'timeoff';
	},

	_getSpanType: function (span) {
		if (span.type == 'roster' || span.type == 'override' || span.type == 'timeoff')
			return 'user';
		else if (span.type == 'rota')
			return 'rota';
	},

	_getSpanRow: function (span, groupId, date, startTimeGdt, endTimeGdt) {
		var onCallHour = {
			id: span.id,
			sys_id: gs.generateGUID(),
			span_type: this._getSpanType(span),
			group: groupId,
			user: span.user_id,
			date: date,
			start_time: startTimeGdt,
			end_time: endTimeGdt,
			rota: span.rota_id,
			roster: span.roster_id,
			duration: this._getDuration(startTimeGdt, endTimeGdt)
		};

		return onCallHour;
	},

	_getDuration: function (fromGdt, toGdt) {
		var difference = gs.dateDiff(fromGdt.getDisplayValueInternal(), toGdt.getDisplayValueInternal());
		return new GlideDuration(difference);
	},

	_cloneObject: function (obj) {
		return JSON.parse(JSON.stringify(obj));
	},

	_getUserLocalDate: function (userSysId, gdt) {
		var userTZ = this._getUserTZ(userSysId);
		var userGdt = gdt ? new GlideDateTime(gdt.getValue()) : new GlideDateTime();
		userGdt.setTZ(userTZ);
		return userGdt.getLocalDate();
	},

	_getUserTimeZone: function (userSysId) {
		if (!userSysId)
			return new GlideUser().getSysTimeZone();
		var userGr = new GlideRecord(this.TABLES.SYS_USER);
		userGr.get(userSysId);
		var userTimeZone = userGr.time_zone;
		if (userTimeZone)
			return userTimeZone;
		//user doesn't have timezone, fallback to system timezone
		return new GlideUser().getSysTimeZone();
	},
	_getUserTZ: function (userSysId) {
		var userTimeZone = this._getUserTimeZone(userSysId);
		var schedule = new GlideSchedule();
		schedule.setTimeZone(userTimeZone);
		var userTZ = schedule.getTZ();
		return userTZ;
	},

	type: 'OnCallReportingUtilsSNC'
};
```