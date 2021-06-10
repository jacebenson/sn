---
title: "NotificationTriggerTableChoices"
id: "notificationtriggertablechoices"
---

API Name: global.NotificationTriggerTableChoices

```js
var NotificationTriggerTableChoices = Class.create();
NotificationTriggerTableChoices.prototype = {
    initialize: function(view) {
		this.view = view;
    },
	
	process: function(){
		try {
			var eps = new GlideScriptedExtensionPoint().getExtensions('NotificationTriggerTableChoices');

			for(var i = 0; i < eps.length; i++){
				eps[i].initialize(this.view);
				if(eps[i].handles()){
					return eps[i].process();
				}
			}
		}
		catch(e){
			gs.error("Error running NotificationTriggerTableChoices extension point", e);
		}
		
		var tl = new GlideTableChoiceList();
		tl.setSelectedOnly(false);
		tl.setSelectedField(null);
		tl.setSelected(null);
		tl.setForceSelected(false);
		tl.setCurrentTableName(null);

		return tl;
	},

    type: 'NotificationTriggerTableChoices'
};
```