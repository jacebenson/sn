---
title: "FxCurrencyConfigDependentFieldUtils"
id: "fxcurrencyconfigdependentfieldutils"
---

API Name: global.FxCurrencyConfigDependentFieldUtils

```js
var FxCurrencyConfigDependentFieldUtils = Class.create();
FxCurrencyConfigDependentFieldUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    isDependent: function() {
        var tableName = this.getParameter('sysparm_table_name');
        var fieldName = this.getParameter('sysparm_field_name');
        return this._isDependentField(tableName, fieldName);
    },

    _isDependentField: function(tableName, fieldName) {
        if (JSUtil.nil(tableName) || JSUtil.nil(fieldName))
            return false;
        var descriptor = GlideTableDescriptor.get(tableName).getElementDescriptor(fieldName);
        return (JSUtil.notNil(descriptor.dependent));
    },

    isConfigForDependedField: function() {
        var sysId = this.getParameter('sysparm_sys_id');
		if (JSUtil.nil(sysId))
			return false;

        var gr = new GlideRecord("fx_configuration");
        if (gr.get(sysId))
            return this._isDependentField(gr.getValue("target_table"), gr.getValue("target_field"));

        return false;
    },

    type: 'FxCurrencyConfigDependentFieldUtils'
});
```