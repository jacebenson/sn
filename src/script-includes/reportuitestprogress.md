---
title: "ReportUITestProgress"
id: "reportuitestprogress"
---

API Name: global.ReportUITestProgress

```js
function TestResultResponse(status, message) {
	this.status = status;
	this.message = message;
}
var GLIDE_SYSTEM_FORMAT_FOR_ATF = "yyyy-MM-dd HH:mm:ss";

var ReportUITestProgress = Class.create();
ReportUITestProgress.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	reportStepProgress: function() {
		var batch_tracker_sys_id = this.getParameter('sysparm_batch_execution_tracker_sys_id');
		var batch_length = this.getParameter('sysparm_batch_length');
		var next_step_index = this.getParameter('sysparm_next_step_index');
		var step_result = this.getParameter('sysparm_step_result');
		var test_result_id = this.getParameter('sysparm_test_result_sys_id');
		var atfAgentSysId = this.getParameter('sysparm_atf_agent_sys_id');

		gs.debug("Reporting step progress");
		gs.debug("batch_tracker_sys_id " + batch_tracker_sys_id);
		gs.debug("next_step_index " + next_step_index);
		gs.debug("batch_length " + batch_length);

		new ClientTestRunnerAjax().updateHeartbeatForATFAgent(atfAgentSysId);

		//save the step result
		var success = false;
		var stepResult = this._parseJSON(step_result);
		var stepResultGR = this._findResultItemRecord(test_result_id, stepResult.sys_atf_step_sys_id);
		if(gs.nil(stepResultGR) || !stepResultGR.isValidRecord()) {
			success = false;
			gs.warn("Unable to find item record with: result sys_id: " + test_result_id + ", step sys_id: " + stepResult.sys_atf_step_sys_id);
		} else {
			this._populateTestResultItem(stepResultGR, stepResult, test_result_id, "step_result", stepResult.message);
			if(!stepResultGR.update()){
				gs.warn("failed to update item record with: sys_id: " + stepResultGR.sys_id);
				success = false;
			} else {
				success = true;
			}
		}
		
		// init response
		var response = {};
		response.cancel_request_received = false;
		response.report_step_progress_success = success;

		// check if the batch tracker receives cancel request
		if (sn_atf.ATFTrackerUtil.batchTrackerReceivesCancelRequest(batch_tracker_sys_id)) {
			response.cancel_request_received = true;
			return JSON.stringify(response);
		}
		
		if (success && next_step_index <= batch_length) {
			//a step is done, update the tracker to say it is running the next one
			response.report_step_progress_success = sn_atf.ATFTrackerUtil.reportStepProgress(batch_tracker_sys_id, next_step_index, batch_length);
		}
		
		return JSON.stringify(response);
	},

	_logAndFormatError: function (message){
		gs.error("Returning due to error: {0}", message);
		return JSON.stringify(new TestResultResponse("error", message));
	},

	reportBatchResult: function() {
		var sysAtfTestResultSysId = this.getParameter('sysparm_test_result_sys_id');
		var test_result = this.getParameter('sysparm_test_result');
		var batch_tracker_sys_id = this.getParameter('sysparm_batch_tracker_sys_id');
		var stepThatTimedOut = this._parseJSON(this.getParameter('sysparm_failed_to_report_step'));
		var isTestDebugEnabled = sn_atf.AutomatedTestingFramework.isDebugEnabled();

		var atfAgentSysId = this.getParameter('sysparm_atf_agent_sys_id');
		new ClientTestRunnerAjax().updateHeartbeatForATFAgent(atfAgentSysId);

		gs.debug("Processing Batch Result for Test Result sys_id: " + sysAtfTestResultSysId);
		gs.debug("batch_tracker_sys_id " + batch_tracker_sys_id);

		if (!sysAtfTestResultSysId)
			return this._logAndFormatError("missing test_result_sys_id");

		if (!test_result)
			return this._logAndFormatError("missing test_result data");

		// sys_atf_test_result record to update
		var gr = new GlideRecord("sys_atf_test_result");
		if (!gr.get(sysAtfTestResultSysId))
			return this._logAndFormatError("ReportUITestProgress: failed to find sys_atf_test_result record by id: " + sysAtfTestResultSysId);

		// set test result payload, if debug is enabled.
		if(isTestDebugEnabled){
			// This is just a batch so append to the existing value if there is one
			if (gs.nil(gr.test_result_json))
				gr.test_result_json = '"frontendTest" : ' + test_result;
			else
				gr.test_result_json = gr.test_result_json + ', \n "frontendTest" : ' + test_result;
		}

		var testResultObject = this._parseJSON(test_result);

		// append user agent string if it's unique
		if (gs.nil(gr.user_agents))
			gr.user_agents = testResultObject.userAgent;
		else if (gr.user_agents.indexOf(testResultObject.userAgent) === -1)
			gr.user_agents = gr.user_agents + ',\n' + testResultObject.userAgent;

		// clear session_id between batches to indicate this test result is no longer running in this session
		gr.session_id = '';

		if (!gr.update())
			return this._logAndFormatError("failed to update test result");

		if(!this._saveStepEvents(sysAtfTestResultSysId, testResultObject.stepEvents))
			return this._logAndFormatError("Failed to create or update one or more result item records.");

		var isSuccess = (!testResultObject.hasFailure && !testResultObject.hasWarning);
		var isSuccessWithWarnings = (!testResultObject.hasFailure && testResultObject.hasWarning);

		gs.debug("testResultObject.isCanceled: " + testResultObject.isCanceled);
		gs.debug("testResultObject.hasFailure: " + testResultObject.hasFailure);
		gs.debug("test result is success: " + isSuccess);

		if (testResultObject.isCanceled)
			sn_atf.ATFTrackerUtil.cancelTracker(batch_tracker_sys_id);
		else if (isSuccess)
			sn_atf.ATFTrackerUtil.successTracker(batch_tracker_sys_id);
		else if (isSuccessWithWarnings)
			sn_atf.ATFTrackerUtil.successWithWarningsTracker(batch_tracker_sys_id);
		else
			sn_atf.ATFTrackerUtil.failTracker(batch_tracker_sys_id);

		if (stepThatTimedOut !== null)
			this._updateStepThatFailedToReportToFailure(sysAtfTestResultSysId, stepThatTimedOut);

		return JSON.stringify(new TestResultResponse("success", sysAtfTestResultSysId));
	},

	reportBatchConsoleLogs: function() {
		var sysAtfTestResultSysId = this.getParameter('sysparm_test_result_sys_id');
		var console_logs = this.getParameter('sysparm_console_logs');
		var atfAgentSysId = this.getParameter('sysparm_atf_agent_sys_id');
		var batchTrackerSysId = this.getParameter('sysparm_batch_tracker_sys_id');
		var isTestDebugEnabled = sn_atf.AutomatedTestingFramework.isDebugEnabled();

		new ClientTestRunnerAjax().updateHeartbeatForATFAgent(atfAgentSysId);

		gs.debug("Processing Batch Console Logs for Test Result sys_id: " + sysAtfTestResultSysId);
		gs.debug("batch_tracker_sys_id " + batchTrackerSysId);

		if (!sysAtfTestResultSysId)
			return this._logAndFormatError("missing test_result_sys_id");

		if (!console_logs)
			return this._logAndFormatError("missing console_logs data");

		var gr = new GlideRecord("sys_atf_test_result");
		if (!gr.get(sysAtfTestResultSysId))
			return this._logAndFormatError("ReportUITestProgress: failed to find sys_atf_test_result record by id: " + sysAtfTestResultSysId);

		if (isTestDebugEnabled) {
			if (gs.nil(gr.test_result_json))
				gr.test_result_json = '"consoleLogs" : ' + console_logs;
			else
				gr.test_result_json = gr.test_result_json + ', \n "consoleLogs" : ' + console_logs;
		}

		if (!gr.update())
			return this._logAndFormatError("failed to update test result");

		var consoleLogsObject = this._parseJSON(console_logs);
		if (!this._saveStepEvents(sysAtfTestResultSysId, consoleLogsObject))
			return this._logAndFormatError("Failed to create or update one or more result item records.");

		return JSON.stringify(new TestResultResponse("success", sysAtfTestResultSysId));
	},

	_findResultItemRecord: function(sysAtfTestResultSysId, stepSysId) {
		var testResultItemGR = new GlideRecord("sys_atf_test_result_step");
		testResultItemGR.addQuery("test_result", sysAtfTestResultSysId);
		testResultItemGR.addQuery("step", stepSysId);
		testResultItemGR.query();
		if(!testResultItemGR.next())
			return null;

		return testResultItemGR;
	},

	_updateStepThatFailedToReportToFailure: function(testResultSysId, step) {
		var itemGR = this._findResultItemRecord(testResultSysId, step.sys_atf_step_sys_id);
		itemGR.summary = step.message;
		itemGR.status = "failure";
		itemGR.recorded_at = GlideCounter.next("sys_atf_step_result");

		var gdtStartTimeEvent = new GlideDateTime();
		var gdtEndTimeEvent = new GlideDateTime();

		gdtStartTimeEvent.setValueUTC(step.start_time, GLIDE_SYSTEM_FORMAT_FOR_ATF);
		itemGR.setValue("start_time", gdtStartTimeEvent.getValue());
		itemGR.setValue("end_time", gdtEndTimeEvent.getValue());

		var duration = GlideDateTime.subtract(gdtStartTimeEvent, gdtEndTimeEvent);
		itemGR.setValue("run_time", duration.getDurationValue());

		if (!itemGR.update())
			gs.warn("Failed to update item record with: sys_id: " + itemGR.sys_id);
	},

	/**
     * persist all events of an event type that occurred during the current step
     */
	_saveStepEvents: function(sysAtfTestResultSysId, /*StepEvent*/ items) {
		var success = true;
		for(var i=0; i < items.length; i++){
			var item = items[i];
			// If we're just logging a step completion, only update the recorded_at for the step result
			if("step_completion".equals(item.type)) {
				this._updateRecordedAtForStepResult(sysAtfTestResultSysId, item.sys_atf_step_sys_id);
				continue;
			}

			var itemEventGR = new GlideRecord("sys_atf_test_result_item");
			this._populateTestResultItem(itemEventGR, item, sysAtfTestResultSysId, item.type, item.object, item.whitelisted_client_error, item.step_id, item.browser);

			if(!itemEventGR.insert()){
				gs.warn("failed to update item record for alert: " + item.object);
				success = false;
			}
		}
		return success;
	},
	
	_updateRecordedAtForStepResult: function(sysAtfTestResultSysId, sysAtfStepSysId){
		if(GlideStringUtil.nil(sysAtfTestResultSysId) || GlideStringUtil.nil(sysAtfStepSysId) )
			return;
		
		var stepResultGR = this._findResultItemRecord(sysAtfTestResultSysId, sysAtfStepSysId);
		if(stepResultGR == null)
			return;
		
		stepResultGR.recorded_at = GlideCounter.next("sys_atf_step_result");
		stepResultGR.update();
	},

	/**
	 * populate the test result item record
	 * if the record is a client error, include browser information
	 */
	_populateTestResultItem: function(itemGR, item, sysAtfTestResultSysId, type, output, whitelistedClientErrorSysId, stepId, userAgent) {
          itemGR.test_result = sysAtfTestResultSysId;
          itemGR.type = type;
          itemGR.output = output;
          itemGR.whitelisted_client_error = whitelistedClientErrorSysId;
          if (stepId)
              itemGR.step = stepId;

		  if (type == "client_error")
			 itemGR.description = this._getClientErrorLogDescription(userAgent, item.status);

          if (itemGR.getRecordClassName() == 'sys_atf_test_result_step')
          	this._updateOutputVars(itemGR, item);

          if (GlideStringUtil.notNil(item.status))
              itemGR.status = item.status;

          // set start and end times in UTC (incoming values are UTC, store as UTC)
          var gdtStartTimeEvent = new GlideDateTime();
          var gdtEndTimeEvent = new GlideDateTime();

		if (!gs.nil(item.start_time)) {
          gdtStartTimeEvent.setValueUTC(item.start_time, GLIDE_SYSTEM_FORMAT_FOR_ATF);
          itemGR.setValue("start_time", gdtStartTimeEvent.getValue());
		}
	
		if (!gs.nil(item.end_time)) {
          gdtEndTimeEvent.setValueUTC(item.end_time, GLIDE_SYSTEM_FORMAT_FOR_ATF);
          itemGR.setValue("end_time", gdtEndTimeEvent.getValue());
		}

          var duration = GlideDateTime.subtract(gdtStartTimeEvent, gdtEndTimeEvent);
          itemGR.setValue("run_time", duration.getDurationValue());

		itemGR.recorded_at = GlideCounter.next("sys_atf_step_result");
	},

	_parseJSON: function(objectToParse) {
		var result = {};
		try {
			result = JSON.parse(objectToParse);
		} catch(e) {
			gs.error("ReportUITestResult: Error parsing JSON string: " + e);
			gs.log(e.stack);
		}

		return result;
	},

	/**
	 * for test logs of type client error, include browser and version information about where the error occurred
	 */
	_getClientErrorLogDescription: function(userAgent, status) {
		var helper = new PickABrowserHelper();
		var browserInfo = helper.parseUserAgent(userAgent);

		return gs.getMessage("This client error occurred on the page in {0} {1}", [browserInfo.browserName, browserInfo.version]);
	},

	_updateOutputVars: function(stepResultGR, item) {
		var outputs = stepResultGR.outputs;
		var names = outputs.getVariableNames();
	    for (var i=0; i<names.length; i++) {
	    	if (names[i] in item.outputs) {
	    		outputs[names[i]] = item.outputs[names[i]];
	    	}
	    }
	},
	
	type: 'ReportUITestProgress'
});
```