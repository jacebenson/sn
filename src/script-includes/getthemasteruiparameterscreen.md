---
title: "GetTheMasterUIParameterScreen"
id: "getthemasteruiparameterscreen"
---

API Name: global.GetTheMasterUIParameterScreen

```js
var GetTheMasterUIParameterScreen = Class.create();
GetTheMasterUIParameterScreen.prototype = {
    initialize: function() {
    },
	
	getScreenId: function() {
		//Button Instance belongs to Master (Master-Detail or Map)
		if (current.button_instance.parent.parent_table == 'sys_sg_folder') 
			return current.button_instance.parent; 
		
		//Button Instance belongs to Master-Item
		else if (current.button_instance.parent_table == 'sys_sg_master_item') 
			return current.button_instance.parent.screen; 
		
		//Button Instance belongs to Details which belongs to Master-Item
		else if (current.button_instance.parent.parent_table == 'sys_sg_master_item') 
			return  current.button_instance.parent.parent.screen;
		
		//Button Instance belongs to Details which belongs to Map
		else  if (current.button_instance.parent.parent_table == 'sys_sg_map_screen')
			return current.button_instance.parent.parent;	
		
		else return "";
	},
	
    type: 'GetTheMasterUIParameterScreen'
};

```