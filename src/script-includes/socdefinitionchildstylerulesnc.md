---
title: "SoCDefinitionChildStyleRuleSNC"
id: "socdefinitionchildstylerulesnc"
---

API Name: sn_chg_soc.SoCDefinitionChildStyleRuleSNC

```js
var SoCDefinitionChildStyleRuleSNC = Class.create();
SoCDefinitionChildStyleRuleSNC.prototype = Object.extendsObject(SoC, {
    initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
    },

	// Delegate security to the parent definition
	canDelete: function() {
		if (this._gr.chg_soc_definition_child.nil())
			return false;

		return new SoCDefinitionChild(this._gr.chg_soc_definition_child.getRefRecord(), this._gs).canDelete();
	},

	canRead: function() {
		if (this._gr.isNewRecord())
			return true;

		if (this._gr.chg_soc_definition_child.nil())
			return false;

		return new SoCDefinitionChild(this._gr.chg_soc_definition_child.getRefRecord(), this._gs).canRead();
	},

	canWrite: function() {
		if (this._gr.isNewRecord())
			return true;

		if (this._gr.chg_soc_definition_child.nil())
			return false;

		return new SoCDefinitionChild(this._gr.chg_soc_definition_child.getRefRecord(), this._gs).canWrite();
	},

    type: 'SoCDefinitionChildStyleRuleSNC'
});

SoCDefinitionChildStyleRuleSNC.findByDefId = function(defSysId) {
	if (!defSysId)
		return null;

	var styleRuleGr = new GlideRecord(SoC.DEFINITION_CHILD_STYLE_RULE);
	styleRuleGr.addActiveQuery();
	styleRuleGr.addQuery(SoC.DEFINITION_CHILD, defSysId);
	styleRuleGr.addQuery(SoC.CONDITION, "ISNOTEMPTY", "");
	styleRuleGr.orderBy(SoC.ORDER);
	styleRuleGr.query();
	return styleRuleGr;
};

SoCDefinitionChildStyleRuleSNC.createDefaultRule = function(socChildDefGr) {
	if (!socChildDefGr)
		return;

	var gr = new GlideRecord(socChildDefGr.getValue(SoC.TABLE_NAME));
	if (!gr.isValid())
		return;

	var styleRuleGr = new GlideRecord(SoC.DEFINITION_CHILD_STYLE_RULE);
	styleRuleGr.setValue(SoC.DEFINITION_CHILD, socChildDefGr.getUniqueValue());
	styleRuleGr.setValue(SoC.NAME, "Active " + gr.getED().getPlural());
	styleRuleGr.setValue(SoC.EVENT_COLOR, SoC.DEFAULT_EVENT_COLOR);
	styleRuleGr.setValue(SoC.CONDITION, "active=true^EQ");
	styleRuleGr.setValue(SoC.ORDER, SoC.DEFAULT_ORDER);
	return styleRuleGr.insert();
};
```