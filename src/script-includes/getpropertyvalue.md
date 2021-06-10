---
title: "GetPropertyValue"
id: "getpropertyvalue"
---

API Name: global.GetPropertyValue

```js
var GetPropertyValue = Class.create();
GetPropertyValue.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getPropertyValue : function(propertyName, deviceType, attributeName, userName) {
		var properties_gr = new GlideRecord("sys_properties");
		propertyName = "com.glide.cs.general"+ "." + propertyName;
		properties_gr.get("name",propertyName);
		var deviceTypes = ["slack","facebook","teams","messenger"];
		if(deviceTypes.indexOf(deviceType) > -1) {
			if (deviceType == "facebook")
				deviceType = "workplace";
			var gr = new GlideRecord("sys_cs_adapter_configuration");
			gr.addQuery("sys_cs_adapter_configuration_page.client_type", deviceType);
			if(attributeName == "topic_picker_msg") {
				gr.query();
				gr.get("attribute_name", "help_keyword");
				var help_keyword = gr.getValue("attribute_value");
				help_keyword = help_keyword.split(",")[0];
				gr.get("attribute_name",attributeName);
				var attributeValue = gr.getValue("attribute_value");
				var result = attributeValue.replace("%s",userName).replace("%s", help_keyword);
				return result;
			}
			else {
				gr.addQuery("attribute_name", attributeName);
				gr.query();
				while(gr.next()){
					return gr.getValue("attribute_value");
				}
			}
		}	
		return properties_gr.getValue("value");
	},
    type: 'GetPropertyValue'
});
```