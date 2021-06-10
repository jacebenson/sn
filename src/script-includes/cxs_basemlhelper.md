---
title: "cxs_BaseMLHelper"
id: "cxs_basemlhelper"
---

API Name: global.cxs_BaseMLHelper

```js
var cxs_BaseMLHelper = Class.create();
cxs_BaseMLHelper.prototype = Object.extendsObject(cxs_AbstractScriptResultProcessor, {
    RESULT_TITLE: 'title',
    RESULT_SNIPPET: 'snippet',
    ID: 'id',
    RESULT_LINK: 'link',
    META_SCORE: 'score',
    ADDITIONAL_FIELDS: 'additional_fields',
    META_ADDITIONAL_FIELDS: 'additionalFields',
    META_THRESHOLD: 'threshold',
    FIELD_NUMBER: 'number',
    FIELD_DESCRIPTION: 'description',
    REQUEST_UITYPE: 'ui_type',
    CONFIDENCE: 'confidence',
    TABLE_CXS_ADD_RESOURCE_FIELDS: 'cxs_search_result_fields',
    REQUEST_TABLE: 'table',
    PREDICTION_VALUE: 'predictedValue',
    PREDICTION_VALUE_SYS_ID: 'predictedValueSysId',
	DEFAULT_THRESHOLD: 1,
	TABLE_CXS_TABLE_FIELD_CONFIG: 'cxs_table_field_config',
	TABLE_CXS_TABLE_CONFIG: 'cxs_table_config',
	TABLE_ML_SOLUTION_DEFINITION: 'ml_solution_definition',

	getSolutionName: function(defn) {
		var gr = new GlideRecord(this.TABLE_ML_SOLUTION_DEFINITION);
		if (gr.get(defn)) {
			return gr.getValue('solution_name');
		}
		return null;
	},
	
	getTableConfig: function () {
		var gr = new GlideRecord(this.TABLE_CXS_TABLE_CONFIG);
		gr.addQuery("ui_type", this.request.uiType);
		gr.addQuery("table", this.request.formTable);
		gr.query();
		if (gr.next()) {
			return gr;
		}
		return null;
	},
	
	getDefaultField: function (tableConfig) {
		var gr = new GlideRecord(this.TABLE_CXS_TABLE_FIELD_CONFIG);
		gr.addQuery('cxs_table_config', tableConfig);
		gr.addQuery('default_config', true);
		gr.query();
		if (gr.next()) {
			return gr;
		}
		return null;
	},
	
    type: 'cxs_BaseMLHelper'
});
```