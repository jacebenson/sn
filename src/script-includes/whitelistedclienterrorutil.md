---
title: "WhitelistedClientErrorUtil"
id: "whitelistedclienterrorutil"
---

API Name: global.WhitelistedClientErrorUtil

```js
var WhitelistedClientErrorUtil = Class.create();
WhitelistedClientErrorUtil.prototype = {
    initialize: function() {
    },

	/**
	 * function takes a test log record and returns the sys_id of the whitelisted client error
	 * record that matches its error message or null if one does not exists
	 */
	getWhitelistedClientErrorSysId: function(current) {
		var testLogErrorMessage = current.output;
		var gr = new GlideRecord('sys_atf_whitelist');
		gr.query();
		while (gr.next()) {
			if (testLogErrorMessage.contains(gr.error_message))
				return gr.sys_id;
		}
		return null;
	},

	doesTestHaveClientErrors: function(current) {
		var clientErrorsGR = new GlideRecord("sys_atf_test_result_item");
		clientErrorsGR.addQuery("test_result", current.sys_id);
		clientErrorsGR.addQuery("type", "client_error");
		clientErrorsGR.query();
		return (clientErrorsGR.getRowCount() != 0);
	},

	doesStepHaveClientErrors: function(current) {
		var clientErrorsGR = new GlideRecord("sys_atf_test_result_item");
		clientErrorsGR.addQuery("test_result", current.test_result);
		clientErrorsGR.addQuery("step", current.step);
		clientErrorsGR.addQuery("type", "client_error");
		clientErrorsGR.query();
		return (clientErrorsGR.getRowCount() != 0);
	},

	doesTestResultHaveFailingTestLogs: function(current) {
		var failingTestLogsGR = new GlideRecord("sys_atf_test_result_item");
		failingTestLogsGR.addQuery("test_result", current.sys_id);
		failingTestLogsGR.addQuery("status", "failure");
		failingTestLogsGR.query();
		return (failingTestLogsGR.getRowCount() != 0);
	},

    type: 'WhitelistedClientErrorUtil'
};
```