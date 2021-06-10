---
title: "EmergencyChangeProcessSNC"
id: "emergencychangeprocesssnc"
---

API Name: global.EmergencyChangeProcessSNC

```js
var EmergencyChangeProcessSNC = Class.create();
 
EmergencyChangeProcessSNC.prototype = Object.extendsObject(ChangeProcess, {

	initialize: function(changeGr) {
		ChangeProcess.prototype.initialize.call(this, changeGr);
	},

	type: "EmergencyChangeProcessSNC"
});

EmergencyChangeProcessSNC.findAll = function(orderBy, textSearch, encodedQuery) {
	orderBy = orderBy || ChangeProcessSNC.NUMBER;
	var changeRequestGr = new GlideRecordSecure(ChangeRequest.CHANGE_REQUEST);
	changeRequestGr.addActiveQuery();
	changeRequestGr.addQuery("type", ChangeRequest.EMERGENCY);

	if (textSearch && textSearch.trim() !== "")
		changeRequestGr.addQuery(ChangeCommon.matchAll(), textSearch);

	if (encodedQuery && encodedQuery.trim() !== "")
		changeRequestGr.addEncodedQuery(encodedQuery);

	changeRequestGr.orderBy(orderBy);
	changeRequestGr.query();
	return changeRequestGr;
};

EmergencyChangeProcessSNC.findById = function(sysId) {
	if (!sysId)
		return null;

	var changeRequestGr = new GlideRecordSecure(ChangeRequest.CHANGE_REQUEST);
	changeRequestGr.addQuery("type", ChangeRequest.EMERGENCY);
	changeRequestGr.addQuery("sys_id", sysId);
	changeRequestGr.query();
	if (!changeRequestGr.next())
		return null;

	return new EmergencyChangeProcess(changeRequestGr);
};

EmergencyChangeProcessSNC.newChange = function(nameValuePairs) {
	var changeProcess = EmergencyChangeProcess.newChangeProcess(nameValuePairs);

	if (!changeProcess.insert())
		return null;

	return changeProcess;
};

EmergencyChangeProcessSNC.newChangeProcess = function(nameValuePairs) {
	var changeProcess = new EmergencyChangeProcess(ChangeRequest.newEmergency().getGlideRecord());
	var fields = changeProcess.setValues(nameValuePairs);
	if (fields.ignored && fields.ignored.length > 0)
		changeProcess.__ignoredfields = fields.ignored;

	return changeProcess;
};

```