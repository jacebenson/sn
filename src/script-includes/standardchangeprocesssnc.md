---
title: "StandardChangeProcessSNC"
id: "standardchangeprocesssnc"
---

API Name: global.StandardChangeProcessSNC

```js
var StandardChangeProcessSNC = Class.create();

StandardChangeProcessSNC.prototype = Object.extendsObject(ChangeProcess, {

	initialize: function(changeGr) {
		ChangeProcess.prototype.initialize.call(this, changeGr);
		this._standardChangeActive = pm.isActive('com.snc.change_management.standard_change_catalog');
		
		if (this._standardChangeActive) {
			var gr = new GlideRecord("std_change_properties");
			gr.addQuery("internal_name", "main_config");
			gr.query();
			if (gr.next())
				this._readOnlyFields = (gr.readonly_fields + "").split(",");
		}
	},

	applyTemplate: function(standardChangeTemplate) {
		if (!this._standardChangeActive)
			return true;

		standardChangeTemplate = this._validateStandardChangeTemplate(standardChangeTemplate);
		if (standardChangeTemplate === null)
			return false;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[apply] template: " + standardChangeTemplate.getGlideRecord().name);

		return standardChangeTemplate.applyToChange(this._gr);
	},

	copyAttachments: function(standardChangeTemplate) {
		standardChangeTemplate = this._validateStandardChangeTemplate(standardChangeTemplate);
		if (standardChangeTemplate === null)
			return false;

		return standardChangeTemplate.copyAttachments(this._gr);
	},

	canWriteTo: function(fieldName) {
		if (!fieldName)
			return false;

		var canWrite = this._gr[fieldName].canWrite() && this._readOnlyFields.indexOf(fieldName) === -1;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[canWriteTo] fieldName: " + fieldName + " canWrite: " + canWrite + " readOnlyFields: " + this._readOnlyFields);

		return canWrite;
	},

	_validateStandardChangeTemplate: function(standardChangeTemplate) {
		if (typeof standardChangeTemplate === "string")
			standardChangeTemplate = StandardChangeTemplate.findById(standardChangeTemplate);

		if (typeof standardChangeTemplate !== "object" || standardChangeTemplate.type !== "StandardChangeTemplate")
			return null;

		return standardChangeTemplate;
	},

	type: "StandardChangeProcessSNC"
});

StandardChangeProcessSNC.newChange = function(standardChangeTemplate, nameValuePairs) {
	var changeProcess = StandardChangeProcess.newChangeProcess(standardChangeTemplate, nameValuePairs);

	if (!changeProcess.insert())
		return null;

	changeProcess.copyAttachments(standardChangeTemplate);
	return changeProcess;
};

StandardChangeProcessSNC.newChangeProcess = function(standardChangeTemplate, nameValuePairs) {
	var changeProcess = new StandardChangeProcess(ChangeRequest.newStandard().getGlideRecord());

	if (pm.isActive("com.snc.change_management.standard_change_catalog")) {
		standardChangeTemplate = typeof standardChangeTemplate === "string" ? StandardChangeTemplate.findById(standardChangeTemplate) : standardChangeTemplate;
		if (!standardChangeTemplate || standardChangeTemplate.type !== "StandardChangeTemplate")
			return null;

		var standardChangeTemplateApplied = changeProcess.applyTemplate(standardChangeTemplate);
		if (!standardChangeTemplateApplied)
			return null;
	}

	var fields = changeProcess.setValues(nameValuePairs);
	if (fields.ignored && fields.ignored.length > 0)
		changeProcess.__ignoredfields = fields.ignored;

	return changeProcess;
};

StandardChangeProcessSNC.findAll = function(orderBy, textSearch, encodedQuery) {
	orderBy = orderBy || ChangeProcessSNC.NUMBER;
	var changeRequestGr = new GlideRecordSecure(ChangeRequest.CHANGE_REQUEST);
	changeRequestGr.addActiveQuery();
	changeRequestGr.addQuery("type", ChangeRequest.STANDARD);

	if (textSearch && textSearch.trim() !== "")
		changeRequestGr.addQuery(ChangeCommon.matchAll(), textSearch);

	if (encodedQuery && encodedQuery.trim() !== "")
		changeRequestGr.addEncodedQuery(encodedQuery);

	changeRequestGr.orderBy(orderBy);
	changeRequestGr.query();
	return changeRequestGr;
};

StandardChangeProcessSNC.findById = function(sysId) {
	if (!sysId)
		return null;

	var changeRequestGr = new GlideRecordSecure(ChangeRequest.CHANGE_REQUEST);
	changeRequestGr.addQuery("type", ChangeRequest.STANDARD);
	changeRequestGr.addQuery("sys_id", sysId);
	changeRequestGr.query();
	if (!changeRequestGr.next())
		return null;

	return new StandardChangeProcess(changeRequestGr);
};

```