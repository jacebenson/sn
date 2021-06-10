---
title: "ProblemStateUtilsSNC"
id: "problemstateutilssnc"
---

API Name: global.ProblemStateUtilsSNC

```js
var ProblemStateUtilsSNC = Class.create();
ProblemStateUtilsSNC.prototype = {

	initialize: function(argument) {
		this.moveToClosed = gs.getProperty(this.PROPERTIES.MOVE_TO_CLOSED, "true");
	},

	STATES: {
		ASSESS: ProblemState.STATES.ASSESS,
		ROOT_CAUSE_ANALYSIS: ProblemState.STATES.ROOT_CAUSE_ANALYSIS,
		RESOLVED: ProblemState.STATES.RESOLVED,
		CLOSED: ProblemState.STATES.CLOSED
	},

	COLUMNS: {
		STATE: "state",
		RESOLUTION_CODE: "resolution_code"
	},

	RESOLUTION_CODES: {
		FIX_APPLIED: "fix_applied",
		CANCELED: "canceled",
		RISK_ACCEPTED: "risk_accepted"
	},

	ROLE_PROP_CHOICES: {
		NOBODY: "-nobody-",
		PROBLEM_COORDINATOR: "problem_coordinator",
		PROBLEM_MANAGER: "problem_manager",
		PROBLEM_ADMIN: "problem_admin"
	},

	PROPERTIES: {
		REANALYZE_FROM_CANCELED: "problem.closed.role.reanalyze_from_canceled",
		REANALYZE_FROM_COMPLETED: "problem.closed.role.reanalyze_from_completed",
		REANALYZE_FROM_RISK_ACCEPTED: "problem.closed.role.reanalyze_from_closed_riskaccepted",
		MOVE_TO_CLOSED: "problem.acceptrisk.move_to_closed"
	},

	validateStateTransition: function(problemGr, state) {

		if (!problemGr || !state || !problemGr.isValid())
			return false;

		if (sn_sm.RecordStateValidator.isValidStateTransition(problemGr, state))
			return true;

		return false;
	},

	canReAnalyze: function(problemGr) {

		if (!problemGr || !problemGr.isValid())
			return false;

		var problemState = problemGr.getValue(this.COLUMNS.STATE);

		if (problemState == this.STATES.RESOLVED && this.validateStateTransition(problemGr, this.STATES.ROOT_CAUSE_ANALYSIS))
			return true;

		if (problemState == this.STATES.CLOSED && this.validateStateTransition(problemGr, this.STATES.ROOT_CAUSE_ANALYSIS)) {

			var user = gs.getUser();
			var resolutionCode = problemGr.getValue(this.COLUMNS.RESOLUTION_CODE);
			var reanalyzeFromCompletedRole = gs.getProperty(this.PROPERTIES.REANALYZE_FROM_COMPLETED);
			var reanalyzeFromCanceledRole = gs.getProperty(this.PROPERTIES.REANALYZE_FROM_CANCELED);
			var reanalyzeFromRiskAcceptedRole = gs.getProperty(this.PROPERTIES.REANALYZE_FROM_RISK_ACCEPTED);

			if ((resolutionCode == this.RESOLUTION_CODES.FIX_APPLIED) && (reanalyzeFromCompletedRole != this.ROLE_PROP_CHOICES.NOBODY) && user.hasRole(reanalyzeFromCompletedRole))
				return true;

			if ((resolutionCode == this.RESOLUTION_CODES.CANCELED) && (reanalyzeFromCanceledRole != this.ROLE_PROP_CHOICES.NOBODY) && user.hasRole(reanalyzeFromCanceledRole))
				return true;

			if ((resolutionCode == this.RESOLUTION_CODES.RISK_ACCEPTED) && (reanalyzeFromRiskAcceptedRole != this.ROLE_PROP_CHOICES.NOBODY) && user.hasRole(reanalyzeFromRiskAcceptedRole))
				return true;

		}
		return false;
	},

	canShowAcceptRisk: function(problemGr) {

		if (!problemGr || !problemGr.isValid())
			return false;

		if (this.moveToClosed == "true")
			return this.validateStateTransition(problemGr, this.STATES.CLOSED);

		return this.validateStateTransition(problemGr, this.STATES.RESOLVED);
	},

	canMarkDuplicateOrCancel: function(problemGr) {

		if (!problemGr || !problemGr.isValid())
			return false;

		if ((problemGr.state != this.STATES.CLOSED) && (problemGr.state == this.STATES.ASSESS || problemGr.state == this.STATES.ROOT_CAUSE_ANALYSIS) && this.validateStateTransition(problemGr, this.STATES.CLOSED))
			return true;
	
		return false;
	},

	canComplete: function(problemGr) {

 		if(!problemGr || !problemGr.isValid())
 			return false;
 
		if(problemGr.canWrite() && (problemGr.state != this.STATES.CLOSED) && (problemGr.state == this.STATES.RESOLVED) && this.validateStateTransition(problemGr, this.STATES.CLOSED) && problemGr.resolution_code != this.RESOLUTION_CODES.RISK_ACCEPTED)
			return true;

		return false;
	},

	onReAnalyze: function(problemGr) {

		if(!problemGr || !problemGr.isValid())
			return false;

		problemGr.setValue(this.COLUMNS.STATE, this.STATES.ROOT_CAUSE_ANALYSIS);
		problemGr.update();
	},

	type: 'ProblemStateUtilsSNC'
};
```