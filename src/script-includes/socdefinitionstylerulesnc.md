---
title: "SoCDefinitionStyleRuleSNC"
id: "socdefinitionstylerulesnc"
---

API Name: sn_chg_soc.SoCDefinitionStyleRuleSNC

```js
var SoCDefinitionStyleRuleSNC = Class.create();
SoCDefinitionStyleRuleSNC.prototype = Object.extendsObject(SoC, {
    initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
    },

	// Delegate security to the parent definition
	canDelete: function() {
		if (this._gr.chg_soc_definition.nil())
			return false;

		return new SoCDefinition(this._gr.chg_soc_definition.getRefRecord(), this._gs).canDelete();
	},

	canRead: function() {
		if (this._gr.isNewRecord())
			return true;

		if (this._gr.chg_soc_definition.nil())
			return false;

		return new SoCDefinition(this._gr.chg_soc_definition.getRefRecord(), this._gs).canRead();
	},

	canWrite: function() {
		if (this._gr.isNewRecord())
			return true;

		if (this._gr.chg_soc_definition.nil())
			return false;

		return new SoCDefinition(this._gr.chg_soc_definition.getRefRecord(), this._gs).canWrite();
	},

    type: 'SoCDefinitionStyleRuleSNC'
});

SoCDefinitionStyleRuleSNC.findByDefId = function(socDefId) {
	if (!socDefId)
		return null;

	var styleRuleGr = new GlideRecordSecure(SoC.DEFINITION_STYLE_RULE);
	styleRuleGr.addActiveQuery();
	styleRuleGr.addQuery(SoC.DEFINITION, socDefId);
	styleRuleGr.addQuery(SoC.CONDITION, "ISNOTEMPTY", "");
	styleRuleGr.query();
	return styleRuleGr;
};
```