---
title: "RiskCalculatorSNC"
id: "riskcalculatorsnc"
---

API Name: global.RiskCalculatorSNC

```js
var RiskCalculatorSNC = Class.create();

RiskCalculatorSNC.LOG_PROPERTY = "com.snc.change_management.risk_conditions.log.level";

RiskCalculatorSNC.CHG_RISK_ASMT_PLUGIN = "com.snc.change_management.risk_assessment";
RiskCalculatorSNC.LEGACY_CHG_RISK_ASMT_PLUGIN = "com.snc.change.risk_assessment";
RiskCalculatorSNC.CHG_RISK_ML_PLUGIN = "com.snc.change_management.ml.risk";
RiskCalculatorSNC._setChangeRiskDetails = function(field, value, changeRequestGr) {
	changeRequestGr = changeRequestGr || this.changeRequestGr;
	if (!changeRequestGr || !changeRequestGr.getUniqueValue())
		return;

	if (!this.changeRiskDetailsGr) {
		this.changeRiskDetailsGr = new GlideRecord("change_risk_details");
		this.changeRiskDetailsGr.addQuery("change_request", changeRequestGr.getUniqueValue());
		this.changeRiskDetailsGr.query();
		if (!this.changeRiskDetailsGr.next()) {
			this.changeRiskDetailsGr.setValue("change_request", changeRequestGr.getUniqueValue());
			// Populating risk condition on first run
			this.changeRiskDetailsGr.setValue("risk_condition_risk", changeRequestGr.getValue("risk"));
			this.changeRiskDetailsGr.setValue("risk_condition_impact", changeRequestGr.getValue("impact"));
		}
	}

	value = ChangeCommon.isNil(value) ? "" : value;
	if (this.changeRiskDetailsGr.isValidField(field)) {
		var currFieldValue = this.changeRiskDetailsGr.getValue(field);
		currFieldValue = ChangeCommon.isNil(currFieldValue) ? "" : currFieldValue;
		if (this.changeRiskDetailsGr.isValidField(field + "_prev"))
			this.changeRiskDetailsGr.setValue(field + "_prev", currFieldValue);
		this.changeRiskDetailsGr.setValue(field, value);
		if (!this._dryRun)
			this.updateChangeRiskDetails();
	}
};

RiskCalculatorSNC.updateChangeRiskDetails = function() {
	if (!this.changeRiskDetailsGr)
		return;

	this.changeRiskDetailsGr.update();
};

RiskCalculatorSNC.prototype = {

	initialize: function(changeRequestGr) {
		this._log = new GSLog(RiskCalculatorSNC.LOG_PROPERTY, this.type);
		// Requery to handle calls from scoped application
		if (changeRequestGr) {
			if (changeRequestGr.operation() !== "insert") {
				this._originalChangeRequestGr = changeRequestGr;
				this.changeRequestGr = new GlideRecord(changeRequestGr.getTableName());
				if (this.changeRequestGr.get(changeRequestGr.getUniqueValue()))
					this._copyChanges(changeRequestGr);
			} else
				this.changeRequestGr = changeRequestGr;
		}
		this._dryRun = !(changeRequestGr && changeRequestGr.isValidRecord());

		this._riskHelper = new global.ChangeRiskDetailsHelper();
		var viewDetailsValue = this._riskHelper.getViewDetailsEnabled();
		if (viewDetailsValue === "enable") {
			this._viewDetailsEnabled = true;
			this._isLegacyMessages = false;
		} else if (viewDetailsValue === "legacy") {
			this._viewDetailsEnabled = true;
			this._isLegacyMessages = true;
		}
		else {
			this._viewDetailsEnabled = false;
			this._isLegacyMessages = false;
		}
	},

	/**
	* ALL Risk Evaluation should use this method. This function will update the change_request gliderecord
	* unless dryRun has been set to true. Only call in before business rule if dryRun has been set to true.
	*
	* return evaluatedRiskImpact with properties: riskCondition, riskAssessment, riskML and riskEvaluation
	*/
	evaluateRiskImpact: function() {
		var evaluatedRiskImpact = {};

		// Risk Assessment plugin active
		if (GlidePluginManager.isActive(RiskCalculatorSNC.CHG_RISK_ASMT_PLUGIN)) {
			var changeRiskAsmt = new global.ChangeRiskAsmt(this.changeRequestGr, this._originalChangeRequestGr);
			if (changeRiskAsmt.hasAssessment() && !changeRiskAsmt.hasCompletedAssessment())
				evaluatedRiskImpact.errorMsg = gs.getMessage("Complete Risk Assessment to calculate risk");
			else
				evaluatedRiskImpact = this._dryRun ? changeRiskAsmt.setChangeRiskImpact() : changeRiskAsmt.updateChangeRiskImpact();
		} else {
			// Legacy Risk Assessment plugin active
			if (GlidePluginManager.isActive(RiskCalculatorSNC.LEGACY_CHG_RISK_ASMT_PLUGIN))
				evaluatedRiskImpact = this._dryRun ? this.legacySetChangeRiskImpact() : this.legacyUpdateChangeRiskImpact();
			else
				evaluatedRiskImpact = this._dryRun ? this.setChangeRiskImpact() : this.updateChangeRiskImpact();
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[evaluateRiskImpact] dryRun: " + this._dryRun + " evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		evaluatedRiskImpact = this._removeLegacyValues(evaluatedRiskImpact);

		if (!evaluatedRiskImpact.errorMsg)
			this._showInfoMessage(evaluatedRiskImpact);

		return evaluatedRiskImpact;
	},

	_showInfoMessage: function(evaluatedRiskImpact) {
		if (this._isLegacyMessages) {
			if (evaluatedRiskImpact.riskAssessment && evaluatedRiskImpact.riskAssessment.msg)
				gs.addInfoMessage(evaluatedRiskImpact.riskAssessment.msg);
			if (evaluatedRiskImpact.riskCondition && evaluatedRiskImpact.riskCondition.msg)
				gs.addInfoMessage(evaluatedRiskImpact.riskCondition.msg);
			if (evaluatedRiskImpact.riskEvaluation && evaluatedRiskImpact.riskEvaluation.risk && evaluatedRiskImpact.riskEvaluation.risk.updatedMsg)
				gs.addInfoMessage(evaluatedRiskImpact.riskEvaluation.risk.updatedMsg);
			return;
		}
		var msgString = "";

		if (evaluatedRiskImpact && evaluatedRiskImpact.riskCondition && evaluatedRiskImpact.riskCondition.impact && (evaluatedRiskImpact.riskCondition.impact.display_value || evaluatedRiskImpact.riskCondition.impact.value))
			evaluatedRiskImpact.riskCondition.msg += "; " + gs.getMessage("Impact: {0}{1}{2}", [new RiskCalculator().getStartColorTag(), evaluatedRiskImpact.riskCondition.impact.display_value || evaluatedRiskImpact.riskCondition.impact.value, new RiskCalculator().getEndColorTag()]);

		if (!this._isRiskUpdated(evaluatedRiskImpact) && !this._isImpactUpdated(evaluatedRiskImpact))
			msgString = gs.getMessage('Based on the calculation, risk and impact remain unchanged');
		else if (this._isRiskUpdated(evaluatedRiskImpact) && !this._isImpactUpdated(evaluatedRiskImpact))
			msgString = gs.getMessage('Based on the calculation, risk has been set to {0}{1}{2} and impact remains unchanged', [this.getStartColorTag(), evaluatedRiskImpact.riskEvaluation.risk.display_value, this.getEndColorTag()]);
		else if (!this._isRiskUpdated(evaluatedRiskImpact) && this._isImpactUpdated(evaluatedRiskImpact))
			msgString = gs.getMessage('Based on the calculation, risk has been unchanged and impact has been set to {0}{1}{2}', [this.getStartColorTag(), evaluatedRiskImpact.riskEvaluation.impact.display_value, this.getEndColorTag()]);
		else
			msgString = gs.getMessage('Based on the calculation, risk has been set to {0}{1}{2} and impact has been set to {0}{3}{2}', [this.getStartColorTag(), evaluatedRiskImpact.riskEvaluation.risk.display_value, this.getEndColorTag(), evaluatedRiskImpact.riskEvaluation.impact.display_value]);

		var isServicePortal = this._riskHelper.isServicePortal();
		var isNotEnabled = (!this._viewDetailsEnabled && !this._isLegacyMessages);
		if (isServicePortal || isNotEnabled || !this._riskHelper.showDetailsButton(this.changeRequestGr.getUniqueValue()))
			gs.addInfoMessage(msgString); // Don't show link if SP
		else
			gs.addInfoMessageNoSanitization(msgString + ". <a id='chg_risk_details_link' href='javascript:void(0);' onclick='openRiskDetails()' role='button' aria-label='" + gs.getMessage('View details about risk and impact calculation') + "'>" + gs.getMessage("View details") + "</a>");
	},

	_isRiskUpdated: function(evaluatedRiskImpact) {
		return evaluatedRiskImpact && evaluatedRiskImpact.riskEvaluation && evaluatedRiskImpact.riskEvaluation.risk && evaluatedRiskImpact.riskEvaluation.risk.updated;
	},

	_isImpactUpdated: function(evaluatedRiskImpact) {
		return evaluatedRiskImpact && evaluatedRiskImpact.riskEvaluation && evaluatedRiskImpact.riskEvaluation.impact && evaluatedRiskImpact.riskEvaluation.impact.updated;
	},

	legacySetChangeRiskImpact: function() {
		var evaluatedRiskImpact = {};
		var riskAssessmentCalculator = new RiskAssessmentCalculator();
		var assessmentMatch = riskAssessmentCalculator.checkForMatchingAssessment(this.changeRequestGr.sys_class_name, this.changeRequestGr) + "";
		if (!assessmentMatch) {
			this._setChangeRiskDetails("assessment_master", "", this.changeRequestGr);
			this._setChangeRiskDetails("legacy_risk_assessment", "", this.changeRequestGr);
			evaluatedRiskImpact = riskAssessmentCalculator.calculateRisk(this.changeRequestGr);
		}
		else {
			var riskAssessment = riskAssessmentCalculator.checkForAssessmentInstance(this.changeRequestGr.sys_id) + "";

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug("[legacyUpdateChangeRiskImpact] riskAssessment: " + riskAssessment + " assessmentMatch: " + assessmentMatch);

			// the correct assessment has been taken
			if (riskAssessment && riskAssessment === assessmentMatch)
				evaluatedRiskImpact = riskAssessmentCalculator.calculateRisk(this.changeRequestGr);

			if (!evaluatedRiskImpact.riskAssessment)
				evaluatedRiskImpact.riskAssessment = {};

			if (riskAssessment && riskAssessment !== assessmentMatch)
				evaluatedRiskImpact.errorMsg = gs.getMessage("Incorrect risk assessment taken, please fill out a new assessment");

			if (!riskAssessment)
				evaluatedRiskImpact.errorMsg = gs.getMessage("A risk assessment is required, please fill out a risk assessment");

			if (evaluatedRiskImpact && evaluatedRiskImpact.riskAssessment && evaluatedRiskImpact.riskAssessment.risk) {
				this._setChangeRiskDetails("assessment_master", evaluatedRiskImpact.riskAssessment.sys_id);
				this._setChangeRiskDetails("legacy_risk_assessment", evaluatedRiskImpact.riskAssessment.risk.value);
				this._setChangeRiskDetails("legacy_risk_assessment_has_run", true, this.changeRequestGr);
			}
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[legacySetChangeRiskImpact] evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		return evaluatedRiskImpact;
	},

	legacyUpdateChangeRiskImpact: function() {
		var evaluatedRiskImpact = this.legacySetChangeRiskImpact();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[legacyUpdateChangeRiskImpact] dryRun: " + this._dryRun + " evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		if (this._shouldUpdateRecord(evaluatedRiskImpact))
			this.changeRequestGr.update();

		if (!evaluatedRiskImpact.errorMsg)
			this._showInfoMessage(evaluatedRiskImpact);

		return evaluatedRiskImpact;
	},

	/**
	* Evaluates riskConditions ONLY. Does not update gliderecord so can be used by before business rule if required.
	*
	* return evaluatedRiskImpact with properties: riskCondition and riskEvaluation
	*/
	setChangeRiskImpact: function() {
		var evaluatedRiskImpact = this.calculateRiskConditions();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[setChangeRiskImpact] evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		return this.setRiskImpact(evaluatedRiskImpact);
	},

	/**
	* Sets the evaluated risk and impact on a given Change Request Gliderecord
	*
	* return evaluatedRiskImpact with properties: riskCondition and riskEvaluation
	*/
	setRiskImpact: function(evaluatedRiskImpact, changeRequestGr) {
		changeRequestGr = changeRequestGr || this.changeRequestGr;
		evaluatedRiskImpact = evaluatedRiskImpact || {};

		if (!changeRequestGr || !evaluatedRiskImpact.riskEvaluation)
			return evaluatedRiskImpact;

		if (evaluatedRiskImpact.riskEvaluation.risk && evaluatedRiskImpact.riskEvaluation.risk.updated)
			changeRequestGr.risk = evaluatedRiskImpact.riskEvaluation.risk.value;

		if (evaluatedRiskImpact.riskEvaluation.impact && evaluatedRiskImpact.riskEvaluation.impact.updated)
			changeRequestGr.impact = evaluatedRiskImpact.riskEvaluation.impact.value;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[setRiskImpact] changeRequestGr.changes: " + changeRequestGr.changes());

		// When it runs by business rule and either Risk Assessment plugin is installed,
		// the current RiskCalculator instance is not aware of changes to change_risk_details because both Legacy Risk Assessment and Risk Assessment v2 create a
		// new RiskCalculator instance, so resetting the record
		if (evaluatedRiskImpact.riskCondition && evaluatedRiskImpact.riskCondition.risk && evaluatedRiskImpact.riskCondition.impact) {
			if (this._dryRun && this._isRiskAssessmentPluginInstalled()) {
				this._setRiskCondition(evaluatedRiskImpact.riskCondition.sys_id, evaluatedRiskImpact.riskCondition.risk.value, evaluatedRiskImpact.riskCondition.impact.value);
				this._setChangeRiskDetails("risk_condition_has_run", true, this.changeRequestGr);
			}
		}
		else
			this._clearRiskCondition();
		return evaluatedRiskImpact;
	},

	getColor: function() {
		return "red";
	},

	getStartColorTag: function() {
		return "<font color='" + this.getColor() + "'>";
	},

	getEndColorTag: function() {
		return "</font>";
	},

	setDryRun: function(dryRun) {
		this._dryRun = dryRun || false;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[setDryRun] this._dryRun: " + this._dryRun);

		return this;
	},

	// Because of requery to handle calls from scoped application, need to copy changes to current
	_copyChanges: function(changeRequestGr) {
		var elements = GlideTableDescriptor.get(changeRequestGr.getTableName()).getSchemaList();
		var length = elements.size();
		for (var i = 0; i < length; i++) {
			var elementDescriptor = elements.get(i);
			var column = elementDescriptor.getName();
			if (!column || column.startsWith("sys_") || !changeRequestGr.getElement(column).changes())
				continue;
			this.changeRequestGr.setValue(column, changeRequestGr.getValue(column));
		}
		// Since this is used in before business_rule, ensure reference to current is updated
		changeRequestGr = this.changeRequestGr;
	},

	_removeLegacyValues: function(evaluatedRiskImpact) {
		var result = {};

		if (evaluatedRiskImpact.errorMsg)
			result.errorMsg = evaluatedRiskImpact.errorMsg;

		if (evaluatedRiskImpact.riskCondition)
			result.riskCondition = evaluatedRiskImpact.riskCondition;

		if (evaluatedRiskImpact.riskAssessment)
			result.riskAssessment = evaluatedRiskImpact.riskAssessment;

		if (evaluatedRiskImpact.riskML)
			result.riskML = evaluatedRiskImpact.riskML;

		if (evaluatedRiskImpact.riskEvaluation)
			result.riskEvaluation = evaluatedRiskImpact.riskEvaluation;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_removeLegacyValues] result: " + JSON.stringify(result));

		return result;
	},

	calculateRisk: function() {
		var evaluatedRiskImpact = this.getRiskList();

		if (GlidePluginManager.isActive(RiskCalculatorSNC.CHG_RISK_ML_PLUGIN)) {
			var changeRiskML = new sn_chg_ml_risk.ChangeMLRiskCalculator();
			if (changeRiskML.isSolutionEnabled() && changeRiskML.hasActiveSolution()) {
				var predictResult = new sn_chg_ml_risk.ChangeMLRiskCalculator().getPredictedValue(this.changeRequestGr);
				if (predictResult && predictResult.risk) {
					evaluatedRiskImpact.riskML = predictResult;
					evaluatedRiskImpact.riskML.risk.updated = parseInt(evaluatedRiskImpact.riskML.risk.value) !== parseInt(this.changeRequestGr.risk) || this.changeRequestGr.risk.changes();
					this._setChangeRiskDetails("risk_ml", evaluatedRiskImpact.riskML.risk.value);
					this._setChangeRiskDetails("ml_capability_definition_base", predictResult.mlDefSysID);
				}
				else
					// ML could not predict a value for the current record
					this._setChangeRiskDetails("risk_ml", "");
				this._setChangeRiskDetails("risk_ml_has_run", true, this.changeRequestGr);
			}
			else {
				// Clear ML values
				this._setChangeRiskDetails("risk_ml_has_run", false, this.changeRequestGr);
				this._setChangeRiskDetails("risk_ml", "");
				this._setChangeRiskDetails("ml_capability_definition_base", "");
			}
			this._setChangeRiskDetails("risk_ml_set", changeRiskML.applyRiskValue(), this.changeRequestGr);
			return evaluatedRiskImpact;
		}
		return !evaluatedRiskImpact || !evaluatedRiskImpact.riskCondition || !evaluatedRiskImpact.riskCondition.match ? "" : evaluatedRiskImpact;
	},

	calculateRiskConditions: function() {
		var evaluatedRiskImpact = this.calculateRisk();
		if (!evaluatedRiskImpact || !evaluatedRiskImpact.riskCondition)
			return {};

		evaluatedRiskImpact.riskCondition.msg = evaluatedRiskImpact.riskCondition.msg ? evaluatedRiskImpact.riskCondition.msg += ": " + gs.getMessage("Risk Condition calculated") : gs.getMessage("Risk Condition calculated");

		if (evaluatedRiskImpact.riskCondition && evaluatedRiskImpact.riskCondition.name && evaluatedRiskImpact.riskCondition.name.value)
			evaluatedRiskImpact.riskCondition.msg += ": " + '<strong><span style="cursor:default;" title="' +
				GlideStringUtil.escapeHTML(evaluatedRiskImpact.riskCondition.description.value).replaceAll('"', '"') + '">' +
				GlideStringUtil.escapeHTML(evaluatedRiskImpact.riskCondition.name.display_value || evaluatedRiskImpact.riskCondition.name.value).replaceAll('"', '"') + "</span></strong>";

		evaluatedRiskImpact = evaluatedRiskImpact || {};
		evaluatedRiskImpact.riskEvaluation = evaluatedRiskImpact.riskEvaluation || {};

		if (evaluatedRiskImpact.riskCondition.risk && (evaluatedRiskImpact.riskCondition.risk.value || evaluatedRiskImpact.riskCondition.risk.value === 0) && !isNaN(evaluatedRiskImpact.riskCondition.risk.value)) {
			evaluatedRiskImpact.riskEvaluation.risk = evaluatedRiskImpact.riskCondition.risk;
			evaluatedRiskImpact.riskEvaluation.risk.updated = parseInt(evaluatedRiskImpact.riskCondition.risk.value) !== parseInt(this.changeRequestGr.risk) || this.changeRequestGr.risk.changes();
			evaluatedRiskImpact.riskCondition.msg += "; " + gs.getMessage("Risk: {0}{1}{2}", [this.getStartColorTag(), evaluatedRiskImpact.riskCondition.risk.display_value || evaluatedRiskImpact.riskCondition.risk.value, this.getEndColorTag()]);
		}

		if (evaluatedRiskImpact.riskML &&
			evaluatedRiskImpact.riskML.apply &&
			evaluatedRiskImpact.riskML.risk &&
			evaluatedRiskImpact.riskML.risk.value && (
				!evaluatedRiskImpact.riskEvaluation ||
				!evaluatedRiskImpact.riskEvaluation.risk ||
				!evaluatedRiskImpact.riskEvaluation.risk.value ||
					parseInt(evaluatedRiskImpact.riskML.risk.value) < parseInt(evaluatedRiskImpact.riskEvaluation.risk.value)))
			evaluatedRiskImpact.riskEvaluation.risk = evaluatedRiskImpact.riskML.risk;

		if (!evaluatedRiskImpact.riskCondition.risk || !evaluatedRiskImpact.riskCondition.risk.value) {
			// If the Risk is "Leave Alone" then populate risk with the change request risk value
			evaluatedRiskImpact.riskEvaluation.risk = {
				value: this.changeRequestGr.risk.nil() ? "" : this.changeRequestGr.risk + "",
				display_value: this.changeRequestGr.risk.getDisplayValue() + "",
				updated: false
			};
			evaluatedRiskImpact.riskCondition.msg += "; " + gs.getMessage("Risk unchanged");
		}

		// risk conditions may also set impact
		if (evaluatedRiskImpact.riskCondition.impact && evaluatedRiskImpact.riskCondition.impact.value) {
			evaluatedRiskImpact.riskEvaluation.impact = evaluatedRiskImpact.riskCondition.impact;
			evaluatedRiskImpact.riskEvaluation.impact.updated = this.changeRequestGr.impact + "" !== evaluatedRiskImpact.riskCondition.impact.value + "" || this.changeRequestGr.impact.changes();
			evaluatedRiskImpact.riskCondition.msg += "; " + gs.getMessage("Impact: {0}{1}{2}", [this.getStartColorTag(),  evaluatedRiskImpact.riskCondition.impact.display_value || evaluatedRiskImpact.riskCondition.impact.value, this.getEndColorTag()]);
		} else {
			// If the Impact is "Leave Alone" then populate impact with the change request impact value
			evaluatedRiskImpact.riskEvaluation.impact = {
				value: this.changeRequestGr.impact + "",
				display_value: this.changeRequestGr.impact.getDisplayValue() + "",
				updated: false
			};
			evaluatedRiskImpact.riskCondition.msg += "; " + gs.getMessage("Impact unchanged");
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[calculateRiskConditions] evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		return evaluatedRiskImpact;
	},

	showRiskAssessment: function() {
		// Risk Assessment plugin active
		if (GlidePluginManager.isActive(RiskCalculatorSNC.CHG_RISK_ASMT_PLUGIN))
			return new global.ChangeRiskAsmt(this.changeRequestGr).showRiskAssessment();
		else
			return false;
	},

	hasCompletedAssessment: function() {
		// Risk Assessment plugin active
		if (GlidePluginManager.isActive(RiskCalculatorSNC.CHG_RISK_ASMT_PLUGIN)) {
			var changeRiskAsmt = new global.ChangeRiskAsmt(this.changeRequestGr);
			return changeRiskAsmt.hasAssessment() && changeRiskAsmt.hasCompletedAssessment();
		}
		return false;
	},

	_shouldUpdateRecord: function(evaluatedRiskImpact) {
		return !evaluatedRiskImpact.errorMsg && (this.changeRequestGr.changes() || evaluatedRiskImpact.riskEvaluation.risk.updated || evaluatedRiskImpact.riskEvaluation.impact.updated);
	},

	updateChangeRiskImpact: function() {
		var evaluatedRiskImpact = this.setChangeRiskImpact();
		if (!evaluatedRiskImpact || !evaluatedRiskImpact.riskEvaluation)
			return;

		if (this._shouldUpdateRecord(evaluatedRiskImpact))
			this.changeRequestGr.update();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[updateChangeRiskImpact] evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		return evaluatedRiskImpact;
	},

	getRiskList: function() {
		var hasAdvancedConditionOrScript = this.hasAdvancedConditionOrScript();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[getRiskList] hasAdvancedConditionOrScript: " + hasAdvancedConditionOrScript);

		if (!hasAdvancedConditionOrScript)
			return this._evaluateRiskConditions();
		else
			return this._evaluateAdvancedRiskConditions();
	},

	hasRiskConditions: function() {
		return this._getRiskConditionsGr().hasNext();
	},

	hasAdvancedConditionOrScript: function() {
		var riskConditionGr = this._getRiskConditionsGr();
		while (riskConditionGr.next()) {
			if (riskConditionGr.use_advanced_condition || riskConditionGr.use_script_values)
				return true;
		}
		return false;
	},

	getGlideRecord: function() {
		return this.changeRequestGr;
	},

	_setRiskCondition: function(ruleSysId, riskValue, impactValue){
		this._setChangeRiskDetails("risk_condition", ruleSysId);
		this._setChangeRiskDetails("risk_condition_risk", riskValue);
		this._setChangeRiskDetails("risk_condition_impact", impactValue);
	},

	_clearRiskCondition: function() {
		this._setRiskCondition("", "", "");
	},

	_evaluateAdvancedRiskConditions: function() {
		var evaluatedRiskImpact = {
			riskCondition: {
				active: false,
				match: false
			}
		};

		var riskConditionGr = this._getRiskConditionsGr();

		this.changeRequestGr.putCurrent();

		// First risk condition to match wins
		while (riskConditionGr.next() && !evaluatedRiskImpact.riskCondition.match) {
			evaluatedRiskImpact.riskCondition.active = true;

			if (riskConditionGr.use_advanced_condition)
				evaluatedRiskImpact.riskCondition.match = GlideRhinoHelper.evaluateAsBoolean(riskConditionGr.advanced_condition);
			else
				evaluatedRiskImpact.riskCondition.match = GlideFilter.checkRecord(this.changeRequestGr, riskConditionGr.condition);

			if (evaluatedRiskImpact.riskCondition.match) {
				evaluatedRiskImpact.riskCondition.sys_id = riskConditionGr.getUniqueValue();
				evaluatedRiskImpact.riskCondition.name = {
					value: riskConditionGr.name + "",
					display_value: riskConditionGr.name.getDisplayValue() + ""
				};
				evaluatedRiskImpact.riskCondition.order = {
					value: riskConditionGr.order + 0,
					display_value: riskConditionGr.order.getDisplayValue() + ""
				};
				evaluatedRiskImpact.riskCondition.description = {
					value: riskConditionGr.description + "",
					display_value: riskConditionGr.description.getDisplayValue() + ""
				};

				if (riskConditionGr.use_script_values) {
					GlideRhinoHelper.evaluateAsString(riskConditionGr.script_values);
					evaluatedRiskImpact.riskCondition.useScriptValues = {
						value: riskConditionGr.use_script_values + "",
						display_value: riskConditionGr.use_script_values.getDisplayValue() + ""
					};
					evaluatedRiskImpact.riskCondition.risk = {
						value: this.changeRequestGr.risk.nil() ? "" : this.changeRequestGr.risk + "",
						display_value: this.changeRequestGr.risk.getDisplayValue() + ""
					};
					evaluatedRiskImpact.riskCondition.impact = {
						value: this.changeRequestGr.impact + "",
						display_value: this.changeRequestGr.impact.getDisplayValue() + ""
					};
				} else {
					evaluatedRiskImpact.riskCondition.useScriptValues = {
						value: riskConditionGr.use_script_values + "",
						display_value: riskConditionGr.use_script_values.getDisplayValue() + ""
					};
					evaluatedRiskImpact.riskCondition.risk = {
						value: riskConditionGr.risk + "",
						display_value: riskConditionGr.risk.getDisplayValue() + ""
					};
					evaluatedRiskImpact.riskCondition.impact = {
						value: riskConditionGr.impact + "",
						display_value: riskConditionGr.impact.getDisplayValue() + ""
					};
				}

				// Populate legacy values (as customers may have called and expect JSON legacy values)
				evaluatedRiskImpact.hasValue = evaluatedRiskImpact.riskCondition.match;
				evaluatedRiskImpact.name = evaluatedRiskImpact.riskCondition.name.value || "";
				evaluatedRiskImpact.order = evaluatedRiskImpact.riskCondition.order.value || 0;
				evaluatedRiskImpact.description = evaluatedRiskImpact.riskCondition.description.value || "";
				evaluatedRiskImpact.impact = evaluatedRiskImpact.riskCondition.impact.value || "";
				evaluatedRiskImpact.impactLabel = evaluatedRiskImpact.riskCondition.impact.display_value || "";
				evaluatedRiskImpact.risk = evaluatedRiskImpact.riskCondition.risk.value || "";
				evaluatedRiskImpact.label = evaluatedRiskImpact.riskCondition.risk.display_value || "";

				this._setRiskCondition(evaluatedRiskImpact.riskCondition.sys_id, evaluatedRiskImpact.riskCondition.risk.value, evaluatedRiskImpact.riskCondition.impact.value);
				this._setChangeRiskDetails("risk_condition_has_run", true, this.changeRequestGr);
			}
		}
		this.changeRequestGr.popCurrent();

		if (evaluatedRiskImpact.riskCondition.active && !evaluatedRiskImpact.riskCondition.match && !this._dryRun) {
			evaluatedRiskImpact.riskCondition.msg = gs.getMessage("No matching Risk Conditions - Risk and Impact unchanged");
			this._clearRiskCondition();
		}
		else if (!evaluatedRiskImpact.riskCondition.active) {
			evaluatedRiskImpact.riskCondition.msg = gs.getMessage("No active Risk Conditions - Risk and Impact unchanged");
			this._clearRiskCondition();
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_evaluateAdvancedRiskConditions] evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		return evaluatedRiskImpact;
	},

	_evaluateRiskConditions: function() {
		var evaluatedRiskImpact = {
			riskCondition: {
				active: false,
				match: false
			}
		};

		var riskConditionGr = this._getRiskConditionsGr();

		// First risk condition to match wins
		while (riskConditionGr.next() && !evaluatedRiskImpact.riskCondition.match) {
			evaluatedRiskImpact.riskCondition.active = true;

			evaluatedRiskImpact.riskCondition.match = GlideFilter.checkRecord(this.changeRequestGr, riskConditionGr.condition);

			if (evaluatedRiskImpact.riskCondition.match) {
				evaluatedRiskImpact.riskCondition.sys_id = riskConditionGr.getUniqueValue();
				evaluatedRiskImpact.riskCondition.name = {
					value: riskConditionGr.name + "",
					display_value: riskConditionGr.name.getDisplayValue() + ""
				};
				evaluatedRiskImpact.riskCondition.order = {
					value: riskConditionGr.order + 0,
					display_value: riskConditionGr.order.getDisplayValue() + ""
				};
				evaluatedRiskImpact.riskCondition.description = {
					value: riskConditionGr.description + "",
					display_value: riskConditionGr.description.getDisplayValue() + ""
				};
				evaluatedRiskImpact.riskCondition.risk = {
					value: riskConditionGr.risk + "",
					display_value: riskConditionGr.risk.getDisplayValue() + ""
				};
				evaluatedRiskImpact.riskCondition.impact = {
					value: riskConditionGr.impact + "",
					display_value: riskConditionGr.impact.getDisplayValue() + ""
				};

				// Populate legacy values (as customers may have called and expect JSON legacy values)
				evaluatedRiskImpact.hasValue = evaluatedRiskImpact.riskCondition.match;
				evaluatedRiskImpact.name = evaluatedRiskImpact.riskCondition.name.value || "";
				evaluatedRiskImpact.order = evaluatedRiskImpact.riskCondition.order.value || 0;
				evaluatedRiskImpact.description = evaluatedRiskImpact.riskCondition.description.value || "";
				evaluatedRiskImpact.impact = evaluatedRiskImpact.riskCondition.impact.value || "";
				evaluatedRiskImpact.impactLabel = evaluatedRiskImpact.riskCondition.impact.display_value || "";
				evaluatedRiskImpact.risk = evaluatedRiskImpact.riskCondition.risk.value || "";
				evaluatedRiskImpact.label = evaluatedRiskImpact.riskCondition.risk.display_value || "";

				this._setRiskCondition(evaluatedRiskImpact.riskCondition.sys_id, evaluatedRiskImpact.riskCondition.risk.value, evaluatedRiskImpact.riskCondition.impact.value);
			}
		}

		if (evaluatedRiskImpact.riskCondition.active && !evaluatedRiskImpact.riskCondition.match && !this._dryRun) {
			evaluatedRiskImpact.riskCondition.msg = gs.getMessage("No matching Risk Conditions - Risk and Impact unchanged");
			this._clearRiskCondition();
		}
		else if (!evaluatedRiskImpact.riskCondition.active) {
			evaluatedRiskImpact.riskCondition.msg = gs.getMessage("No active Risk Conditions - Risk and Impact unchanged");
			this._clearRiskCondition();
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_evaluateRiskConditions] evaluatedRiskImpact: " + JSON.stringify(evaluatedRiskImpact));

		return evaluatedRiskImpact;
	},

	_getRiskConditionsGr: function() {
		if (this.riskConditionGr)
			this.riskConditionGr.restoreLocation();
		else {
			this.riskConditionGr = new GlideRecord("risk_conditions");
			this.riskConditionGr.addActiveQuery();
			this.riskConditionGr.orderBy("order");
			this.riskConditionGr.query();
		}
		return this.riskConditionGr;
	},

	_setChangeRiskDetails: RiskCalculatorSNC._setChangeRiskDetails,
	updateChangeRiskDetails: RiskCalculatorSNC.updateChangeRiskDetails,

	type: "RiskCalculatorSNC"
};
```