---
title: "ATFParallelTestingUtil"
id: "atfparalleltestingutil"
---

API Name: global.ATFParallelTestingUtil

```js
var ATFParallelTestingUtil = Class.create();
ATFParallelTestingUtil.prototype = {
    initialize: function() {
    },

	getParallelTestRuns: function(parent) {
		// if start_time_millis is not set, this test was run before parallel testing support
		if (!parent.start_time_millis)
			return;

		// if there is no end_time_millis (test result is still running), consider end_time_millis as new GlideDateTime
		var endTime = !parent.end_time_millis ? new GlideDateTime().getCounter() : parent.end_time_millis;
		var parallelTestRuns = [];

		// exclude test results without start_time_millis (run before parallel testing)
		// test results started during this test (after this test's start time and before this test's end time)
		// test results started before this test's start time and ended after this test started or is still running
		var gr = new GlideRecord('sys_atf_test_result');
		var eq = 'start_time_millisISNOTEMPTY' +
			'^start_time_millis>=' + parent.start_time_millis +
			'^start_time_millis<=' + endTime +
			'^sys_id!=' + parent.getUniqueValue() +
			'^NQstart_time_millisISNOTEMPTY' +
			'^start_time_millis<=' + parent.start_time_millis +
			'^end_time_millis>=' + parent.start_time_millis +
				'^ORend_time_millisISEMPTY' +
			'^sys_id!=' + parent.getUniqueValue();
		gr.addEncodedQuery(eq);
		gr.query();
		while (gr.next())
			parallelTestRuns.push(gr.getUniqueValue());

		return parallelTestRuns;
	},
    type: 'ATFParallelTestingUtil'
};
```