---
title: "WorkflowVersionsAvailable"
id: "workflowversionsavailable"
---

API Name: global.WorkflowVersionsAvailable

```js
var WorkflowVersionsAvailable = Class.create();
WorkflowVersionsAvailable.prototype = {
    initialize: function() {
    },
	
	getPublishedWorkflowsExcludingTable: function(tableName) {
	    var gr = GlideRecord('wf_workflow_version');
	    gr.addActiveQuery();
	    gr.addQuery('published', true);
		if (tableName && !GlideStringUtil.nil(tableName))
			gr.addQuery('table', '!=', tableName);

	    gr.query();
	    var ids = [];
	    while (gr.next()) {
	        ids.push(gr.workflow + "");
	    }

	    return 'sys_idIN' + ids.join(',');
	},

    type: 'WorkflowVersionsAvailable'
};
```