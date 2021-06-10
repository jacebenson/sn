---
title: "ProblemUtilsClientSNC"
id: "problemutilsclientsnc"
---

API Name: global.ProblemUtilsClientSNC

```js
var ProblemUtilsClientSNC = Class.create();
ProblemUtilsClientSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	submitForm: function () {
		var sys_id = this.getParameter('sysparm_sys_id');
		var fieldsToBeUpdated = JSON.parse(this.getParameter('sysparm_fields'));
		var recordGr = new GlideRecord(this.getParameter('sysparm_record_type'));
		recordGr.get(sys_id);
		if(recordGr.isValidRecord()) {
			for (var field in fieldsToBeUpdated) {
				recordGr[field + ""] = fieldsToBeUpdated[field];
			}
			if(recordGr.update())
				return true;
		}
		return false;
	},
    type: 'ProblemUtilsClientSNC'
});
```