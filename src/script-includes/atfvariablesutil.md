---
title: "ATFVariablesUtil"
id: "atfvariablesutil"
---

API Name: global.ATFVariablesUtil

```js
var ATFVariablesUtil = Class.create();
ATFVariablesUtil.prototype = {
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

	/**
	 * Returns the default script for "Run Server Side Script" steps.
	 * Has to be done via script like this due to Oracle database limitations for default variable values.
	 */
	getDefaultServerSideScript: function() {
		return "// You can use this step to execute a variety of server-side javascript tests including\n" +
			"// jasmine tests and custom assertions\n" +
			"//\n" +
			"//\n" +
			"// Pass or fail a step: Override the step outcome to pass or fail. This is ignored \n" +
			"//                      by jasmine tests\n" +
			"//\n" +
			"//  - Return true from the main function body to pass the step\n" +
			"//  - Return false from the main function body to fail the step\n" +
			"//\n" +
			"//\n" +
			"// outputs:       Pre-defined Step config Output variables to set on this step during \n" +
			"//                execution that are available to later steps\n" +
			"//\n" +
			"// steps(SYS_ID): A function to retrieve Output variable data from a step that executed\n" +
			"//                earlier in the test. The desired step's sys_id is required\n" +
			"//\n" +
			"//  Example:\n" +
			"//\n" +
			"//      // Test step 1 - add data\n" +
			"//      var gr = new GlideRecord('sc_task');\n" +
			"//      // this sample step's Step config has Output variables named table and record_id\n" +
			"//      outputs.table = 'sc_task';\n" +
			"//      outputs.record_id = gr.insert();\n" +
			"//\n" +
			"//      // Test step 2 - access added data and validate\n" +
			"//      // check that the record exists (or that business logic changed it)\n" +
			"//      var gr = new GlideRecord(\"sc_task\");\n" +
			"//      gr.get(steps(PREVIOUS_STEP_SYS_ID).record_id);\n" +
			"//      assertEqual({name: \"task gr exists\", shouldbe: true, value: gr.isValidRecord()});\n" +
			"//\n" +
			"//\n" +
			"// stepResult.setOutputMessage: Log a message to step results after step executes.\n" +
			"//                              Can only be called once or will overwrite previous \n" +
			"//                              message\n" +
			"//\n" +
			"//  Example:\n" +
			"//\n" +
			"//      var gr = new GlideRecord('sc_task');\n" +
			"//      gr.setValue('short_description', 'verify task can be inserted');\n" +
			"//      var grSysId = gr.insert();\n" +
			"//      var justCreatedGR = new GlideRecord('sc_task');\n" +
			"//      if (justCreatedGR.get(grSysId)) {\n" +
			"//            stepResult.setOutputMessage(\"Successfully inserted task record\");\n" +
			"//            return true; // pass the step\n" +
			"//      } else { \n" +
			"//            stepResult.setOutputMessage(\"Failed to insert task record\");\n" +
			"//            return false; // fail the step\n" +
			"//      }\n" +
			"//\n" +
			"//\n" +
			"// Note: describe is only supported in Global scope.\n" +
			"// Use 'describe' to create a suite of test scripts and 'it' to define test expectations\n" +
			"//\n" +
			"//  Example jasmine test:\n" +
			"//\n" +
			"//      describe('my suite of script tests', function() {\n" +
			"//            it('should meet expectations', function() {\n" +
			"//                  expect(true).not.toBe(false);\n" +
			"//            });\n" +
			"//      });\n" +
			"//      // make sure to uncomment jasmine.getEnv().execute(); outside the function body\n" +
			"//\n" +
			"//\n" +
			"// assertEqual: A function used to compare that assertion.shouldbe == assertion.value;\n" +
			"//              in case of failure it throws an Error and logs that the assertion by\n" +
			"//              name has failed\n" +
			"//\n" +
			"//  Example:\n" +
			"//\n" +
			"//      var testAssertion = {\n" +
			"//            name: \"my test assertion\",\n" +
			"//            shouldbe: \"expected value\"\n" +
			"//            value: \"actual value\",\n" +
			"//      };\n" +
			"//      assertEqual(testAssertion); // throws Error, logs message to test step output\n" +
			"//\n" +
			"(function(outputs, steps, stepResult, assertEqual) {\n" +
			"    // add test script here\n" +
			"\n" +
			"})(outputs, steps, stepResult, assertEqual);\n" +
			"// uncomment the next line to execute this script as a jasmine test\n" +
			"//jasmine.getEnv().execute();\n";
	},

	/**
	 * Returns the default script for server step configs.
	 * Has to be done via script like this due to Oracle database limitations for default variable values.
	 */
	getDefaultStepConfigScript: function() {
		return "// The inputs are a map of the variables defined in the inputs related list below.\n" +
			"// Inputs are consumed in the step configuration. Input\n" +
			"// values may be hardcoded or mapped from the outputs of a previous step.\n" +
			"// If a test author using your step uses mapping to pass in an output from a previous \n" +
			"// test step then when referencing the input variable the mapping will be resolved \n" +
			"// automatically\n" +
			"//  Example:\n" +
			"//      var myRecords = new GlideRecord(inputs.table);\n" +
			"//\n" +
			"// The outputs are a map of the variables defined in the outputs related list.\n" +
			"// Outputs should be set (assigned) in order to pass data out of a test step that\n" +
			"// can be consumed my mapping as an input to subsequent steps. \n" +
			"//  Example:\n" +
			"//      outputs.table = gr.getRecordClassName()\n" +
			"//\n" +
			"//\n" +
			"// Note that inputs and outputs are strongly typed as defined in their variable definition.\n" +
			"// Their behavior is the same as a dictionary defined field of the same type in a table.\n" +
			"//\n" +
			"// The stepResult is a simple API for controlling the step pass/fail and logging with three\n" +
			"// methods:\n" +
			"//      stepResult.setFailed: Causes step to fail\n" +
			"//\n" +
			"//      stepResult.setSuccess: Causes step to succeed\n" +
			"//\n" +
			"//      stepResult.setOutputMessage: Log a message to step results after step executes.\n" +
			"//            Can only be called once or will overwrite previous \n" +
			"//            message\n" +
			"//\n" +
			"// If neither setFailed or setSuccess is called the default is to succeed.\n" +
			"//\n" +
			"// See 'Record Query' for an example of a scripted step config \n" +
			"// or see test 'Check change approvals get generated'\n" +
			"//\n" +
			"// Example usage of step timeout in script\n" +
			"//      var counter = 0;\n" +
			"//      // 'timeout' is a field on the step form\n" +
			"//      while (counter <= timeout) {\n" +
			"//            if (desiredOutcome) {\n" +
			"//                stepResult.setOutputMessage('Success!');\n" +
			"//                stepResult.setSuccess();\n" +
			"//                return;\n" +
			"//            }\n" +
			"//            counter++;\n" +
			"//            gs.sleep(1000);\n" +
			"//      }\n" +
			"//\n" +
			"//      // desired outcome did not occur within the timeout\n" +
			"//      stepResult.setOutputMessage('Failure!');\n" +
			"//      stepResult.setFailed();\n" +
			"//\n" +
			"(function executeStep(inputs, outputs, stepResult, timeout) {\n" +
			"\n" +
			"}(inputs, outputs, stepResult, timeout));\n";
	},

	/**
	 * Returns the default script for UI step configs.
	 * Has to be done via script like this due to Oracle database limitations for default variable values.
	 */
	getDefaultUIScript: function() {
		return "(function (step, stepResult, assertionObject) {\n" +
			"\n" +
			"})(step, stepResult, assertionObject);\n";
	},

	/**
	 * Returns all default step config scripts as a JSON object
	 */
	getDefaultStepConfigScriptsJSON: function() {
		return {
			server: this.getDefaultStepConfigScript(),
			ui: this.getDefaultUIScript()
		};
	},

	/**
	 * Returns the href attribute for links to the ATF properties page
	 */
	getATFPropertiesURL: function() {
		return "href='system_properties_ui.do?sysparm_title=Automated%20Test%20Framework%20Properties&amp;sysparm_category=Test%20and%20Test%20Suite%20Properties,Test%20Debugging%20Properties,Screenshot%20Properties,Custom%20UI%20Page%20Data%20Capture%20Properties,Test%20Runner%20Properties,Test%20Suite%20Report%20Properties,Email%20Properties'";
	},

    type: 'ATFVariablesUtil'
};

```