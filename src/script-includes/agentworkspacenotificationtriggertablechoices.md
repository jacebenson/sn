---
title: "AgentWorkspaceNotificationTriggerTableChoices"
id: "agentworkspacenotificationtriggertablechoices"
---

API Name: global.AgentWorkspaceNotificationTriggerTableChoices

```js
var AgentWorkspaceNotificationTriggerTableChoices = Class.create();
AgentWorkspaceNotificationTriggerTableChoices.prototype = {
    initialize: function(view) {
		this.view = view;
    },
	
	handles: function(){
		return this.view == 'agent_workspace';
	},

    process: function() {
		var noSystemTables = new NoSystemTableChoiceList();
		return noSystemTables.process();
    },

    type: 'AgentWorkspaceNotificationTriggerTableChoices'
};
```