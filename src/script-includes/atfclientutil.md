---
title: "ATFClientUtil"
id: "atfclientutil"
---

API Name: global.ATFClientUtil

```js
var ATFClientUtil = Class.create();
ATFClientUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	/**
	 * Override AbstractAjaxProcessor.process(), allows functions to be callable from both clients via AJAX or from other scripts
	 * All client-callable functions must be registered here
	 */
	process: function() {
		var processorName = this.getParameter("sysparm_ajax_processor_name");
		if (processorName == "copyTestSuite")
			return this.copyTestSuite(this.getParameter("sysparm_ajax_processor_suite_id"));

		var name = this.getParameter("sysparm_name");

		if (name == "extendsSysMetadata")
			return this.extendsSysMetadata(this.getParameter("sysparm_table"));
		else if (name == "deleteMutualExclusionRules")
			return this.deleteMutualExclusionRules(this.getParameter("sysparm_test_id"), this.getParameter("sysparm_virtual_ids"));
		else if (name == "addMutualExclusionRules")
			return this.addMutualExclusionRules(this.getParameter("sysparm_test_ids"), this.getParameter("sysparm_exclusive_id"), this.getParameter("sysparm_is_from_test_form"));
		else if (name == "addMutualExclusionRulesFromTestResults")
			return this.addMutualExclusionRulesFromTestResults(this.getParameter("sysparm_test_result_ids"), this.getParameter("sysparm_exclusive_result_id"));
		else if (name == "isClientUIAction")
			return this.isUIActionClient(this.getParameter("sysparm_ui_action_sys_id"));
		else if (name == "hasReadOnlyTest")
			return this.hasReadOnlyTest(this.getParameter("sysparm_suite_id"));
		else if (name == "contextMenuCopyTest")
			return this.contextMenuCopyTest(this.getParameter("sysparm_sys_id"), this.getParameter("sysparm_check_policy"));
	},

	// check if steps modify tables extending sys_metadata
	extendsSysMetadata: function(table) {
		var gr = new GlideRecord(table);

		return gr.instanceOf("sys_metadata");
	},

	/**
	 * Deletes the mutual exclusion rules between testID and the tests represented by the specified v_atf_mutually_exclusive_test records (formatted as a comma-separated list of sys_ids)
	 * The virtual table elements are mapped back to their original mutual exclusion rules while executing this function
	 */
	deleteMutualExclusionRules: function(testID, virtualIDs) {
		if (GlideStringUtil.nil(testID) || GlideStringUtil.nil(virtualIDs))
			return false;

		// Convert comma-separated string to array
		virtualIDs = virtualIDs.split(',');

		// The specified IDs are sys_ids from the virtual table, not the "real" mutual exclusion rule records they represent
		// Therefore, they must be converted into the corresponding mutual exclusion rule records
		// To make matters worse, the virtual table could be regenerated at any time so that case must be handled as well
		// Convert the virtual table sys_ids into their corresponding mutual exclusion rule sys_ids
		var exclusiveIDs = [];
		var i = 0;
		for (i = 0; i < virtualIDs.length; i++) {
			var virtualGR = new GlideRecord("v_atf_mutually_exclusive_test");

			// If this get() fails it most likely indicates the table has been regenerated so break out of the loop
			if (!virtualGR.get(virtualIDs[i]))
				break;

			// Do not allow deleting other exclusions (it actually wouldn't work anyways, but it might lead to accidentally deleting a mutual exclusion rule that wasn't supposed to be deleted)
			if (virtualGR.getValue("reason") !== "mutual_exclusion_rule")
				continue;

			exclusiveIDs.push(virtualGR.getValue("exclusive_with"));
		}

		// If i is less than the number of virtual IDs at this point it most likely indicates the table was regenerated while processing them
		// Notify the user and return false
		if (i < virtualIDs.length) {
			gs.addErrorMessage(gs.getMessage("The list was updated while processing your request, try again"));
			return false;
		}

		// Query and delete the mutual exclusion rules -- note that the current test could be test1 OR test2 so both cases must be handled by the query
		var mutualExclusionRuleGR = new GlideRecord("sys_atf_mutual_exclusion_rule");
		mutualExclusionRuleGR.addEncodedQuery("test1=" + testID + "^test2IN" + exclusiveIDs +
									"^NQtest1IN" + exclusiveIDs + "^test2=" + testID);
		mutualExclusionRuleGR.query();
		mutualExclusionRuleGR.deleteMultiple();
		return true;
	},

	/**
	 * Adds mutual exclusion rules between testIDs (comma-separated list of sys_ids) and exclusiveID (a single test sys_id which to be made exclusive with the testIDs tests)
	 * Returns true is successful
	 */
	addMutualExclusionRules: function(testIDs, exclusiveID, isFromTestForm) {
		if (GlideStringUtil.nil(testIDs) || GlideStringUtil.nil(exclusiveID))
			return false;

		// Convert testIDs to an array and try to add the mutual exclusion rules
		testIDs = testIDs.split(',');
		return this._addMutualExclusionRules(testIDs, exclusiveID, isFromTestForm);
	},

	/**
	 * Similar to addMutualExclusions() but operates on test results instead of tests
	 * Looks up the tests corresponding to each of the specified test results and adds mutual exclusion rules between them and the specified "exclusive" test ID
	 * testResultIDs is a comma-separated list of test result sys_ids
	 * exclusiveResultID is a single test result sys_id whose test will be locked out with the tests from testResultIDs
	 * Returns true if successful
	 */
	addMutualExclusionRulesFromTestResults: function(testResultIDs, exclusiveResultID) {
		if (GlideStringUtil.nil(testResultIDs) || GlideStringUtil.nil(exclusiveResultID))
			return false;

		// Get the test ID (of the actual Test record) for the exclusive test
		var exclusiveResultGR = new GlideRecord("sys_atf_test_result");
		if (!exclusiveResultGR.get(exclusiveResultID)) {
			gs.addErrorMessage(gs.getMessage("Did not find result with sys_id: '{0}'", [exclusiveResultID]));
			return false;
		}
		var exclusiveTestID = exclusiveResultGR.getValue("test");

		// Now do the same for the test(s) in testResultIDs
		testResultIDs = testResultIDs.split(',');
		var testIDs = [];
		testResultIDs.forEach(function(resultID) {
			var testResultGR = new GlideRecord("sys_atf_test_result");
			if (!testResultGR.get(resultID)) {
				gs.addErrorMessage(gs.getMessage("Did not find result with sys_id: '{0}'", [resultID]));
				return;
			}

			testIDs.push(testResultGR.getValue("test"));
		});

		// exclusiveTestID is the sys_id that will be used for messaging in _addMutualExclusionRules()
		// The value for exclusiveTestID is currently the ID of the test result form the user is on, but if excluding only one other test it could lead to some awkward messaging
		// (e.g. "The current test has been excluded with test 'A'" while looking at a result for test A)
		// Therefore if only excluding one other test swap the two for messaging purposes
		// (this doesn't need to be done for multiple tests because it _addMutualExclusionRules() will fall back to the generic message in that case)
		if (testIDs.length === 1) {
			var temp = testIDs[0];
			testIDs[0] = exclusiveTestID;
			exclusiveTestID = temp;
		}

		// Adding mutual exclusion rules from a test result counts as being "from a test form" for messaging purposes so third argument is always true
		return this._addMutualExclusionRules(testIDs, exclusiveTestID, true);
	},

	/**
	 * Makes the specified testIDs (array of sys_ids) exclusive with exclusiveID (a single test sys_id)
	 * Messaging depends on whether the call came from a test form or not (default is false, which will use more generic messaging)
	 * Messaging will use the name of the "exclusiveID" test (e.g. "The current test has been made exclusive with test '{exclusiveID}'")
	 * Not client-callable
	 */
	_addMutualExclusionRules: function(testIDs, exclusiveID, isFromTestForm) {
		if (!testIDs || GlideStringUtil.nil(exclusiveID))
			return false;

		// Assume success until there's at least one error
		var success = true;

		// Iterate throuh test IDs, make each one exclusive with exclusiveID
		testIDs.forEach(function(testID) {
			var gr = new GlideRecord("sys_atf_mutual_exclusion_rule");
			gr.test1 = testID;
			gr.test2 = exclusiveID;
			if (!gr.insert())
				success = false;
		});

		// Business rule handles printing for failure cases
		if (success) {
			// Get the exclusive test's name
			var exclusiveName = "";
			var testGR = new GlideRecord("sys_atf_test");
			if (testGR.get(exclusiveID))
				exclusiveName = testGR.getValue("name");

			// Try to be as specific as possible -- if there was only 1 test ID name that test specifically
			// Otherwise using a more "generic" version of the message
			if (isFromTestForm && testIDs.length === 1)
				gs.addInfoMessage(gs.getMessage("The current test has been made exclusive with test '{0}'", [exclusiveName]));
			else
				gs.addInfoMessage(gs.getMessage("The selected test(s) have been made exclusive with test '{0}'", [exclusiveName]));
		}

		return success;
	},

	// Returns whether UI action is a client or server UI action
	isUIActionClient: function(uiActionID) {
		if (GlideStringUtil.nil(uiActionID))
			return;

		var gr = new GlideRecord('sys_ui_action');

		if (!gr.get(uiActionID))
			return;
		else
			return gr.client;
	},

	hasReadOnlyTest: function(suiteId) {
		if (!suiteId)
			return false;

		var testSuiteTestGR = new GlideAggregate("sys_atf_test_suite_test");
		testSuiteTestGR.addQuery("test_suite", suiteId);
		testSuiteTestGR.addQuery("test.sys_policy", "read");
		testSuiteTestGR.query();

		if (testSuiteTestGR.getRowCount() > 0)
			return true;

		var childSuiteGR = new GlideRecord("sys_atf_test_suite");
		childSuiteGR.addQuery("parent", suiteId);
		childSuiteGR.query();
		while (childSuiteGR.next()) {
			var childResult = this.hasReadOnlyTest(childSuiteGR.sys_id);
			if (childResult)
				return true;
		}

		return false;
	},

	copyTestSuite: function(suiteId) {
		var userTestProcessor = sn_atf.UserTestProcessor();
		return userTestProcessor.copyTestSuite(suiteId);
	},

	contextMenuCopyTest: function(sysId, checkPolicy) {
		if (checkPolicy == "true") {
			var testGR = new GlideRecord("sys_atf_test");
			testGR.get(sysId);
			if (testGR.getValue("sys_policy") == "read")
				return "isReadOnly";
		}

		var userTestProcessor = new sn_atf.UserTestProcessor();
		var copiedTestId = userTestProcessor.copyTest(sysId);
		var uiNotification = new UINotification();
		uiNotification.setText(gs.getMessage("Successfully copied the test. <a target='_blank' href=nav_to.do?uri=%2Fsys_atf_test.do?sys_id=" + copiedTestId + ">Click here to view copy</a>"));
		uiNotification.send();

		return copiedTestId;
	},

    type: 'ATFClientUtil'
});
```