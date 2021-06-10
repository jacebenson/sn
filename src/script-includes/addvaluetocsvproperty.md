---
title: "AddValueToCsvProperty"
id: "addvaluetocsvproperty"
---

API Name: global.AddValueToCsvProperty

```js
var AddValueToCsvProperty = Class.create();
AddValueToCsvProperty.prototype = {
    initialize: function() {
    },
	
	add: function(propertyName, newValue) {
		var property = gs.getProperty(propertyName);
		if (gs.nil(property)) {
			gs.setProperty(propertyName, newValue);
			return;
		}
		
		var list = property.split(',');
		if (list.indexOf(newValue) >= 0) {
			return;
		}
		
		list.push(newValue);
		gs.setProperty(propertyName, list.join(','));
	},

    type: 'AddValueToCsvProperty'
};
```