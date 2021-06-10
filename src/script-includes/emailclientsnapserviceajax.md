---
title: "EmailClientSnapServiceAjax"
id: "emailclientsnapserviceajax"
---

API Name: global.EmailClientSnapServiceAjax

```js
var EmailClientSnapServiceAjax = Class.create();
EmailClientSnapServiceAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getScanResults : function() {
		var attachmentId = this.getParameter("sysparm_attachment_id");
		var attachmentGr = new GlideRecord('sys_attachment');
		var result = this.newItem('result');
		if (!attachmentGr.get(attachmentId)) {
			gs.warn('Attachment record does not exists for sys_attachment: ' + attachmentId);
			return;
		}
		
		if (!attachmentGr.canRead()) {
			gs.warn('User does not have read access for sys_attachment: ' + attachmentId);
			return;
		}
		var state = attachmentGr.getValue("state");
		//pre check if the attachment state is already "available" or "not_available"
		if (state == "available")
			return;
			
		if (state == "not_available") {
			this._prepareResultItemForUnavailableAttachment(attachmentGr, result);
			result.setAttribute('scanResults', state);
			return;
		}
		
		var scanResults = sn_snap.AntiVirusOnDemandAdvisor.getAvailabilityForDownload(attachmentId);
		if (scanResults.availability) {
			var availability = scanResults.availability;
			if (availability == "not_available") {
				this._prepareResultItemForUnavailableAttachment(attachmentGr, result);
			}
			result.setAttribute('scanResults', scanResults.availability);
		}
	},
	
	_prepareResultItemForUnavailableAttachment : function(attachmentGr, result) {
		var fileName = attachmentGr.getValue("file_name");
		var unavailableStr = gs.getMessage("unavailable");
		var mesgArray = [];
		mesgArray.push(fileName);
		mesgArray.push(unavailableStr);
		result.setAttribute('ariaLabel', gs.getMessage("Attachment {0} {1}", mesgArray));
		result.setAttribute('unavailableLable', unavailableStr);
		result.setAttribute('iconPath', GlideSysAttachment.selectIconFromGR(attachmentGr));
		result.setAttribute('attachmentId', attachmentGr.getUniquevalue());
		result.setAttribute('fileName', fileName);
	},

	type: 'EmailClientSnapServiceAjax'
});
```