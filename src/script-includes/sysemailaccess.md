---
title: "SysEmailAccess"
id: "sysemailaccess"
---

API Name: global.SysEmailAccess

```js
var SysEmailAccess = {
	isMyEmailClientDraft: function(emailGr) {
		return emailGr.type == 'send-ignored' && emailGr.user_id == gs.getUserID() &&
				/X-ServiceNow-Source:\s*EmailClient/.test(emailGr.getValue('headers'));
	}
};
```