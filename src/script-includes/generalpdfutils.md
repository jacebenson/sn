---
title: "GeneralPdfUtils"
id: "generalpdfutils"
---

API Name: global.GeneralPdfUtils

```js
var GeneralPdfUtils = Class.create();
GeneralPdfUtils.prototype = {
	initialize: function() {
		this.pdfParser = new GeneralFormJava.PdfParser();
	},
	
	isPdfTemplate: function (pdfTemplateSysId, pdfTemplateTableName) {
		if (pdfTemplateSysId && pdfTemplateTableName) {
			if(this.isValidPdfTemplateForPreFill(pdfTemplateSysId, pdfTemplateTableName)) 
			   return 'true';
		}
		return 'false';
	},
	
	isFillable : function(attachmentSysId){
		return this.pdfParser.isFillable(attachmentSysId);
	},
	
	prefillPdf : function(jsonString, destinationTableSysId, pdfAttachmentSysId, destinationTableName, pdfName){
		return this.pdfParser.fillForm(jsonString, destinationTableSysId, pdfAttachmentSysId, destinationTableName, pdfName);
	},
	
	mergeImageToPdf : function(documentTableName, documentTableSysId, jsonArrayString, attachmentSysId, pdfName, signatureImage){
		return this.pdfParser.mergeSignatureImageToPdf(documentTableName, documentTableSysId, jsonArrayString, attachmentSysId, pdfName, signatureImage);
	},
	
	getPDFFields : function (attachmentSysId){
		var fields = this.pdfParser.getPDFFields(attachmentSysId);
		return fields;
	},
	
	getFieldType: function (attachmentSysId) {
		var fields = this.pdfParser.getFieldType(attachmentSysId);
		return fields;
	},
	
	isValidPdfTemplateForPreFill : function(pdfTemplateSysId, pdfTemplateTableName){
		if (gs.nil(pdfTemplateTableName) || gs.nil(pdfTemplateSysId))
			return false;
		
		var pdfTemplate = new GlideRecord(pdfTemplateTableName);
		pdfTemplate.get(pdfTemplateSysId);
		if (!gs.nil(pdfTemplate) && !gs.nil(pdfTemplate.document_revision))
			return true;
		else
			return false;
	},
	
	redirectToTask : function(task_table, task_sys_id) {
		var gr = new GlideRecord(task_table);
		if (gr.get(task_sys_id))
			response.sendRedirect(gr.getLink());
		else
			response.sendRedirect(gs.getSession().getStack().bottom());
	},
	
	getPdfTemplate : function(tableName, sysId) {
		var pdfTemplateSysId;
		if (jelly.sysparm_parentRecord) {
			var task = new GlideRecordSecure(tableName);
			task.get(sysId);
			var parent = new GlideRecord(task.parent.sys_class_name);
			if (parent.get(task.parent) && parent.pdf_template)
				pdfTemplateSysId = parent.pdf_template.sys_id;
		} else {
			var gr = new GlideRecordSecure(tableName);
			gr.get(sysId);
			if (gr.pdf_template)
				pdfTemplateSysId = gr.pdf_template.sys_id;
		}
		return pdfTemplateSysId;
	},
	
	getSignatureAcknowledgment: function (table, sysID) {
		
		var signatureText = '';
		var gr = new GlideRecord(table);
		
		//is task table
		if ((typeof jelly != "undefined") && jelly.isInteractive() && jelly.sysparm_parentRecord && gr.get(sysID) && gr.acknowledgment_text) 
				return gr.acknowledgment_text;
		//is case table
		else if (gr.get(sysID) && gr.pdf_template.acknowledgment_text) 
				return gr.pdf_template.acknowledgment_text;
		
		return signatureText;
	},
	
	replaceSignatures: function (table,document,body) {
		var table_extensions = sn_hr_core.hr.TABLE_CASE_EXTENSIONS;
		var caseTable = sn_hr_core.hr.TABLE_CASE;
		if(table == caseTable || table_extensions.toString().indexOf(table) >= 0){
			var hrform = new sn_hr_core.GeneralHRForm(table, document, table, document);
			return hrform.remove_all_variables(hrform.body);
		}
		return '';
	},
	
	type: 'GeneralPdfUtils'
};
```