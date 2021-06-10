---
title: "GregorianCalendarGenerator"
id: "gregoriancalendargenerator"
---

API Name: global.GregorianCalendarGenerator

```js
var GregorianCalendarGenerator = Class.create();

GregorianCalendarGenerator.prototype = {
	initialize: function() {
		this.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
			"November", "December"];
		this.FIRST_YEAR_OF_EPOCH = 1970;
		this.YEARS_IN_FUTURE = 10;
		this.BUSINESS_CALENDAR = 'business_calendar';
		this.CALENDARS_FOR_PACKAGE = 'calendars_for_package';
		this.SYS_PACKAGE = 'sys_package';
		this.CALENDAR_INDICES = 'calendar_indices';
		this.CALENDAR_FOR_INDEX = 'calendar_for_index';
		this.BUSINESS_CALENDAR_SPAN = 'business_calendar_span';
		this.BUSINESS_CALENDAR_SPAN_NAME = 'business_calendar_span_name';
		this.YEAR_CALENDAR_SYS_ID = '017d95a353f3001076bcddeeff7b121a';
		this.QUARTER_CALENDAR_SYS_ID = '857ddda353f3001076bcddeeff7b12af';
		this.MONTH_CALENDAR_SYS_ID = '4d7ddda353f3001076bcddeeff7b12b1';
		this.WEEK_CALENDAR_SYS_ID = '2d87b2e7530c101076bcddeeff7b1225';
		this.CALENDAR = 'calendar';
		this.START = 'start';
		this.END = 'end';
	},

	createSpansFromStartOfEpoch: function() {
		// from 1970-01-01 to 10 years in the future
		this.createSpans(this.FIRST_YEAR_OF_EPOCH, new GlideDateTime().getYearLocalTime() - this.FIRST_YEAR_OF_EPOCH + this.YEARS_IN_FUTURE);
	},

	createSpans: function(startYear, count) {
		if (!this._calendarExists(this.YEAR_CALENDAR_SYS_ID)) {
			gs.error('Calendar [Year] missing, unable to continue! business_calendar_' + this.YEAR_CALENDAR_SYS_ID + '.xml');
			return;
		}
		if (!this._calendarExists(this.QUARTER_CALENDAR_SYS_ID)) {
			gs.error('Calendar [Quarter] missing, unable to continue! business_calendar_' + this.QUARTER_CALENDAR_SYS_ID + '.xml');
			return;
		}
		if (!this._calendarExists(this.MONTH_CALENDAR_SYS_ID)) {
			gs.error('Calendar [Month] missing, unable to continue! business_calendar_' + this.MONTH_CALENDAR_SYS_ID + '.xml');
			return;
		}

		this._createSpansByDate(new GlideDateTime(startYear + '-01-01 00:00:00'), new GlideDateTime((startYear + count) + '-01-01 00:00:00'));
	},

	_calendarExists: function(aCalendarSysId) {
		var check = new GlideRecord(this.BUSINESS_CALENDAR);
		return check.get(aCalendarSysId);
	},

	_createSpansByDate: function(start, end) {
		var startYear = start.getYearUTC();
		var yearCount = end.getYearUTC() - startYear;
		for (var y = startYear; y < (startYear + yearCount); y++) {
			var fdYear = new GlideDateTime();
			fdYear.setValue(y + '-01-01 00:00:00');
			var ldYear = new GlideDateTime(fdYear);
			ldYear.addYearsUTC(1);
			if (!this._spanExists(this.YEAR_CALENDAR_SYS_ID, fdYear.getValue(), ldYear.getValue())) {
				this._newSpan(this.YEAR_CALENDAR_SYS_ID, y.toString(), fdYear.getValue(), ldYear.getValue());
			}

			for (var q = 0; q < 4; q++) {
				var fdQuarter = new GlideDateTime();
				fdQuarter.setValue(y + '-' + ((q * 3) + 1) + '-01 00:00:00');
				var ldQuarter = new GlideDateTime(fdQuarter);
				ldQuarter.addMonthsUTC(3);
				if (!this._spanExists(this.QUARTER_CALENDAR_SYS_ID, fdQuarter.getValue(), ldQuarter.getValue())) {
					this._newSpan(this.QUARTER_CALENDAR_SYS_ID, "Q" + (q + 1), fdQuarter.getValue(), ldQuarter.getValue());
				}

				for (var m = 1; m <= 3; m++) {
					var fdMonth = new GlideDateTime();
					var monthNumber = (q * 3 + m);
					fdMonth.setValue(y + '-' + monthNumber + '-01 00:00:00');
					var monthDays = fdMonth.getDaysInMonthUTC();
					var ldMonth = new GlideDateTime(fdMonth);
					ldMonth.addMonthsUTC(1);
					if (!this._spanExists(this.MONTH_CALENDAR_SYS_ID, fdMonth.getValue(), ldMonth.getValue())) {
						this._newSpan(this.MONTH_CALENDAR_SYS_ID, this.MONTHS[monthNumber - 1], fdMonth.getValue(), ldMonth.getValue());
					}
				}
			}
		}
		if (!this._calendarExists(this.WEEK_CALENDAR_SYS_ID)) {
			gs.warning('Calendar [Week] missing, unable to continue! business_calendar_' + this.WEEK_CALENDAR_SYS_ID + '.xml');
			return;
		}
		// gs.beginningOfWeek() ALWAYS takes the parameter as a local datetime... Converting this back to UTC
		var temp = new GlideDateTime(gs.beginningOfWeek(start.getValue()));
		var weekStart = new GlideDateTime(temp.getDisplayValue());
		var weekEnd = new GlideDateTime(weekStart);
		weekEnd.addWeeksUTC(1);
		var endOfCalendar = new GlideDateTime((startYear + yearCount) + '-01-01');
		while (weekStart.onOrBefore(endOfCalendar)) {
			if (!this._spanExists(this.WEEK_CALENDAR_SYS_ID, weekStart.getValue(), weekEnd.getValue())) {
				this._newSpan(this.WEEK_CALENDAR_SYS_ID, 'Week ' + weekStart.getWeekOfYearUTC(), weekStart.getValue(), weekEnd.getValue());
			}
			weekStart.addWeeksUTC(1);
			weekEnd.addWeeksUTC(1);
		}
	},

	_spanExists: function(aCalendarSysId, start, end) {
		var existGr = new GlideRecord(this.BUSINESS_CALENDAR_SPAN);
		existGr.addQuery(this.CALENDAR, aCalendarSysId);
		existGr.addQuery(this.START, start);
		existGr.addQuery(this.END, end);
		existGr.query();
		return existGr.next();
	},

	_getAncestors: function(aCalendar) {
		if (aCalendar == null) {
			return null;
		}
		var result = [aCalendar];
		var parentGr = new GlideRecord(this.BUSINESS_CALENDAR);
		if (parentGr.get(aCalendar)) {
			var p = this._getAncestors(parentGr.parent);
			if (p != null) {
				for (var k = 0; k < p.length; k++)
					result.push(p[k]);
			}
			return result;
		}
	},

	_newSpan: function(calendarId, spanName, start, end) {
		var spanGr = new GlideRecord(this.BUSINESS_CALENDAR_SPAN);
		spanGr.newRecord();
		spanGr.setValue('start', start);
		spanGr.setValue('end', end);
		var spanNameId = this._createSpanName(calendarId, null, spanName);
		spanGr.setValue('span_name', spanNameId);
		spanGr.setValue('calendar', calendarId);
		spanGr.setWorkflow(false);
		return spanGr.insert();
	},

	_createSpanName: function(calendarId, longName, shortName) {
		var spanNameGr = new GlideRecord(this.BUSINESS_CALENDAR_SPAN_NAME);
		spanNameGr.newRecord();
		spanNameGr.setValue('calendar', calendarId);
		spanNameGr.setValue('long_name', longName);
		spanNameGr.setValue('short_name', shortName);
		spanNameGr.setValue('label', shortName);
		return spanNameGr.insert();
	},

	_wipeAllCalendarSpans: function (daysAgo) {
		var yesterday = new GlideDateTime();
		yesterday.addDaysLocalTime(-daysAgo);

		var tables_2_clean = [this.BUSINESS_CALENDAR_SPAN_NAME, this.BUSINESS_CALENDAR_SPAN];

		for (var t = 0; t < tables_2_clean.length; t++) {
			var clean = new GlideMultipleDelete(tables_2_clean[t]);
			clean.addQuery('sys_created_on', '>', yesterday);
			clean.execute();
		}
	},

	type: 'GregorianCalendarGenerator'
};
```