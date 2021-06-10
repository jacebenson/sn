---
title: "PwdADMaxAttemptsHelper"
id: "pwdadmaxattemptshelper"
---

API Name: global.PwdADMaxAttemptsHelper

```js
var PwdADMaxAttemptsHelper = Class.create();

PwdADMaxAttemptsHelper.incrementCounter =  function (){
	var resetCounter;
	if (!gs.getSession().getProperty('pwd_reset_counter')) {
		resetCounter = 1;
		gs.getSession().putProperty('pwd_reset_counter', resetCounter);
	} else {
		resetCounter = parseInt(gs.getSession().getProperty('pwd_reset_counter'));
		resetCounter++;
		gs.getSession().putProperty('pwd_reset_counter', resetCounter);
	}
};

PwdADMaxAttemptsHelper.checkMaxAttemptsReached =  function (requestId) {
	var resetCounter = gs.getSession().getProperty('pwd_reset_counter');
	if (!resetCounter) {
		return false;
	}
	var max_reset_attempts = PwdADMaxAttemptsHelper.getMaxResetAttemptsAllowed(requestId);
	if (!max_reset_attempts) {
		return false;
	}
	
	resetCounter = parseInt(resetCounter);
	return resetCounter == max_reset_attempts;	
};

PwdADMaxAttemptsHelper.getMaxResetAttemptsAllowed =  function(requestId) {
	var max_reset_attempts;
	var trackingMgr = new SNC.PwdTrackingManager();
	var processId = trackingMgr.getProcessIdByRequestId(requestId);
	var gr = new GlideRecord('pwd_map_proc_to_cred_store');
	gr.addQuery('process', processId);
	gr.query();
	gr.next();
		
	var credStoreSysId = gr.getValue('cred_store');
	gr = new GlideRecord('pwd_cred_store_param');
	gr.addQuery('cred_store', credStoreSysId);
	gr.addQuery('name', 'max_reset_attempts');
	gr.query();
	if (gr.next()) {
		max_reset_attempts = parseInt(gr.getValue('value'));
		if (isNaN(max_reset_attempts)) {
			return false;
		}
	}
	return max_reset_attempts;
};

```