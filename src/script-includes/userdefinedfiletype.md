---
title: "UserDefinedFileType"
id: "userdefinedfiletype"
---

API Name: sn_devstudio.UserDefinedFileType

```js
var UserDefinedFileType = {
    createFileTypeFromGlideRecord: function(gr) {
        return {
            name: gr.getDisplayValue('name'),
            id: gr.getValue('name'),
            parent: gr.getValue('parent'),
            order: gr.getValue('order'),
            action: gr.getValue('action'),
            type: gr.getValue('type'),
            sysId: gr.getValue('sys_id'),
            additionalAction: gr.getValue('has_module_action') == "1",
            clientScript: gr.getValue('script_client')
        };
    },
    createCustomFileType: function(title, subTitle, url) {
		var type = 'basic_url';
        return {
            title: title,
            subTitle: subTitle,
            name: title,
            label: subTitle,
            url: url,
            parentType: {
                name: title,
                id: type,
                recordType: type,
                navigationKey: type
            }
        };
    }
};
```