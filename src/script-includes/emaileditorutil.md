---
title: "EmailEditorUtil"
id: "emaileditorutil"
---

API Name: global.EmailEditorUtil

```js
var EmailEditorUtil = Class.create();
EmailEditorUtil.prototype = {
    initialize: function() {
    },
	showInWorkspaceFormMenu: function(currentRecord) {
		
		var answer = false;
		if (currentRecord.isNewRecord() == false || gs.getProperty('glide.ui.email_client.pop_on_new_records') == 'true')
			answer = true;		
		if ( (gs.getProperty("glide.email_client.check_write_access", "true") == "true") && !currentRecord.canWrite())
			return false;
		if (!currentRecord.getED().getBooleanAttribute("email_client"))
			return false;
		if (GlideUtil.isExpressInstance() && !gs.getUser().hasRoles())
			return false;
		if (!GlideUtil.isExpressInstance() && !GlideSecurityManager.get().hasRightsTo("processor/EmailClientProcessor/execute", null))
			return false;
		
		return answer;
	},
    type: 'EmailEditorUtil'
};
```