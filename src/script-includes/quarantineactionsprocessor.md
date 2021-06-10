---
title: "QuarantineActionsProcessor"
id: "quarantineactionsprocessor"
---

API Name: global.QuarantineActionsProcessor

```js
var QuarantineActionsProcessor = Class.create();
QuarantineActionsProcessor.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	restoreQuarantinedFiles: function () {
		if (!gs.hasRole('antivirus_admin'))
			return;
		var objSysIds = this.getParameter('sysparm_obj_list');
		var tblName = this.getParameter('sysparm_table_name');
		var objList = objSysIds.split(',');

		for (var i = 0; i < objList.length; i++) {
			if (objList[i] == null || objList[i] == '') 
				continue;

			var gr = new GlideRecord(tblName);
			if (gr.get(objList[i])) {
				var attachmentGr = new GlideRecord('sys_attachment');
				if (attachmentGr.get(gr.sa_sys_id)) {
					attachmentGr.state = 'available';
					attachmentGr.update();
					this.logAction('restored', gr.sa_sys_id);
				}
			}
		}
	},

	deleteQuarantinedFiles: function () {
		if (!gs.hasRole('antivirus_admin'))
			return;
		var objSysIds = this.getParameter('sysparm_obj_list');
		var tblName = this.getParameter('sysparm_table_name');
		var objList = objSysIds.split(',');

		for (var i = 0; i < objList.length; i++) {
			if (objList[i] == null || objList[i] == '') 
				continue;
			var gr = new GlideRecord(tblName);
			if (gr.get(objList[i])) {
				var attachmentGr = new GlideRecord('sys_attachment');
				if (attachmentGr.get(gr.sa_sys_id) && attachmentGr.canDelete()) {
					this.logAction('deleted', gr.sa_sys_id);
					attachmentGr.deleteRecord();
				}
			}
		}
	},
	
	countDeletableFiles: function () {
		var objSysIds = this.getParameter('sysparm_obj_list');
		var tblName = this.getParameter('sysparm_table_name');
		var objList = objSysIds.split(',');
		var deletableFileCount = 0;

		for (var i = 0; i < objList.length; i++) {
			if (objList[i] == null || objList[i] == '') 
				continue;
			var gr = new GlideRecord(tblName);
			if (gr.get(objList[i])) {
				var attachmentGr = new GlideRecord('sys_attachment');
				if (attachmentGr.get(gr.sa_sys_id) && attachmentGr.canDelete())
					deletableFileCount++;
			}
		}
		return deletableFileCount;
	},
	
	getAttachmentIds: function () {
		var objSysIds = this.getParameter('sysparm_obj_list');
		var tblName = this.getParameter('sysparm_table_name');
		var objList = objSysIds.split(',');
		var attachmentSysIds = '';

		for (var i = 0; i < objList.length; i++) {
			if (objList[i] == null || objList[i] == '') 
				continue;
			var gr = new GlideRecord(tblName);
			if (gr.get(objList[i])) {			
				attachmentSysIds += gr.sa_sys_id;
				attachmentSysIds += ',';
			}
		}
		return attachmentSysIds;
	},

	logAction: function (event, attachmentId) {
		var logTblName = 'antivirus_activity';
		var quarantinedRec = new GlideRecord(logTblName);
		quarantinedRec.addQuery('attachment_id', attachmentId);
		quarantinedRec.query();

		if (quarantinedRec.next()) {
			var gr = new GlideRecord(logTblName);
			gr.initialize();
			gr.event = event;
			gr.event_source = 'from_quarantine';
			gr.event_time = new GlideDateTime();
			gr.event_by = gs.getUserID();
			gr.attachment_id = quarantinedRec.attachment_id;
			gr.file_name = quarantinedRec.file_name;
			gr.virus = quarantinedRec.virus;
			gr.table_name = quarantinedRec.table_name;
			gr.detected = quarantinedRec.detected;
			gr.uploader = quarantinedRec.uploader;
			gr.table_sys_id = quarantinedRec.table_sys_id;
			gr.virus_detected = quarantinedRec.virus_detected;

			gr.insert();
		}
	},

	type: 'QuarantineActionsProcessor'
});
```