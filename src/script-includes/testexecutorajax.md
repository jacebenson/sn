---
title: "TestExecutorAjax"
id: "testexecutorajax"
---

API Name: global.TestExecutorAjax

```js
var TestExecutorAjax = Class.create();
TestExecutorAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	process: function() {
	    var name = this.getParameter('sysparm_name');
		if (name == 'claimTest')
		    return this.claimTest();
		else if (name == 'decodeFieldValues')
			return this.decodeFieldValues();
		else if (name == 'addTestsToTestSuite')
		    return this.addTestsToTestSuite();
		else if (name == 'findOldestScheduledTest')
			return this.findOldestScheduledTest();
		else if (name == 'resolveInputs')
			return this.resolveInputs();
		else if (name =='validateFormParameters')
			return this.validateFormParameters();
		else if (name == 'impersonate')
			return this.impersonate();
		else if (name == 'unimpersonate')
			return this.unimpersonate();
		else if (name == 'getDisplay')
			return this.getDisplay();
		else if (name == 'isImpersonating')
			return this.isImpersonating();
		else if (name == 'uploadAttachments')
			return this.uploadAttachments();
		else if (name == "getWorkspaceName")
			return this.getWorkspaceName(this.getParameter("sysparm_workspace_slug"));

		var utTestSysId = this.getParameter("sysparm_ajax_processor_ut_test_id");
		var utTestSuiteId = this.getParameter("sysparm_ajax_processor_ut_test_suite_id");
		var trackerId = this.getParameter("sysparm_ajax_processor_tracker_id");
		var testResultId = this.getParameter("sysparm_ajax_processor_test_result_id");
		var testSuiteResultId = this.getParameter("sysparm_ajax_processor_test_suite_result_id");

		if (this.getType() == 'cancelTestRun')
			return this.cancelTestRun(trackerId);
		if (this.getType() == 'killTestRun')
			return this.killTestRun(trackerId);


		if (utTestSuiteId)
			return this.runUserTestSuite(utTestSuiteId);

		if (utTestSysId)
			return this.runUserTest(utTestSysId);
		
		if (testResultId)
			return this.getTrackerIdFromTestResult(testResultId);
		
		if (testSuiteResultId)
			return this.getTrackerIdFromTestSuiteResult(testSuiteResultId);
	},
	
	getTrackerIdFromTestResult: function(testResultId) {
		var gr = new GlideRecord('sys_atf_test_result');
		if (!gr.get(testResultId)) {
			gs.log("Could not find test result with id: " + testResultId);
			return;
		}
		return gr.execution_tracker.sys_id;
	},

	getTrackerIdFromTestSuiteResult: function(testSuiteResultId) {
		var gr = new GlideRecord('sys_atf_test_suite_result');
		if (!gr.get(testSuiteResultId)) {
			gs.log("Could not find test result with id: " + testResultId);
			return;
		}
		return gr.execution_tracker.sys_id;
	},

	claimTest: function() {
		var test_result_sys_id = this.getParameter('sysparm_test_result_sys_id');
		var ui_batch_execution_tracker_sys_id = this.getParameter('sysparm_batch_execution_tracker_sys_id');
		var batch_length = this.getParameter('sysparm_batch_length');

		return new sn_atf.TestClaimer()
		.setATFTestRecordSysId(test_result_sys_id)
		.setUIBatchTrackerSysId(ui_batch_execution_tracker_sys_id)
		.setBatchLength(batch_length)
		.claim();
	},

	/**
	 * Queries for a test to be executed by the test runner
	 * by matching the message reference passed with the test result's message_reference
	 * If a test to be executed is found, tries to claim the test
	 * If successful, returns the test case json string
	 * If not, returns null
	 */
	findOldestScheduledTest: function() {
		var userName = this.getParameter("sysparm_user_name");
		var messageReference = this.getParameter("sysparm_message_reference");
		if (!messageReference) {
			gs.log("TestExecutorAjax.findOldestScheduledTest has no message reference argument");
			return null;
		}
		//finds the oldest scheduled test and returns its test_case_json (or null if none found)
		gs.log("TestExecutorAjax looking for a scheduled test to run for user: " + userName + ", message reference: " + messageReference);
		var gr = new GlideRecord('sys_atf_test_result');
		gr.addQuery('status', 'waiting');
		gr.addQuery('sys_created_by', userName);
		gr.addQuery('message_reference', messageReference);

		gr.orderBy('sys_created_on');
		gr.query();
		if (gr.next()) {
			//found a test to run, try to claim it
			var testResultSysId = gr.getUniqueValue();
			var testCaseJSONString = gr.getValue('test_case_json');
			var testCaseJSON = JSON.parse(testCaseJSONString);
			var uiBatchTrackerSysId = testCaseJSON.tracker_sys_id;
			var successfulClaim = new sn_atf.TestClaimer()
				.setATFTestRecordSysId(testResultSysId)
				.setUIBatchTrackerSysId(uiBatchTrackerSysId)
				.setBatchLength(testCaseJSON.sys_atf_steps.length)
				.claim();
			if (successfulClaim) {
				gs.log("Successfully claimed scheduled test " + testResultSysId);
				return testCaseJSONString;
			} else {
				gs.log("TestExecutorAjax tried to claim a scheduled test, but was not successful");
				return null;
			}
		} else {
			gs.log("TestExecutorAjax did not find any tests in the 'waiting' state");
			return null;
		}
	},

	runUserTestSuite: function(utTestSuiteId) {
		var testRunnerSessionId = this.getParameter('sysparm_ajax_processor_test_runner_session_id');
		gs.log("TestexecutorAjax runUserTestSuite called with test runner session id: " + testRunnerSessionId);
		var gr = new GlideRecord('sys_atf_test_suite');
		if (!gr.get(utTestSuiteId)) {
			gs.log("Could not find the Test suite with id: " + utTestSuiteId);
			return;
		}

		if (this.isImpersonating()) {
			gs.log("Running tests and test suites is disabled while impersonating another user. Unable to run suite with id:" + utTestSuiteId);
			return;
		}

		var executor;
		var previousSuiteResultId = this.getParameter("sysparm_ajax_processor_previous_suite_result_id");
		if (previousSuiteResultId) {
			executor = new sn_atf.RerunTestSuiteExecutor();
			executor.setTestSuiteSysId(utTestSuiteId);
			executor.setTestRunnerSessionId(testRunnerSessionId);
			executor.setRerunSuiteResultId(previousSuiteResultId);
			return executor.start();
		}
		else {
			executor = new sn_atf.UserTestSuiteExecutor();
			executor.setTestSuiteSysId(utTestSuiteId);
			executor.setTestRunnerSessionId(testRunnerSessionId);
			return executor.start();
		}
	},

	runUserTest: function(utTestSysId) {
		var testRunnerSessionId = this.getParameter('sysparm_ajax_processor_test_runner_session_id');
		gs.log("TestexecutorAjax runUserTest called with test runner session id: " + testRunnerSessionId);
		var gr = new GlideRecord('sys_atf_test');
		if (!gr.get(utTestSysId)) {
			gs.log("couldn't find the Test record with id: " + utTestSysId);
			return;
		}

		if (this.isImpersonating()) {
			gs.log("Running tests and test suites is disabled while impersonating another user. Unable to run test with id:" + utTestSysId);
			return;
		}

		var capturePageData = "true" == this.getParameter('sysparm_ajax_processor_page_data_capture');

		return new sn_atf.ExecuteUserTest()
		.setCapturePageData(utTestSysId, capturePageData)
		.setTestRecordSysId(utTestSysId)
		.setTestRunnerSessionId(testRunnerSessionId)
		.start();
	},
	
	cancelTestRun: function(trackerId) {
		return sn_atf.AutomatedTestingFramework.cancelTestRun(trackerId);
	},
	
	killTestRun: function(trackerId) {
		return sn_atf.AutomatedTestingFramework.killTestRun(trackerId, false); // false means the kill request is not sent from cluster message
	},

    /*
    * Converts an encoded query (condition) into a list of field/value pairs to be used when setting a value in a
    * client script via g_form.setValue.  This code builds on top of the template feature which performs nearly
    * identical operations.
    */
	decodeFieldValues: function() {
		var table = this.getParameter('sysparm_table_name');
		var encodedQuery = this.getParameter('sysparm_field_values');
		
		// Use GlideTemplate so we can re-use existing code.
		var fakeTemplateGR = new GlideRecord("sys_template");
		fakeTemplateGR.setValue("template", encodedQuery);
		fakeTemplateGR.setValue("next_child",false);
		fakeTemplateGR.setValue("table",table);
		
		// GlideTemplate is a Java class used when applying templates from the UI
		var glideTemplate = GlideTemplate.getFromRecord(fakeTemplateGR);
		glideTemplate.setApplyChildren(false); // n/a for this use case
		var targetGR = glideTemplate.apply();
		var fieldList = glideTemplate.getTemplateElements();
		// Template is a Ajax script include used when applying templates
		var template = new Template();
		for (var i = 0; i < fieldList.size(); i++) {
			var fieldName = fieldList.get(i);
			var ge = targetGR.getElement(fieldName);
			if (ge.getED().isVirtual())
				continue;

			var value = template.getValue(ge);

		    var fieldValue = this.newItem("fieldValue");
			fieldValue.setAttribute("field", fieldName);
			fieldValue.setAttribute("value", value);
	    }
	},
	
	resolveInputs: function() {
		var resultId = this.getParameter("sysparm_atf_test_result");
		var stepId = this.getParameter("sysparm_atf_step_id");
		var parameterSetOrder = this.getParameter("sysparm_atf_parameter_set_order");
		var testProcessor = new sn_atf.UserTestProcessor();
		return testProcessor.generateStepJSON(stepId, resultId, parameterSetOrder);
	},
	
	addTestsToTestSuite: function() {
	    var testSuiteId = this.getParameter("sysparm_atf_test_suite_id");
		var testIds = this.getParameter("sysparm_atf_test_ids");
		var testQuery = this.getParameter("sysparm_atf_test_query");
		var testsToAdd = [];
		if (testIds)
			testsToAdd = testIds.split(",");
		else {
			var testGR = new GlideRecord('sys_atf_test');
			if (testQuery)
				testGR.addEncodedQuery(testQuery);

			testGR.query();
			while (testGR.next())
				testsToAdd.push(testGR.getValue('sys_id'));

		}
		var testSuiteProcessor = new sn_atf.TestSuiteProcessor();
		return testSuiteProcessor.addTestsToTestSuite(testSuiteId, testsToAdd);
	},

	/**
	* Validates the table, view and sys_id provided as parameters to the open a new form and open an existing form steps
	* If all three are valid, returns true. If not, it returns the the message invalid table/view/sys id
	*/
	validateFormParameters: function() {
		var formView = this.getParameter('sysparm_view_name');
		var formTable = this.getParameter('sysparm_table_name');
		var sysId = this.getParameter('sysparm_sys_id');
		gs.log("TestExecutorAjax validateFormParameters called with table: " + formTable + ", view: " + formView + ", sysId: " + sysId);

		var gr = new GlideRecord(formTable);
		if (!gr.isValid()) {
			gs.log("TestExecutorAjax validateFormParameters: Invalid table name: " + formTable);
			return "invalid table";
		}
		if (!this.validateFormView(formView, formTable)) {
			gs.log("TestExecutorAjax validateFormParameters: Invalid view: " + formView + " for table " + formTable);
			return "invalid view";
		}
		if (sysId && !gr.get(sysId)) {
			gs.log("TestExecutorAjax validateFormParameters: Invalid sysId: " + sysId + " for table " + formTable);
			return "invalid sys id";
		}
		return true;
	},

	validateFormView: function(formView, formTable) {
		if(GlideStringUtil.nil(formView) || formView.toLowerCase() == "default")
			return true;

		var viewManager = new GlideScriptViewManager(null);
		viewManager.setTable(formTable);
		viewManager.setTarget("section");
		var cl = viewManager.getList();
		return cl.contains(formView);
	},

	impersonate: function() {
		var impersonatingUser = this.getParameter("sysparm_impersonating_user");
		gs.log("TestExecutorAjax impersonate called with impersonating user: " + impersonatingUser);
		if (gs.getUserID() != impersonatingUser)
			gs.getSession().onlineImpersonate(impersonatingUser);

		// Return the currently logged in user Id so that impersonation outcome can be verified
		return gs.getUserID();
	},

	unimpersonate: function() {
	    gs.log("TestExecutorAjax unimpersonating");
		gs.getSession().onlineUnimpersonate();

		// Return the currently logged in user Id so that we can verify if unimpersonation was successful
		return gs.getUserID();
	},

	isImpersonating: function() {
		return (new GlideImpersonate()).isImpersonating();
	},

	/**
	 * Returns a choice list of supported Jasmine versions for use with the "Run Server Side Script" test step.
	 */
	getJasmineChoiceList: function() {
		var str = GlidePropertiesDB.get('sn_atf.jasmine.versions', '3.1');
		var splitstr = str.split(',');
		var list = new GlideChoiceList();
		splitstr.forEach(function(item) {
			list.add(new GlideChoice(item, item));
		});
		return list;
	},

	getDisplay: function() {
		return getDisplayValueOf(this.getParameter('sysparm_table'),this.getValue());
	},

	/**
	 * Client-callable API for uploading attachments in an ATF context
	 * Uses the attachments on the current step record, as well as a user-specified table and target_id (sys_id of the record to attach to)
	 */
	uploadAttachments: function() {
		var stepID = this.getParameter("sysparm_atf_step_sys_id");
		var table = this.getParameter("sysparm_table");
		var targetID = this.getParameter("sysparm_target_id");
		return sn_atf.AutomatedTestingFramework.uploadAttachments(stepID, table, targetID);
	},

	getWorkspaceName: function(workspaceSlug) {
		var workspaceGr = new GlideRecord('sys_aw_master_config');
		workspaceGr.addQuery('workspace_url', workspaceSlug);
		workspaceGr.query();
		if (workspaceGr.next())
			return workspaceGr.getValue('name');
		else
			return gs.getMessage('Unknown');
	},

    type: 'TestExecutorAjax'
});
```