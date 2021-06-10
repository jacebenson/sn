---
title: "ChangeRiskDetailsHelperSNC"
id: "changeriskdetailshelpersnc"
---

API Name: global.ChangeRiskDetailsHelperSNC

```js
var ChangeRiskDetailsHelperSNC = Class.create();
ChangeRiskDetailsHelperSNC.prototype = {

	ML_RISK_PLUGIN: "com.snc.change_management.ml.risk",

	initialize: function() {
		this._log = new GSLog(RiskCalculatorSNC.LOG_PROPERTY, this.type).setLog4J();
	},

	canRead: function(changeSysId) {
		var gr = new GlideRecordSecure("change_request");
		if (!gr.get(changeSysId))
			return false;

		return this._canRead(gr);
	},

	showDetailsButton: function(changeSysId) {
		if (!changeSysId)
			return false;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[showDetailsButton] changeSysId: " + changeSysId);

		var changeRiskDetailsGr = this._getChangeRiskDetails(changeSysId);

		// If it has a record, then a Risk Calculation was run
		if (!changeRiskDetailsGr.next())
			return false;
		return true;
	},

	applyRiskValue: function() {
		if (!GlidePluginManager.isActive("com.snc.change_management.ml.risk"))
			return false;

		return new sn_chg_ml_risk.ChangeMLRiskCalculator().applyRiskValue();
	},

	isSolutionEnabled: function() {
		if (!GlidePluginManager.isActive("com.snc.change_management.ml.risk"))
			return false;

		return new sn_chg_ml_risk.ChangeMLRiskCalculator().isSolutionEnabled();
	},

	getChangeRiskDetails: function(changeSysId) {
		var changeRiskDetailsGr = this._getChangeRiskDetails(changeSysId);
		if (!changeRiskDetailsGr.next())
			return {};

		var changeRiskDetails = this.toJS(changeRiskDetailsGr);

		// Avoid adding ACLs to risk_conditions table, so bypass to get risk condition name and sys_id
		if (!changeRiskDetails.risk_condition) {
			var riskConditionGr = changeRiskDetailsGr.risk_condition.getRefRecord();
			changeRiskDetails.risk_condition = {
				display_value: riskConditionGr.getDisplayValue(),
				value: riskConditionGr.getUniqueValue()
			};
		}

		if (changeRiskDetails.change_request) {
			var changeRequestGr = changeRiskDetailsGr.change_request.getRefRecord();
			changeRiskDetails.change_request.risk = {
				value: changeRequestGr.getValue("risk"),
				display_value: changeRequestGr.getDisplayValue("risk")
			};
		}

		changeRiskDetails.mlOptions = {
			isReadOnly: !this.applyRiskValue(),
			isEnabled: this.isSolutionEnabled() + "" === "true"
		};

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[getChangeRiskDetails] changeRiskDetails: " + JSON.stringify(changeRiskDetails));

		return changeRiskDetails;
	},

	isServicePortal: function() {
		var nt = gs.action.getGlideURI() + "";
		var isServicePortalURL = nt.indexOf("api/now/sp") !== -1;
		return isServicePortalURL;
	},

	getViewDetailsEnabled: function() {
		return gs.getProperty("change.risk.enable_view_details", "enable");
	},

	getShowRiskCondition: function() {
		return gs.getProperty("change.risk.show_risk_condition", "never");
	},

	getShowRiskAssessment: function() {
		return gs.getProperty("change.risk.show_risk_assessment", "never");
	},

	getShowLegacyRiskAssessment: function() {
		return gs.getProperty("change.risk.show_legacy_risk_assessment", "never");
	},

	getShowRiskIntelligence: function() {
		return gs.getProperty("change.risk.show_risk_intelligence", "never");
	},

	_canRead: function(chgGr) {
		return chgGr.risk.canRead();
	},

	_getChangeRiskDetails: function(changeSysId) {
		if (!changeSysId)
			return;

		var changeRequestGr = new GlideRecordSecure("change_request");
		if (!changeRequestGr.get(changeSysId) || !this._canRead(changeRequestGr))
			return;

		var changeRiskDetailsGr = new GlideRecord("change_risk_details");
		changeRiskDetailsGr.addQuery("change_request", changeRequestGr.getUniqueValue());
		changeRiskDetailsGr.query();

		return changeRiskDetailsGr;
	},

	toJS: function(gr) {
		return ChangeCommon.toJS(gr);
	},

	type: ChangeRiskDetailsHelperSNC
};
```