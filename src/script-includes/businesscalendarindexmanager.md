---
title: "BusinessCalendarIndexManager"
id: "businesscalendarindexmanager"
---

API Name: global.BusinessCalendarIndexManager

```js
var BusinessCalendarIndexManager = Class.create();

BusinessCalendarIndexManager.prototype = {

	initialize: function() {
		this.CALENDAR_INDICES = 'calendar_indices';
		this.CALENDAR = 'calendar';
		this.MAX_INDEX_COUNT = 10;
		this.CALENDAR_FOR_INDEX_PREFIX = 'calendar_for_index';
		this.BUSINESS_CALENDAR_SPAN = 'business_calendar_span';
		this.CALENDAR = 'calendar';
		this.START = 'start';
		this.END = 'end';
		this.COUNTER = 'counter';
	},

	buildAllIndexes: function(calendarSysId) {
		var indices = new GlideRecord(this.CALENDAR_INDICES);
		indices.addQuery(this.CALENDAR, calendarSysId);
		indices.query();
		while (indices.next()) {
			for (var i = 0; i < this.MAX_INDEX_COUNT; i++) {
				var indexFieldName = this.CALENDAR_FOR_INDEX_PREFIX + i;
				var containerSysId = indices.getValue(indexFieldName);
				if (containerSysId == null) {
					continue;
				}
				var containerSpans = new GlideRecord(this.BUSINESS_CALENDAR_SPAN);
				containerSpans.addQuery(this.CALENDAR, containerSysId);
				containerSpans.orderBy(this.START);
				containerSpans.query();
				while (containerSpans.next()) {
					var containerIndex = 0;
					var spans = new GlideRecord(this.BUSINESS_CALENDAR_SPAN);
					spans.addQuery(this.CALENDAR, calendarSysId);
					spans.addQuery(this.START, '>=', containerSpans.getValue('start'));
					spans.addQuery(this.START, '<', containerSpans.getValue('end'));
					spans.orderBy(this.START);
					spans.setWorkflow(false);
					spans.query();
					while (spans.next()) {
						var idxFieldName = 'index' + i;
						if (spans.getValue(idxFieldName) != containerIndex) {
							spans.setValue(idxFieldName, containerIndex);
							spans.update();
						}
						containerIndex++;
					}
				}
			}
		}
		this._setValueForCounter(calendarSysId);
	},

	_setValueForCounter: function(aCalendarSysId) {
		var countSetter = new GlideRecord(this.BUSINESS_CALENDAR_SPAN);
		countSetter.addQuery(this.CALENDAR, aCalendarSysId);
		countSetter.setWorkflow(false);
		countSetter.orderBy(this.START);
		countSetter.query();
		var counterValue = 0;
		while (countSetter.next()) {
			if (countSetter.getValue(this.COUNTER) != counterValue) {
				countSetter.setValue(this.COUNTER, counterValue);
				countSetter.update();
			}
			counterValue++;
		}
	},

	_wipeAllIndexes: function(aCalendarSysId) {
		var wipe = new GlideMultipleUpdate(this.BUSINESS_CALENDAR_SPAN);
		wipe.addQuery(this.CALENDAR, aCalendarSysId);
		wipe.setValue(this.COUNTER, null);
		for (var i = 0; i < this.MAX_INDEX_COUNT; i++) {
			var indexFieldName = 'index' + i;
			wipe.setValue(indexFieldName, null);
		}
		wipe.execute();
	},

	type: 'BusinessCalendarIndexManager'	
};
```