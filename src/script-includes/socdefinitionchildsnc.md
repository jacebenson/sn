---
title: "SoCDefinitionChildSNC"
id: "socdefinitionchildsnc"
---

API Name: sn_chg_soc.SoCDefinitionChildSNC

```js
var SoCDefinitionChildSNC = Class.create();
SoCDefinitionChildSNC.prototype = Object.extendsObject(SoC, {
    initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
    },

	getAllRecords: function(changeReqs) {
		if (!changeReqs || !changeReqs.length)
			return null;
		var assocGr = new GlideRecordSecure(this._gr.table_name);
		assocGr.addNotNullQuery(this._gr.start_date_field);
		assocGr.addNotNullQuery(this._gr.end_date_field);
		assocGr.addEncodedQuery(this._gr.condition);
		assocGr.addQuery(this._gr.reference_field, changeReqs);
		assocGr.query();
		return assocGr;
	},

	getRecords: function(changeSysId) {
		if (!changeSysId)
			return null;
		var assocGr = new GlideRecordSecure(this._gr.table_name);
		assocGr.addNotNullQuery(this._gr.start_date_field);
		assocGr.addNotNullQuery(this._gr.end_date_field);
		assocGr.addEncodedQuery(this._gr.condition);
		assocGr.addQuery(this._gr.reference_field, changeSysId);
		assocGr.query();
		return assocGr;
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

	getStyleRules: function() {
		return new SoCDefinitionChildStyleRule(SoCDefinitionChildStyleRule.findByDefId(this._gr.getUniqueValue()), this._gs);
	},

    type: 'SoCDefinitionChildSNC'
});

SoCDefinitionChildSNC.findByDefId = function(defSysId) {
	if (!defSysId)
		return null;
	var defChildGr = new GlideRecordSecure(SoC.DEFINITION_CHILD);
	defChildGr.addActiveQuery();
	defChildGr.addQuery(SoC.DEFINITION, defSysId);
	defChildGr.orderBy(SoC.ORDER);
	defChildGr.query();
	return defChildGr;
};
```