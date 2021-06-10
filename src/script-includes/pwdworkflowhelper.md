---
title: "PWDWorkflowHelper"
id: "pwdworkflowhelper"
---

API Name: global.PWDWorkflowHelper

```js
var PWDWorkflowHelper = Class.create();

PWDWorkflowHelper.startFlow = function (name, params, operation) {
	var wf = new Workflow();
	var workflowId = wf.getWorkflowFromName(name);
	
	var resetReq = new GlideRecord('pwd_reset_request');
	var requestId = params.u_request_id; 
	var getRequest = resetReq.get(requestId);
	
	var gr = wf.startFlow(workflowId, resetReq || null, operation || null, params);
	
	return gs.nil(gr) ? null : gr.getUniqueValue();
};

PWDWorkflowHelper.getWorkflowData = function (ctxId, getRelatedRecords) {
	var res = {
		result : 'failure',
		state  : 'Executing'
	};
	
	var ctxGr = new GlideRecord('wf_context');
	
	if (ctxGr.get(ctxId)) {
		res.result = ctxGr.getValue('result');
		res.state = ctxGr.getValue('state');
		
		if (getRelatedRecords) {
			res.contextGr = ctxGr;
			res.historyGr = _getHistoryGr(ctxGr);
		}
	}
	
	return res;
};

_getHistoryGr = function (ctxGr) {
	var historyGr = new GlideRecord('wf_history');
	historyGr.addQuery('context', ctxGr.getUniqueValue());
	historyGr.orderBy('activity_index');
	historyGr.addJoinQuery('wf_activity', 'activity', 'sys_id');
	historyGr.query();
	
	return historyGr;
};
```