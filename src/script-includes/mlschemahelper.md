---
title: "MLSchemaHelper"
id: "mlschemahelper"
---

API Name: global.MLSchemaHelper

```js
var MLSchemaHelper = Class.create();
MLSchemaHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getMLSchema: function(){
		if(!gs.hasRole('ml_admin'))
			return {};
		var schema = {
			'schema_table':'ml_solution_definition',
			'schema_field':'solution_definition'
		};
		if (gs.getProperty('glide.platform_ml.use_new_schema',false) == 'true'){
			schema.schema_field = "ml_capability_definition";
			schema.schema_table = "ml_capability_definition_base";
		}
		return schema;
	},
    type: 'MLSchemaHelper'
});
```