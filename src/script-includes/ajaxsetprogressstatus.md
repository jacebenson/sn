---
title: "AJAXSetProgressStatus"
id: "ajaxsetprogressstatus"
---

API Name: global.AJAXSetProgressStatus

```js
var AJAXSetProgressStatus = Class.create();
AJAXSetProgressStatus.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	setProgressStatus: function() {
        var executionID =  this.getParameter('sysparm_execution_id');
		var gr = new GlideRecordSecure('sys_execution_tracker');
		
		gr.addQuery('parent', executionID);
		gr.query();

		while (gr.next()) {
			if (gr.state == "0") {
				gr.state = "3";
				gr.update();
			}
		}

    },

    type: 'AJAXSetProgressStatus'
});
```