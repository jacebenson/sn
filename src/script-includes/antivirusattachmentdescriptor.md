---
title: "AntiVirusAttachmentDescriptor"
id: "antivirusattachmentdescriptor"
---

API Name: global.AntiVirusAttachmentDescriptor

```js
var AntiVirusAttachmentDescriptor = Class.create();
AntiVirusAttachmentDescriptor.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getAttachmentState: function() {
        var sysid = this.getParameter('sysparm_sysid');
        var gr = new GlideRecord('sys_attachment');
        gr.get(sysid);
        if (!gr.isValidRecord() || !gr.canRead())
            return;
        var responseMap = sn_snap.AntiVirusOnDemandAdvisor.getAvailabilityForDownload(sysid);
        return responseMap["availability"];
    },
    isPublic: function() {
        return true;
    },
    type: 'AntiVirusAttachmentDescriptor'
});
```