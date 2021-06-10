---
title: "StandardChangeTemplateSNC"
id: "standardchangetemplatesnc"
---

API Name: global.StandardChangeTemplateSNC

```js
var StandardChangeTemplateSNC = Class.create();

StandardChangeTemplateSNC.CHANGE_RECORD_PRODUCER = "std_change_record_producer";
StandardChangeTemplateSNC.CHANGE_TEMPLATE = "std_change_template";

StandardChangeTemplateSNC.prototype = Object.extendsObject(ChangeProcess, {

	initialize: function(_gr, _gs) {
		ChangeProcess.prototype.initialize.call(this, _gr, _gs);
	},

	applyToChange: function(changeRequestGr) {
		if (!changeRequestGr)
			return false;

		changeRequestGr.std_change_producer_version = this.getGlideRecord().current_version + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[applyToChange] std_change_producer_version sysId: " + changeRequestGr.std_change_producer_version);

		var isTableExtOfStdChgRecProd = GlideDBObjectManager.getTables(this.getGlideRecord().getTableName()).contains(StandardChangeTemplateSNC.CHANGE_RECORD_PRODUCER)

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[applyToChange] isTableExtOfStdChgRecProd: " + isTableExtOfStdChgRecProd);

		if (isTableExtOfStdChgRecProd)
			return new GlideTemplate.getFromRecord(this.getGlideRecord().template.getRefRecord()).apply(changeRequestGr) === 0 ? true : false;

		return false;
	},

	copyAttachments: function(changeRequestGr) {
		// if two step enabled, Business Rule will copy the attachments
		if (new global.StdChangeUtils().isChangeStandardAndTwoStepEnabled(changeRequestGr))
			return true;

		var sourceTable = StandardChangeTemplateSNC.CHANGE_RECORD_PRODUCER;
		var sourceId = changeRequestGr.std_change_producer_version.std_change_producer + "";
		var targetTable = changeRequestGr.getTableName();
		var targetId = changeRequestGr.sys_id + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[copyAttachments] sourceTable: " + sourceTable + " sourceId: " + sourceId + " targetTable:" + targetTable + " targetId: " + targetId);

		var attachmentsGr = new GlideSysAttachment().getAttachments(sourceTable, sourceId);
		var attachmentCount = attachmentsGr.getRowCount();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[copyAttachments] attachmentCount: " + attachmentCount);

		if (attachmentCount < 1)
			return true;

		var attachments = GlideSysAttachment.copy(sourceTable, sourceId, targetTable, targetId);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[copyAttachments] copied attachments size: " + attachments.size());

		if (attachments.size() !== attachmentCount) {
			if (this._log.atLevel(GSLog.ERROR))
				this._log.error("[copyAttachments] failed to copy attachments to: " + changeRequestGr.getDisplayValue());

			return false;
		}

		return true;
	},

    type: "StandardChangeTemplateSNC"
});

StandardChangeTemplateSNC.findById = function(sysId) {
	if (!sysId)
		return null;

	var changeRecordProducerGr = new GlideRecordSecure(StandardChangeTemplateSNC.CHANGE_RECORD_PRODUCER);
	if (!changeRecordProducerGr.get(sysId))
		return null;

	return new StandardChangeTemplate(changeRecordProducerGr);
};

StandardChangeTemplateSNC.findAll = function(orderBy, textSearch, encodedQuery) {
	orderBy = orderBy || ChangeProcess.NAME;

	var changeRecordProducerGr = new GlideRecordSecure(StandardChangeTemplateSNC.CHANGE_RECORD_PRODUCER);
	changeRecordProducerGr.addActiveQuery();
	changeRecordProducerGr.addQuery("retired", false);
	if (textSearch !== undefined && textSearch !== "undefined" && textSearch.trim() !== "")
		changeRecordProducerGr.addQuery("template.name", "CONTAINS", textSearch).addOrCondition("template.short_description", "CONTAINS", textSearch);

	if (encodedQuery !== undefined && encodedQuery !== "undefined" && encodedQuery.trim() !== "")
		changeRecordProducerGr.addEncodedQuery(encodedQuery);

	changeRecordProducerGr.orderBy(orderBy);
	changeRecordProducerGr.query();
	return changeRecordProducerGr;
};

```