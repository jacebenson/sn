---
title: "PopulateAdapterConfig"
id: "populateadapterconfig"
---

API Name: global.PopulateAdapterConfig

```js
var PopulateAdapterConfig = Class.create();
PopulateAdapterConfig.prototype = {
    initialize: function() {
    },
	insertOrUpdateConfig: function(/*GlideRecord*/ current, client_type) {
		var vendorConfig = new GlideRecord("sys_cs_vendor_client_adapter_configuration");
		vendorConfig.addQuery("external_id", current.external_id);
		vendorConfig.query();
		if (vendorConfig.next()) {
			vendorConfig.setValue("client_type", client_type);
			vendorConfig.setValue("provider_auth", current.provider_auth);
			vendorConfig.setValue("vendor", "c2f0b8f187033200246ddd4c97cb0bb9");
			vendorConfig.setValue("sys_domain", current.sys_domain);
			vendorConfig.setValue("config", this._getJsonConfig(current, client_type));
			vendorConfig.update();
			current.setWorkflow(false);
			current.update();
			return;
		}
		vendorConfig.setValue("vendor", "c2f0b8f187033200246ddd4c97cb0bb9");
		vendorConfig.setValue("external_id", current.external_id);
		vendorConfig.setValue("client_type", client_type);
		vendorConfig.setValue("provider_auth", current.provider_auth);
		vendorConfig.setValue("sys_domain", current.sys_domain);
		vendorConfig.setValue("config", this._getJsonConfig(current, client_type));
		vendorConfig.insert();
		current.setWorkflow(false);
		current.update();
	},
	
	_getJsonConfig: function(current, client_type) {
		var configStr = new sn_cs_adapter.AdapterConfigGenerator().getDefaultConfigWithDescCategory(client_type);
		var config = JSON.parse(configStr);
		var newConfig = {};

		var attribute = new GlideRecord("sys_cs_adapter_configuration");
		attribute.addQuery("sys_cs_adapter_configuration_page", current.sys_id);
		attribute.query();
		if (attribute.hasNext()) {
			// update config from attributes and fields
			while (attribute.next()) {
			if(config[attribute.attribute_name.toString()])
				config[attribute.attribute_name.toString()].value = attribute.attribute_value.toString();
			}
			var fields = current.getFields();
			for (var i = 0; i < fields.size(); i++) {
				var fieldName = fields.get(i).getName().toString();
				if (config.hasOwnProperty(fieldName)) {
					this._updateConfingFromFields(current, config, fieldName);
				}
			}
		} else {
			// update config from fields and insert attributes
			var newAttributes = new GlideRecord("sys_cs_adapter_configuration");
			for (var name in config) {
				if (current.isValidField(name)) {
					this._updateConfingFromFields(current, config, name);
				} else {
					newAttributes.initialize();
					newAttributes.setValue('sys_cs_adapter_configuration_page', current.sys_id);
					newAttributes.setValue('attribute_name', name);
					newAttributes.setValue('attribute_value', config[name].value);
					newAttributes.setValue('default_attribute_value', config[name].value);
					newAttributes.setValue('description',config[name].description);
					newAttributes.setValue('message_type',config[name].type);
					newAttributes.insert();
				}
			}
		}
		
		for (var name in config) {
			newConfig[name] = config[name].value;
		}
		
		return JSON.stringify(newConfig);
	},
	
	_updateConfingFromFields: function(current, config, fieldName) {
		if (current.getValue(fieldName)) {
			config[fieldName] = current.getValue(fieldName).toString();
		} else {
			/*update fields if empty*/
			var v = config[fieldName];
			if (v instanceof Array) {
				current.setValue(fieldName, v.join());
			} else {
				current.setValue(fieldName, v);
		    }
		 }
	},

    type: 'PopulateAdapterConfig'
};
```