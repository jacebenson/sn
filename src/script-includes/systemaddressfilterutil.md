---
title: "SystemAddressFilterUtil"
id: "systemaddressfilterutil"
---

API Name: global.SystemAddressFilterUtil

```js
var SystemAddressFilterUtil = Class.create();
SystemAddressFilterUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    isAssignedToEmailAccount: function() {
        var gr = new GlideRecordSecure('sys_email_account');
        gr.addQuery('system_address_filter', this.getParameter('sysparm_filter_id'));
        gr.query();

        return gr.hasNext();
    },

    type: 'SystemAddressFilterUtil'
});
```