---
title: "EmailAccountSecurity"
id: "emailaccountsecurity"
---

API Name: global.EmailAccountSecurity

```js
var EmailAccountSecurity = Class.create();
EmailAccountSecurity.prototype = {
	migrate: function(/* GlideRecord */ gr) {
		if (!(gr instanceof GlideRecord)) {
			gs.error(this.type + ': expected a GlideRecord');
			return;
		}
		
		if (gr.getTableName() != 'sys_email_account') {
			gs.error(this.type + ': incorrect GlideRecord, expected sys_email_account, given ' + gr.getTableName());
			return;
		}
		
		if (!gr.isValid()) {
			gs.error(this.type + ': invalid GlideRecord given');
			return;
		}
		
		if (gr.getValue('enable_ssl') == 1) {
			gr.setValue('connection_security', 'ssl');
		} else if (gr.getValue('enable_tls') == 1) {
			gr.setValue('connection_security', 'starttls');
		} else {
			gr.setValue('connection_security', 'none');
		}
    },

    type: 'EmailAccountSecurity'
};
```