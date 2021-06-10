---
title: "OpenNLUCoalescer"
id: "opennlucoalescer"
---

API Name: global.OpenNLUCoalescer

```js
var OpenNLUCoalescer = Class.create();
OpenNLUCoalescer.prototype = {
	initialize: function() {
	},

	coalesce: function(type, value, context) {
		switch (type) {
			case 'BOOLEAN':
				return this.coalesceBoolean(value);
			case 'STATIC_CHOICE':
			case 'REFERENCE_CHOICE':
				return this.coalesceList(value, context);
			case 'DATE':
				return this.coalesceDate(value);
			case 'TIME':
				return this.coalesceTime(value);
			case 'DATE_TIME':
				return this.coalesceDateTime(value);
			case 'TEXT':
			default:
				return this.coalesceText(value);
		}
	},

	coalesceText: function(value) {
		return value;
	},

	coalesceBoolean: function(value) {
		if (!value) {
			return null;
		}
		var normalizedValue = value.toString().toLowerCase();
		if (normalizedValue === 'true' || normalizedValue === 'yes') {
			return 'true';
		}else if (normalizedValue === 'false' || normalizedValue === 'no') {
			return 'false';
			// must return empty if the value doesn't match true or false
		}
		return null;
	},

	coalesceDate: function(value) {
		if (gs.nil(value)) return '';
		value = this._normalizeDateWord(value);

		if (value === 'now') {
			return this._dateTimeObjAsString(this._toDate(gs.now()));
		} else if (value === 'today') {
			return this._dateTimeObjAsString(this._toDate(gs.beginningOfToday()));
		} else if (value === 'tomorrow') {
			return this._dateTimeObjAsString(this._toDate(gs.beginningOfTomorrow()));
		} else if (value === 'yesterday') {
			return this._dateTimeObjAsString(this._toDate(gs.beginningOfYesterday()));
		}

		var coalesced = this._toDate(value);
		return !gs.nil(coalesced) ? this._dateTimeObjAsString(coalesced) : '';
	},

	coalesceTime: function(value) {
		if (gs.nil(value)) return '';
		value = this._normalizeTimeWord(value);

		if (value === 'now') {
			return this._timeObjAsString(this._toTime(gs.nowDateTime()));
		}

		var coalesced = this._toTime(value);
		return !gs.nil(coalesced) ? this._timeObjAsString(coalesced) : '';
	},

	coalesceDateTime: function(value) {
		if (gs.nil(value)) return '';
		value = this._normalizeDateTimeWord(value);

		var baseDateTime = new GlideDateTime();

		if (value === 'now') {
			return this._dateTimeObjAsString(baseDateTime);
		} else if (value === 'today') {
			return this._dateTimeObjAsString(baseDateTime);
		} else if (value === 'tomorrow') {
			baseDateTime.addDaysUTC(1);
			return this._dateTimeObjAsString(baseDateTime);
		} else if (value === 'yesterday') {
			baseDateTime.addDaysUTC(-1);
			return this._dateTimeObjAsString(baseDateTime);
		}

		var coalesced = this._toDateTime(value);
		return !gs.nil(coalesced) ? this._dateTimeObjAsString(coalesced) : '';
	},

	_dateTimeObjAsString: function(obj) {
		if (gs.nil(obj)) return '';
		return '' + obj.toString();
	},

	_timeObjAsString: function(obj) {
		if (gs.nil(obj)) return '';
		return '' + obj.getDisplayValue();
	},

	_normalizeDateWord: function(word) {
		if (gs.nil(word)) return '';
		return word.toLowerCase().trim();
	},

	_normalizeTimeWord: function(word) {
		if (gs.nil(word)) return '';
		return word.toLowerCase().trim();
	},

	_normalizeDateTimeWord: function(word) {
		if (gs.nil(word)) return '';
		return word.toLowerCase().trim();
	},

	_toDate: function(value) {
		if (!gs.nil(value)) {
			var gdt = new GlideDateTime();
			gdt.setValue(value + " 00:00:00");
			if (gdt.isValid()) {
				var gd = new GlideDate();
				gd.setValue(value);
				return gd;
			}
		}
	},

	_toTime: function(value) {
		if (!gs.nil(value)) {
			var gt = new GlideTime();
			gt.setDisplayValue(value);
			if (gt.isValid()) {
				return gt;
			}
		}
	},

	_toDateTime: function(value) {
		if (!gs.nil(value)) {
			var gdt = new GlideDateTime();
			gdt.setValue(value);
			if (gdt.isValid()) {
				return gdt;
			}
		}
	},

	type: 'OpenNLUCoalescer',

	_epochTimeStr: new String(new GlideTime(0).getValue()).valueOf()
};

```