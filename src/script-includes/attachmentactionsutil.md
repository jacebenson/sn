---
title: "AttachmentActionsUtil"
id: "attachmentactionsutil"
---

API Name: global.AttachmentActionsUtil

```js
var AttachmentActionsUtil = Class.create();
AttachmentActionsUtil.prototype = {
	initialize: function() {},

	getAttachmentIds: function(inputs, outputs) {
		var tableSysID;
		if (inputs.record) {
			if (inputs.record.length == 32) {
				tableSysID = inputs.record;
			} else {
				tableSysID = inputs.record.getValue("sys_id");
			}
		}

		var gr = new GlideRecord("sys_attachment");
		var sysIds = "";

		if (!tableSysID)
			throw "Read Error: Unable to read the Record";

		if (!inputs.deleteAll)
			gr.addQuery("file_name", inputs.file.toString().trim());

		gr.addQuery("table_sys_id", tableSysID.toString().trim());

		try {
			gr.query();
		} catch (e) {

			var grError = ". " + gr.getLastErrorMessage();
			gs.error("Query Error:" + e);
			throw "Error while Query execution. please check System logs" + grError;
		}
		if (gr.getRowCount() == 0)
			gs.info("No attachments found for the " + inputs.record.getTableName() +
				":" + tableSysID);

		while (gr.next()) {

			sysIds = sysIds.concat(gr.getValue("sys_id")).concat(",");
		}

		outputs.AllIds = sysIds;
		return outputs;
	},

	deleteAttachments: function(records) {

		var allIds = records.split(",");

		for (var i = 0; i < allIds.length; i++) {
			var gr = new GlideRecord("sys_attachment");
			gr.addQuery("sys_id", allIds[i]);
			gr.query();
			gr.next();
			try {
				gr.deleteRecord();
			} catch (e) {
				gs.error("Delete error : Unable to delete the record with Sys_id-" +
					allIds[i] + ". Failed with:" + e);
				throw "Delete error : Unable to delete the record with Sys_id-" + allIds[
					i];
			}
		}

	},

	copyAttachments: function(inputs) {

		var fileName = inputs.fromObj.getValue("file_name");
		var contentType = inputs.fromObj.getValue("content_type");

		var gr = new GlideRecord(inputs.table);
		var aStream;
		var id = inputs.fromObj.getValue("sys_id");

		if (!inputs.toObj)
			throw "Empty Target Record";
		if (inputs.toObj && inputs.toObj.length == 32)
			gr.get(inputs.toObj);

		try {
			var gsa = new GlideSysAttachment();
			if (inputs.toObj.length == 32) {
				aStream = gsa.getContentStream(id);
				gsa.writeContentStream(gr, fileName, contentType, aStream);
			} else {
				aStream = gsa.getContentStream(id);
				gsa.writeContentStream(inputs.toObj, fileName, contentType, aStream);
			}


		} catch (e) {
			gs.error("Unable to Copy Attachment. " + e);
			throw "Failed to copy the attachment. Please check System Logs";
		}

	},
	moveAttachments: function(inputs) {
		var id, tableName;
		if (inputs.toObj) {
			if (inputs.toObj.length == 32) {
				id = inputs.toObj;
				tableName = inputs.table;
			} else {
				id = inputs.toObj.getValue("sys_id");
				tableName = inputs.toObj.getTableName();
			}
		} else
			throw "Empty Target Record";

		try {
			inputs.fromObj.setValue("table_name", tableName);
			inputs.fromObj.setValue("table_sys_id", id);
			inputs.fromObj.update();
		} catch (e) {

			gs.error("Unable to Move Attachment. " + e);
			throw "Error while moving attachment. Please check System Logs";

		}

	},

	type: 'AttachmentActionsUtil'
};
```