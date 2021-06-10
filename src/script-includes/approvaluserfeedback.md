---
title: "ApprovalUserFeedback"
id: "approvaluserfeedback"
---

API Name: global.ApprovalUserFeedback

```js
var ApprovalUserFeedback = Class.create();
ApprovalUserFeedback.prototype = {
	initialize: function() {
	},
	
	property_name: "glide.approvals.ui_feedback",

	approved: function(current) {
		if (gs.getProperty(this.property_name, "true") == "true")
			if (current.getValue("document_id") != "")
				gs.addInfoMessage(gs.getMessage("Approved {0}", current.getDisplayValue("document_id")));
			else
				gs.addInfoMessage(gs.getMessage("Approved {0}", current.getDisplayValue("sysapproval")));
	},

	rejected: function(current) {
		if (gs.getProperty(this.property_name, "true") == "true")
			if (current.getValue("document_id") != "")
				gs.addInfoMessage(gs.getMessage("Rejected approval for {0}", current.getDisplayValue("document_id")));
			else
				gs.addInfoMessage(gs.getMessage("Rejected approval for {0}", current.getDisplayValue("sysapproval")));		
	},

	requested: function(current) {
		if (gs.getProperty(this.property_name, "true") == "true")
			if (current.getValue("document_id") != "")
				gs.addInfoMessage(gs.getMessage("Requested approval for {0}", current.getDisplayValue("document_id")));
			else
				gs.addInfoMessage(gs.getMessage("Requested approval for {0}", current.getDisplayValue("sysapproval")));
			},
							
	type: 'ApprovalUserFeedback'
};
```