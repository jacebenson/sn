---
title: "MobileCatalogUIPolicyBuilder"
id: "mobilecataloguipolicybuilder"
---

API Name: global.MobileCatalogUIPolicyBuilder

```js
var MobileCatalogUIPolicyBuilder = Class.create();
MobileCatalogUIPolicyBuilder.prototype = {
	APPLIES_TO_FIELD_TABLE_MAP : {
		"sc_cat_item":"applies_catalog",
		"sc_cart_item": "applies_catalog",
		"sc_cat_item_guide":"applies_catalog",
		"sc_req_item":"applies_req_item",
		"sc_task":"applies_sc_task",
		"task": "applies_target_record"
	},

	initialize: function() {
	},
	
	getUIPolicy: function(item, sets, table) {
		var builder = new CatalogUIPolicyBuilder();
		builder.setUIScriptType(1); // set compatibility to smartphone
		
		var appliesToField = this._getAppliesToField(table);
		if ((gs.getProperty("glide.sc.ui_policy.variable_set_run_first") == "true")) {
			this._buildPoliciesForVariableSets(builder, sets, appliesToField);
			this._buildPoliciesForCatalogItem(builder, item, appliesToField);
		} else {
			this._buildPoliciesForCatalogItem(builder, item, appliesToField);
			this._buildPoliciesForVariableSets(builder, sets, appliesToField);
		}
		
		builder.updateValues();
		
		var mobileUIPolicyBuilder = new MobileUIPolicyBuilder();
		return mobileUIPolicyBuilder.mergeScriptsWithPolicies(builder.getFieldPolicies(), builder.getScripts());
	},

	getUIPolicyForVariableSets : function (sets, table) {
		var builder = new CatalogUIPolicyBuilder();
		builder.setUIScriptType(1); // set compatibility to smartphone

		this._buildPoliciesForVariableSets(builder, sets, this._getAppliesToField(table));

		builder.updateValues();

		var mobileUIPolicyBuilder = new MobileUIPolicyBuilder();
		return mobileUIPolicyBuilder.mergeScriptsWithPolicies(builder.getFieldPolicies(), builder.getScripts());
	},

	_buildPoliciesForCatalogItem : function (builder, item, appliesToField) {
		var gr = new GlideRecord('catalog_ui_policy');
		gr.addQuery('applies_to', 'item');
		gr.addQuery('catalog_item', item);
		if (appliesToField != "")
			gr.addQuery(appliesToField, true);
		gr.addActiveQuery();
		gr.orderBy('order');
		gr.query();
		builder.process(gr);
	},

	_buildPoliciesForVariableSets : function(builder, sets, appliesToField) {
		if (!sets)
			return;

		sets = sets.split(',');
		for (var i = 0; i != sets.length; i++) {
			var gr = new GlideRecord('catalog_ui_policy');
			gr.addQuery('applies_to', 'set');
			gr.addQuery('variable_set', sets[i]);
			if (appliesToField != "")
				gr.addQuery(appliesToField, true);
			gr.addActiveQuery();
			gr.orderBy('order');
			gr.query();
			builder.process(gr);
		}
	},

	_getAppliesToField : function(tableName) {
		if (typeof this.APPLIES_TO_FIELD_TABLE_MAP[tableName] == 'undefined') {
			var baseTable = GlideDBObjectManager.getAbsoluteBase(tableName);
			if (typeof this.APPLIES_TO_FIELD_TABLE_MAP[baseTable] == 'undefined')
				return "";
			return this.APPLIES_TO_FIELD_TABLE_MAP[baseTable];
		}
		return this.APPLIES_TO_FIELD_TABLE_MAP[tableName];
	},
	
	type: 'MobileCatalogUIPolicyBuilder'
}
```