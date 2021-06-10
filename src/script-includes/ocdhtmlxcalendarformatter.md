---
title: "OCDHTMLXCalendarFormatter"
id: "ocdhtmlxcalendarformatter"
---

API Name: global.OCDHTMLXCalendarFormatter

```js
var OCDHTMLXCalendarFormatter = Class.create();
OCDHTMLXCalendarFormatter.prototype = Object.extendsObject(OCFormatter, {
    initialize: function(groupEvents, targetTZ) {
		this.groupEvents = groupEvents == "group";
		this.groupedEvents = {};
		this.targetTZ = null;
		if (JSUtil.notNil(targetTZ)) {
			var scheduleGdt = new GlideScheduleDateTime();
			scheduleGdt.setTimeZone(targetTZ);
			this.targetTZ = scheduleGdt.getTimeZone();
		}
    },

	_getTimezoneFormattedDateTime: function (date) {
		if (JSUtil.nil(date))
			return "";
		var gdt = new GlideDateTime();
		gdt.setDisplayValueInternal(date);
		gdt.setTZ(this.targetTZ);
		return gdt;
	},

	_getGDTNumericValue: function (gdt) {
		var gdtTemp = new GlideDateTime();
		gdtTemp.setDisplayValueInternal(gdt.getDisplayValueInternal());
		return gdtTemp.getNumericValue();
	},

	formatEvent: function(item) {
		item.id = this.getId(item);
		item.text = item.title;

		if (!item.user_id)
			item.cover = [];

		if (JSUtil.notNil(this.targetTZ)) {
			var formattedGDT;
			if (item.start) {
				item.user_session_start_date = item.start + "";
				formattedGDT = this._getTimezoneFormattedDateTime(item.start);
				item.start = formattedGDT.getDisplayValueInternal();
				item.startNumeric = this._getGDTNumericValue(formattedGDT) + "";
			}

			if (item.end) {
				item.user_session_end_date = item.end;
				formattedGDT = this._getTimezoneFormattedDateTime(item.end);
				item.end = formattedGDT.getDisplayValueInternal();
				item.endNumeric = this._getGDTNumericValue(formattedGDT);
			}

			if (item.actual_start_date) {
				item.user_session_actual_start_date = item.actual_start_date + "";
				item.actual_start_date = this._getTimezoneFormattedDateTime(item.actual_start_date).getDisplayValueInternal();
			}

			if (item.actual_end_date) {
				item.user_session_actual_end_date = item.actual_end_date + "";
				item.actual_end_date = this._getTimezoneFormattedDateTime(item.actual_end_date).getDisplayValueInternal();
			}
		}

		item.start_date = item.start;
		item.end_date = item.end;

		if (this.groupEvents) {
			var key = item.rota_id + "_" + item.startNumeric + "_" + item.endNumeric;

			if (item.type == "timeoff" || item.type == "time_off_in_approval")
				this.groupedEvents[item.id] = item;
			else if (this.groupedEvents[key] && typeof this.groupedEvents[key].cover !== "undefined")
				this.groupedEvents[key].cover.push(item);
			else if (item.hasOwnProperty("cover"))
				this.groupedEvents[key] = item;
			else {
				key = this.isRotaSpanChild(item);
				if (key)
					this.groupedEvents[key].cover.push(item);
			}
		}

		return item;
	},

	isRotaSpanChild: function (item) {
		var keys = Object.keys(this.groupedEvents);
		for (var i = 0; i < keys.length; i++) {
			var rotaInfo = keys[i].split("_");
			var rotaStartNumeric = parseInt(rotaInfo[1], 10);
			var rotaEndNumeric = parseInt(rotaInfo[2], 10);
			if ( item.rota_id == rotaInfo[0] && parseInt(item.startNumeric, 10) >= rotaStartNumeric
				&& parseInt(item.endNumeric, 10) <= rotaEndNumeric )
				return keys[i];
		}

		return "";
	},

	getGroupedEvents: function() {
		var groupedEvents = this.groupedEvents;
		return Object.keys(groupedEvents).map(
			function (key) {
				return groupedEvents[key];
			});
	},

    type: 'OCDHTMLXCalendarFormatter'
});
```