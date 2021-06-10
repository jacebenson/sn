---
title: "PADiagnostics"
id: "padiagnostics"
---

API Name: sn_pa_diagnostics.PADiagnostics

```js
var PADiagnostics = Class.create();
PADiagnostics.prototype = {
	_CONSTANTS: new PADiagnosticsConstants(),
	initialize: function() {},

	/**
	 * Returns hashmap key which is concatenation of comma-seperated Diagnostic:sys_id and ProblemRecord:sys_id
	 *
	 * @diagnostic
	 * @problemRecord
	 * 
	 * @Returns - hashmap key 
	 */
	_getKey: function(diagnostic, problemRecord){
		return (diagnostic + this._CONSTANTS.COMMA + problemRecord);
	},

	/**
	 * Insert a new Diagnostic result record
	 *
	 * @diagnosticLog
	 *
	 */
	_createDiagnosticResultRecord: function(diagnosticLog){
		var gr = new GlideRecord(this._CONSTANTS.PA_DIAGNOSTIC_RESULT);
		gr.initialize();
		gr.setValue(this._CONSTANTS.PA_DIAGNOSTIC, diagnosticLog.getValue(this._CONSTANTS.PA_DIAGNOSTIC) );
		gr.setValue(this._CONSTANTS.PROBLEM_TABLE, diagnosticLog.getValue(this._CONSTANTS.PROBLEM_TABLE) );
		gr.setValue(this._CONSTANTS.PROBLEM_RECORD, diagnosticLog.getValue(this._CONSTANTS.PROBLEM_RECORD) );
		gr.setValue(this._CONSTANTS.STATE, diagnosticLog.getValue(this._CONSTANTS.STATE) );
		gr.insert();
	},

	/**
	 *  Get the last execution results and accordingly:
	 *     - Mark existing records in diagnosticResultMap with empty string to mark that the problem still exists
	 *     - Otherwise, if record is not exists in diagnosticResultMap, then it is a new problematic record & we will insert to in Diagnostic result table
	 * 
	 * @executionID
	 * @diagnosticResultMap - a hashmap which holds all the problematic records from pa_diagnostic_results
	 *
	 */
	_updateDiagnosticResult: function(executionID, diagnosticLog, diagnosticResultMap){
		key = this._getKey( diagnosticLog.getValue(this._CONSTANTS.PA_DIAGNOSTIC), diagnosticLog.getValue(this._CONSTANTS.PROBLEM_RECORD) );
		if( diagnosticResultMap[key] ){
			diagnosticResultMap[key] = this._CONSTANTS.EMPTY_STRING;
			return;
		}
		this._createDiagnosticResultRecord(diagnosticLog);
	},

	/**
	 * Create a log record
	 *
	 * @param diagnosticID
	 * @param executionID
	 * @param table
	 * @param documentID
	 *
	 * @return sys_id
	 */
	_logIssue: function(diagnosticID, executionID, table, documentID, diagnosticResultMap) {
		var log = new GlideRecord(this._CONSTANTS.PA_DIAGNOSTIC_LOG);
		log.initialize();
		log.setValue(this._CONSTANTS.PA_DIAGNOSTIC, diagnosticID);
		log.setValue(this._CONSTANTS.PA_DIAGNOSTIC_EXECUTION, executionID);
		log.setValue(this._CONSTANTS.PROBLEM_TABLE, table);
		if (documentID)
			log.setValue(this._CONSTANTS.PROBLEM_RECORD, documentID);
		log.setValue(this._CONSTANTS.STATE, this._CONSTANTS.NEW);
		log.insert();
		this._updateDiagnosticResult(executionID, log, diagnosticResultMap);
	},

	/**
	 * Create an execution record
	 *
	 * @param table
	 * @param id
	 * @return sys_id
	 */
	_execution: function(table, id) {
		var exec = new GlideRecord(this._CONSTANTS.PA_DIAGNOSTIC_EXECUTION);
		exec.initialize();
		exec.setValue(this._CONSTANTS.EXECUTION_DATE, new GlideDateTime());
		exec.setValue(this._CONSTANTS.DIAGNOSTICS_EXECUTED, 0);
		exec.setValue(this._CONSTANTS.TOTAL_MESSAGES, 0);
		exec.setValue(this._CONSTANTS.ERROR_MESSAGES, 0);
		exec.setValue(this._CONSTANTS.WARNING_MESSAGES, 0);
		exec.setValue(this._CONSTANTS.INFORMATION_MESSAGES, 0);
		exec.setValue(this._CONSTANTS.STATE, this._CONSTANTS.EXECUTING);
		if (table) {
			exec.setValue(this._CONSTANTS.RECORD_TABLE, table);
			exec.setValue(this._CONSTANTS.RECORD_ID, id);
		}
		exec.insert();
		return exec;
	},

	/**
	 * Evaluate a diagnostic record that is based on condition and table.
	 *
	 * @param diagnosticGR
	 * @param executionID
	 * @param id
	 * @return numIssues
	 */
	_evaluateTable: function(diagnosticGR, executiondID, id, diagnosticResultMap) {
		// find records based on the configuration of the diagnostic record
		var table = diagnosticGR.getValue(this._CONSTANTS.TABLE);
		var gr = new GlideRecord(table);
		gr.addEncodedQuery(diagnosticGR.getValue(this._CONSTANTS.CONDITION));
		if (id)
			gr.addQuery(this._CONSTANTS.SYS_ID, id);
		gr.query();

		// log_when_empty is a flag that indicates whether or not
		// the existence of records (false) or absence of records (true)
		// means that we have found a potential issue
		var issues = 0;
		var diagnosticID = diagnosticGR.getUniqueValue();
		if (diagnosticGR.getValue(this._CONSTANTS.LOG_WHEN_EMPTY) == 0) {
			while (gr.next()) {
				this._logIssue(diagnosticID, executiondID,gr.getTableName(), gr.getUniqueValue(), diagnosticResultMap);
				issues++;
			}
		} else if (gr.getRowCount() === 0) {
			this._logIssue(diagnosticID, executiondID, table, diagnosticResultMap);
			issues = 1;
		}
		return issues;
	},

	/**
	 * Evaluate a diagnostic record that is advanced i.e. based on script.
	 *
	 * @param diagnostic
	 * @param executionID
	 * @param id
	 * @return numIssues
	 */
	_evaluateScript: function(diagnosticGR, executionID, id, diagnosticResultMap) {
		var issues = 0;
		var isScriptAllowed = new PADiagnosticsUtil().isScriptAllowed(diagnosticGR.getValue(this._CONSTANTS.SCRIPT));
		if(!isScriptAllowed){
			gs.error(gs.getMessage('Diagnostic with sys_id {0} was skipped. It contains a script that modifies records', diagnosticGR.getUniqueValue()));
			return issues;
		}

		var evaluator = new GlideScopedEvaluator();
		evaluator.putVariable('id', id);
		var answer = evaluator.evaluateScript(diagnosticGR, this._CONSTANTS.SCRIPT);
		var gr = new GlideRecord(diagnosticGR.getValue(this._CONSTANTS.TABLE));
		gr.addQuery(this._CONSTANTS.SYS_ID, this._CONSTANTS.IN, answer);
		gr.query();
		while (gr.next()) {
			this._logIssue(diagnosticGR.getUniqueValue(), executionID, gr.getTableName(), gr.getUniqueValue(), diagnosticResultMap);
			issues++;
		}
		return issues;
	},

	/**
	 * Query the diagnostic table, retrieve only active diagnostics based on record table
	 *
	 * @param encodedQuery
	 * @param table
	 * @return diagnostic
	 */
	_getDiagnostic: function(encodedQuery, table) {
		var diagnostic = new GlideRecord(this._CONSTANTS.PA_DIAGNOSTIC);
		if (encodedQuery)
			diagnostic.addEncodedQuery(encodedQuery);

		if (table)
			diagnostic.addQuery(this._CONSTANTS.TABLE, table);

		diagnostic.addActiveQuery();
		diagnostic.query();
		return diagnostic;
	},

	/**
	 * Create a Hashmap with all the problem records which are exists currently in pa_diagnostic_result table for specific diagnosticSysId
	 * in case problemRecordId specified then will retrieve only problemRecords with the same problemRecordId for specific diagnosticSysId
	 *
	 * @diagnosticSysId
	 * @problemRecordId
	 *
	 * @Return diagnosticResultMap
	 */
	_initiateDiagnosticResultsHashmap: function(diagnosticSysId, problemRecordId){
		var diagnosticResultMap = {};
		if( !diagnosticSysId )
			return diagnosticResultMap;

		var diagnosticResult = new GlideRecord(this._CONSTANTS.PA_DIAGNOSTIC_RESULT);
		diagnosticResult.addQuery(this._CONSTANTS.PA_DIAGNOSTIC, diagnosticSysId);
		if (problemRecordId)
			diagnosticResult.addQuery(this._CONSTANTS.PROBLEM_RECORD, problemRecordId);

		diagnosticResult.query();
		var key;
		while(diagnosticResult.next()){
			key = this._getKey( diagnosticResult.getValue(this._CONSTANTS.PA_DIAGNOSTIC), diagnosticResult.getValue(this._CONSTANTS.PROBLEM_RECORD) );
			diagnosticResultMap[key] = diagnosticResult.getUniqueValue();
		}
		return diagnosticResultMap;
	},

	/**
	 * Collect all the sys_ids from pa_diagnotic_result table for specific diagnosticID which are no longer problematic & delete all at once
	 *
	 * @diagnosticResultMap - The hashmap will either Empty string or sys_id from pa_diagnostic results:
	 *   - Empty string: represent problematic records which are still problematic in the current execution
	 *   - Otherwise, it hold sys_id from pa_diagnostic_result table which does not exist in the last execution. Those records should be deleted.
	 *
	 */
	_deleteFixedRecordsFromDiagnosticResult: function(diagnosticID, diagnosticResultMap){
		var recordsToDelete = [];
		for(var key in diagnosticResultMap){
			if(diagnosticResultMap[key] == this._CONSTANTS.EMPTY_STRING)
				continue;

			recordsToDelete.push( diagnosticResultMap[key] );
		}
		if(recordsToDelete.length === 0){
			return;
		}
		var diagnosticResultToDelete = new GlideRecord(this._CONSTANTS.PA_DIAGNOSTIC_RESULT);
		diagnosticResultToDelete.addQuery(this._CONSTANTS.PA_DIAGNOSTIC, diagnosticID);
		diagnosticResultToDelete.addQuery(this._CONSTANTS.SYS_ID, this._CONSTANTS.IN, recordsToDelete.join(this._CONSTANTS.COMMA));
		diagnosticResultToDelete.deleteMultiple();
	},

	/**
	 * Evaluate diagnostic records (based on table/script) only for that record
	 *
	 * @param diagnostic
	 * @param executionID
	 * @param id
	 * @return issues
	 */
	_evalDiagnostic: function(diagnostic, executionID, id) {
		var issues = 0;
		var diagnosticID = diagnostic.getUniqueValue();
		var diagnosticResultMap = this._initiateDiagnosticResultsHashmap(diagnosticID, id);

		// evaluate either table or script type of diagnostic
		if (diagnostic.getValue(this._CONSTANTS.ADVANCED) == 0) {
			issues = this._evaluateTable(diagnostic, executionID, id, diagnosticResultMap);
		} else {
			issues = this._evaluateScript(diagnostic, executionID, id, diagnosticResultMap);
		}

		this._deleteFixedRecordsFromDiagnosticResult(diagnosticID, diagnosticResultMap);
		return issues;
	},

	/**
	 * Query the diagnostic table, retrieve only active diagnostics and decide how to evaluae each diagnostic.
	 *
	 * @param encodedQuery
	 * @param table
	 * @param id
	 * @return exectionID
	 */
	_run: function(encodedQuery, table, id) {
		if (table && !new GlideRecord(table).canRead()) {
		    gs.error('You do not have access to ' + table);
		    return false;
		}

		var startTime = new Date().getTime();
		var tracker = this.startTracker();
		var exec = this._execution(table, id);
		var executionID = exec.getUniqueValue();
		var total = 0;
		var errors = 0;
		var warnings = 0;
		var infos = 0;
		var executedDiagnostics = 0;
		var executionList = [];
		var cancelled = false;
		var totalDiagnostics = 0;
		var diagnostic;
		
		diagnostic = this._getDiagnostic(encodedQuery, table);
		totalDiagnostics = diagnostic.getRowCount();
		var intervalPercent = Math.floor(100 / totalDiagnostics);

		while (diagnostic.next()) {
			var issues;
			issues = this._evalDiagnostic(diagnostic, executionID, id);
			executionList.push(diagnostic.getValue('sys_id'));
			executedDiagnostics++;
			if (executedDiagnostics <= totalDiagnostics ) {
				tracker.incrementPercentComplete(intervalPercent);
			}

			// increment the number of log messages we are creating
			switch (diagnostic.getValue(this._CONSTANTS.SEVERITY)) {
				case this._CONSTANTS.ERROR:
					errors += issues;
					break;
				case this._CONSTANTS.WARNING:
					warnings += issues;
					break;
				case this._CONSTANTS.INFO:
					infos += issues;
					break;
			}

			total += issues;
			if (this.isCancelled(tracker)) {
				cancelled = true;
				break;
			}
		}

		// set our execution summary and set it to complete
		exec.setValue(this._CONSTANTS.TOTAL_MESSAGES, total);
		exec.setValue(this._CONSTANTS.DIAGNOSTICS_EXECUTED, executedDiagnostics);
		exec.setValue(this._CONSTANTS.ERROR_MESSAGES, errors);
		exec.setValue(this._CONSTANTS.WARNING_MESSAGES, warnings);
		exec.setValue(this._CONSTANTS.INFORMATION_MESSAGES, infos);
		if (cancelled) {
			exec.setValue(this._CONSTANTS.STATE, this._CONSTANTS.CANCELLED);
		} else {
			exec.setValue(this._CONSTANTS.STATE, this._CONSTANTS.COMPLETED);
		}
		exec.update();
		
		var endTime = new Date().getTime();
		var timeTaken = (endTime - startTime) / 1000;
		tracker.updateResult({
			timeTaken: timeTaken,
			cancelled: cancelled,
			requested_execution: totalDiagnostics,
			completed_execution: executedDiagnostics,
			diagnostics_executed: executionList,
			url: this._CONSTANTS.PA_DIAGNOSTIC_EXECUTION_URL + exec.getUniqueValue()
		});
		return exec.getUniqueValue();
	},

	/**
	 * Execute all active diagnostics
	 *
	 * @return executionID
	 */
	executeAll: function(table, id) {
		return this._run('', table, id);
	},

	/**
	 * Execute a single diagnostic based on its sys_id
	 *
	 * @param sysIDs
	 * @return executionID
	 */
	executeSingle: function(sysID, table, id) {
		return this._run(this._CONSTANTS.SYS_ID + this._CONSTANTS.EQUALS + sysID, table, id);
	},

	/**
	 * Execute diagnostics based on the given sys_ids
	 *
	 * @param sysIDs
	 * @return executionID
	 */	
	execute: function(sysIDs, table, id) {
		return this._run(this._CONSTANTS.SYS_ID + this._CONSTANTS.IN + sysIDs, table, id);
	},

	/**
	 * Start execution tracker
	 *
	 * @return tracker
	 */
	startTracker: function() {
		var tracker = GlideExecutionTracker.getLastRunning();
        tracker.run();
		return tracker;
	},
	
	/**
	 * Check tracker if the cancel is requested
	 *
	 * @param tracker
	 * @return true if the cancel is requested
	 */
	isCancelled: function(tracker) {
		var trackerGR = new GlideRecord(this._CONSTANTS.SYS_EXECUTION_TRACKER);
		if (!trackerGR.isValid()) {
			return false;
		}
		
		var sysId = tracker.getSysID();
		if (!gs.nil(sysId) && !trackerGR.get(sysId)) {
			return false;
		}
		
		if (gs.nil(trackerGR.result)) {
			return false;
		}
		
		var result = JSON.parse(trackerGR.result);
		if (result.cancel_requested && (result.cancel_requested == 'true')) {
			return true;
		}
		return false;
	},
	
    type: 'PADiagnostics'
};
```