---
title: "AttachmentActionErrorHandler"
id: "attachmentactionerrorhandler"
---

API Name: global.AttachmentActionErrorHandler

```js
var AttachmentActionErrorHandler = Class.create();
AttachmentActionErrorHandler.prototype = {
	initialize: function() {},

	deleteErrorHandler: function(inputs) {
		if ((!inputs.record || this.isEmpty(inputs.record)) && !inputs.table)
			throw "Cannot delete attachment from an empty record";

		if (!inputs.fileName && !inputs.deleteAll)
			throw "Attachment File Name cannot be empty if Delete All is not set";
	},

	isEmpty: function(obj) {
		for (var key in obj) {
			if (obj.hasOwnProperty(key))
				return false;
		}
		return true;
	},

	copyErrorHandler: function(inputs) {
		if (!inputs.attachmentRec || this.isEmpty(inputs.attachmentRec))
			throw "Empty Attachment Record.";
		if ((!inputs.targetRec || this.isEmpty(inputs.targetRec)) && !inputs.table)
			throw "Empty Target Record.";
		if (inputs.table == 'sys_attachment' || inputs.targetRec.getTableName() ==
			"sys_attachment")
			throw "Target Record cannot be of Attachment type.";
		if (inputs.attachmentRec.getTableName() !== "sys_attachment")
			throw "The Record type " + inputs.attachmentRec.getTableName() +
				" does not match with Attachment table type.";
	},


	moveErrorHandler: function(inputs) {
		this.copyErrorHandler(inputs);
	},

	type: 'AttachmentActionErrorHandler'
};
```