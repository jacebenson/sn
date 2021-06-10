---
title: "OnCallMemberDateSpanSNC"
id: "oncallmemberdatespansnc"
---

API Name: global.OnCallMemberDateSpanSNC

```js
var OnCallMemberDateSpanSNC = Class.create();
OnCallMemberDateSpanSNC.prototype = {
	initialize: function (startGd, endGd) {
		this._log = new GSLog("com.snc.on_call_rotation.log.level", this.type);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[initialize] startGd: " + startGd + " endGd: " + endGd);

		this._startGd = this._processGlideDate(startGd || "");
		this._endGd = this._processGlideDate(endGd || "");
	},

	getStart: function () {
		return this._startGd;
	},

	setStart: function (startGd) {
		this._startGd = startGd;
	},

	getEnd: function () {
		return this._endGd;
	},

	setEnd: function (endGd) {
		this._endGd = endGd;
	},

	equals: function (onCallMemberDateSpan) {
		return this.getStart().getValue() === onCallMemberDateSpan.getStart().getValue() && this.getEnd().getValue() === onCallMemberDateSpan.getEnd().getValue();
	},

	toString: function () {
		if (this._startGd && this._endGd)
			return "[From: " + this._startGd.getValue() + ", To: " + this._endGd.getValue() + "]";
		else if (this._startGd)
			return "[From: " + this._startGd.getValue() + "]";
		else if (this._endGd)
			return "[To: " + this._endGd.getValue() + "]";
		else
			return "";
	},

	_processGlideDate: function (gd) {
		if (typeof gd === "string")
			if (gd)
				return new GlideDateTime(gd).getDate();
		return gd;
	},

	type: 'OnCallMemberDateSpanSNC'
};

```