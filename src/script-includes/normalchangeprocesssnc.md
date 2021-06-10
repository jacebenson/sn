---
title: "NormalChangeProcessSNC"
id: "normalchangeprocesssnc"
---

API Name: global.NormalChangeProcessSNC

```js
var NormalChangeProcessSNC = Class.create();

NormalChangeProcessSNC.prototype = Object.extendsObject(ChangeProcess, {

	initialize: function(changeGr) {
		ChangeProcess.prototype.initialize.call(this, changeGr);
	},

	type: "NormalChangeProcessSNC"
});

NormalChangeProcessSNC.findAll = function(orderBy, textSearch, encodedQuery) {
	orderBy = orderBy || ChangeProcessSNC.NUMBER;
	var changeRequestGr = new GlideRecordSecure(ChangeRequest.CHANGE_REQUEST);
	changeRequestGr.addActiveQuery();
	changeRequestGr.addQuery("type", ChangeRequest.NORMAL);

	if (textSearch && textSearch.trim() !== "")
		changeRequestGr.addQuery(ChangeCommon.matchAll(), textSearch);

	if (encodedQuery && encodedQuery.trim() !== "")
		changeRequestGr.addEncodedQuery(encodedQuery);

	changeRequestGr.orderBy(orderBy);
	changeRequestGr.query();
	return changeRequestGr;
};

NormalChangeProcessSNC.findById = function(sysId) {
	if (!sysId)
		return null;

	var changeRequestGr = new GlideRecordSecure(ChangeRequest.CHANGE_REQUEST);
	changeRequestGr.addQuery("type", ChangeRequest.NORMAL);
	changeRequestGr.addQuery("sys_id", sysId);
	changeRequestGr.query();
	if (!changeRequestGr.next())
		return null;

	return new NormalChangeProcess(changeRequestGr);
};

NormalChangeProcessSNC.newChange = function(nameValuePairs) {
	var changeProcess = NormalChangeProcess.newChangeProcess(nameValuePairs);

	if (!changeProcess.insert())
		return null;

	return changeProcess;
};

NormalChangeProcessSNC.newChangeProcess = function(nameValuePairs) {
	var changeProcess = new NormalChangeProcess(ChangeRequest.newNormal().getGlideRecord());
	var fields = changeProcess.setValues(nameValuePairs);
	if (fields.ignored && fields.ignored.length > 0)
		changeProcess.__ignoredfields = fields.ignored;

	return changeProcess;
};

```